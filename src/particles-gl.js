/**
 * WebGL particle renderer — anvaka/fieldplay approach.
 *
 * Uses ping-pong framebuffer textures for trail persistence:
 *   Frame N:
 *     1. Bind framebuffer B
 *     2. Draw framebuffer A with reduced opacity (trail fade)
 *     3. Draw particle positions as GL_POINTS on top
 *     4. Swap A ↔ B
 *     5. Draw result to screen
 */

const FADE_VERT = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const FADE_FRAG = `
  precision mediump float;
  uniform sampler2D u_texture;
  uniform float u_fade;
  varying vec2 v_uv;
  void main() {
    vec4 color = texture2D(u_texture, v_uv);
    gl_FragColor = vec4(color.rgb, color.a * u_fade);
  }
`;

const PARTICLE_VERT = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    gl_PointSize = 3.0;
  }
`;

const PARTICLE_FRAG = `
  precision mediump float;
  uniform vec4 u_color;
  void main() {
    // Soft circle
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, dist);
    gl_FragColor = vec4(u_color.rgb, u_color.a * alpha);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vertSrc, fragSrc) {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

function createFramebuffer(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { texture: tex, framebuffer: fb };
}

export class ParticleGL {
  /**
   * @param {HTMLCanvasElement} canvas — WebGL overlay canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });

    const gl = this.gl;
    if (!gl) {
      console.error('WebGL not available');
      return;
    }

    // Programs
    this.fadeProgram = createProgram(gl, FADE_VERT, FADE_FRAG);
    this.particleProgram = createProgram(gl, PARTICLE_VERT, PARTICLE_FRAG);

    // Full-screen quad for fade pass
    this.quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1,
    ]), gl.STATIC_DRAW);

    // Particle position buffer
    this.particleBuffer = gl.createBuffer();
    this.particleCount = 0;

    // Framebuffers (created on resize)
    this.fbA = null;
    this.fbB = null;
    this.width = 0;
    this.height = 0;

    // Particle state
    this.particles = [];
    this.fadeAmount = 0.97; // higher = longer trails

    // Rendering params
    this.margin = { top: 20, right: 20, bottom: 40, left: 50 };

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  /**
   * Resize the GL canvas and framebuffers.
   */
  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(width * dpr);
    const h = Math.floor(height * dpr);

    if (w === this.width && h === this.height) return;

    this.canvas.width = w;
    this.canvas.height = h;
    this.width = w;
    this.height = h;
    this.displayWidth = width;
    this.displayHeight = height;

    const gl = this.gl;
    gl.viewport(0, 0, w, h);

    // Recreate framebuffers
    if (this.fbA) {
      gl.deleteTexture(this.fbA.texture);
      gl.deleteFramebuffer(this.fbA.framebuffer);
    }
    if (this.fbB) {
      gl.deleteTexture(this.fbB.texture);
      gl.deleteFramebuffer(this.fbB.framebuffer);
    }

    this.fbA = createFramebuffer(gl, w, h);
    this.fbB = createFramebuffer(gl, w, h);

    // Clear both
    for (const fb of [this.fbA, this.fbB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Set world-to-GL coordinate mapping.
   */
  setViewport(xMin, xMax, tMin, tMax) {
    this.xMin = xMin;
    this.xMax = xMax;
    this.tMin = tMin;
    this.tMax = tMax;
  }

  /**
   * Initialize particles along characteristics.
   */
  initParticles(characteristics, countPerCurve = 5) {
    this.particles = [];
    for (let ci = 0; ci < characteristics.length; ci++) {
      const pts = characteristics[ci].points;
      if (pts.length < 2) continue;

      for (let p = 0; p < countPerCurve; p++) {
        this.particles.push({
          charIndex: ci,
          param: Math.random(),
        });
      }
    }
    this.particleCount = this.particles.length;

    // Clear trails when reinitializing
    const gl = this.gl;
    for (const fb of [this.fbA, this.fbB]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Advance particles and render one frame.
   */
  frame(dt, characteristics) {
    if (!this.gl || !this.particleCount) return;

    this._stepParticles(dt, characteristics);
    this._updatePositionBuffer(characteristics);
    this._render();
  }

  _stepParticles(dt, characteristics) {
    for (const p of this.particles) {
      const pts = characteristics[p.charIndex]?.points;
      if (!pts || pts.length < 2) continue;

      // Advance — speed gives roughly 3-5 second traversal
      p.param += dt * 0.3;

      if (p.param >= 1 || Math.random() < 0.003) {
        p.param = 0;
      }
    }
  }

  _updatePositionBuffer(characteristics) {
    const positions = new Float32Array(this.particleCount * 2);
    const ml = this.margin.left;
    const mt = this.margin.top;
    const pw = this.displayWidth - ml - this.margin.right;
    const ph = this.displayHeight - mt - this.margin.bottom;

    let idx = 0;
    for (const p of this.particles) {
      const pts = characteristics[p.charIndex]?.points;
      if (!pts || pts.length < 2) {
        positions[idx++] = -2; // offscreen
        positions[idx++] = -2;
        continue;
      }

      // Interpolate world position
      const pidx = p.param * (pts.length - 1);
      const i = Math.floor(pidx);
      const frac = pidx - i;
      const p1 = pts[Math.min(i, pts.length - 1)];
      const p2 = pts[Math.min(i + 1, pts.length - 1)];

      const wx = p1.x + frac * (p2.x - p1.x);
      const wt = p1.t + frac * (p2.t - p1.t);

      // World → normalized canvas [0,1] → GL clip space [-1,1]
      const cx = ml + (wx - this.xMin) / (this.xMax - this.xMin) * pw;
      const cy = mt + ph - (wt - this.tMin) / (this.tMax - this.tMin) * ph;

      const glx = (cx / this.displayWidth) * 2 - 1;
      const gly = 1 - (cy / this.displayHeight) * 2; // flip y

      positions[idx++] = glx;
      positions[idx++] = gly;
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  }

  _render() {
    const gl = this.gl;

    // 1. Draw fbA (previous frame) onto fbB with fade
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbB.framebuffer);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.fadeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbA.texture);
    gl.uniform1i(gl.getUniformLocation(this.fadeProgram, 'u_texture'), 0);
    gl.uniform1f(gl.getUniformLocation(this.fadeProgram, 'u_fade'), this.fadeAmount);

    const aPos = gl.getAttribLocation(this.fadeProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // 2. Draw particles on top of fbB
    gl.useProgram(this.particleProgram);
    gl.uniform4f(
      gl.getUniformLocation(this.particleProgram, 'u_color'),
      0.95, 0.61, 0.07, 0.95 // orange (#f39c12)
    );

    const pPos = gl.getAttribLocation(this.particleProgram, 'a_position');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.particleBuffer);
    gl.enableVertexAttribArray(pPos);
    gl.vertexAttribPointer(pPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);

    // 3. Swap framebuffers
    [this.fbA, this.fbB] = [this.fbB, this.fbA];

    // 4. Draw fbA to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.fadeProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fbA.texture);
    gl.uniform1i(gl.getUniformLocation(this.fadeProgram, 'u_texture'), 0);
    gl.uniform1f(gl.getUniformLocation(this.fadeProgram, 'u_fade'), 1.0); // no fade for screen output

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  /**
   * Clear all trails.
   */
  clear() {
    if (!this.gl) return;
    const gl = this.gl;
    for (const fb of [this.fbA, this.fbB]) {
      if (!fb) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb.framebuffer);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
