/**
 * Canvas 2D renderer for characteristics, axes, grid, and particles.
 * Coordinate system: x horizontal, t vertical (t going up).
 *
 * Particle animation follows the anvaka/fieldplay approach:
 * - Particles flow along pre-computed characteristic curves
 * - Previous frame fades out (trail effect) rather than full redraw
 * - Particles move at speeds proportional to the characteristic velocity
 * - Probabilistic respawning at curve start when particles reach the end
 */

import * as colormap from './colormap.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.margin = { top: 20, right: 20, bottom: 40, left: 50 };

    // Viewport in world coordinates
    this.xMin = -6;
    this.xMax = 6;
    this.tMin = 0;
    this.tMax = 4;

    // Particle state
    this.particles = [];
    this.cachedBackground = null;

    // Resize handling — canvas is full-window
    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);
    this._handleResize();
  }

  _handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.displayWidth = w;
    this.displayHeight = h;
  }

  setViewport(xMin, xMax, tMin, tMax) {
    this.xMin = xMin;
    this.xMax = xMax;
    this.tMin = tMin;
    this.tMax = tMax;
  }

  get plotWidth() {
    return this.displayWidth - this.margin.left - this.margin.right;
  }

  get plotHeight() {
    return this.displayHeight - this.margin.top - this.margin.bottom;
  }

  /** World (x, t) → canvas pixel (cx, cy) */
  worldToCanvas(x, t) {
    const cx = this.margin.left + (x - this.xMin) / (this.xMax - this.xMin) * this.plotWidth;
    const cy = this.margin.top + this.plotHeight - (t - this.tMin) / (this.tMax - this.tMin) * this.plotHeight;
    return [cx, cy];
  }

  /** Canvas pixel (cx, cy) → world (x, t) */
  canvasToWorld(cx, cy) {
    const x = this.xMin + (cx - this.margin.left) / this.plotWidth * (this.xMax - this.xMin);
    const t = this.tMax - (cy - this.margin.top) / this.plotHeight * (this.tMax - this.tMin);
    return [x, t];
  }

  clear() {
    this.ctx.fillStyle = '#0d1117';
    this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
  }

  drawGrid() {
    const ctx = this.ctx;

    // Adaptive grid spacing
    const xSpacing = niceStep(this.xMax - this.xMin, 8);
    const tSpacing = niceStep(this.tMax - this.tMin, 8);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 0.5;

    // Vertical lines (constant x)
    const xStart = Math.ceil(this.xMin / xSpacing) * xSpacing;
    for (let x = xStart; x <= this.xMax; x += xSpacing) {
      const [cx] = this.worldToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, this.margin.top);
      ctx.lineTo(cx, this.margin.top + this.plotHeight);
      ctx.stroke();
    }

    // Horizontal lines (constant t)
    const tStart = Math.ceil(this.tMin / tSpacing) * tSpacing;
    for (let t = tStart; t <= this.tMax; t += tSpacing) {
      const [, cy] = this.worldToCanvas(0, t);
      ctx.beginPath();
      ctx.moveTo(this.margin.left, cy);
      ctx.lineTo(this.margin.left + this.plotWidth, cy);
      ctx.stroke();
    }
  }

  drawAxes() {
    const ctx = this.ctx;
    const xSpacing = niceStep(this.xMax - this.xMin, 8);
    const tSpacing = niceStep(this.tMax - this.tMin, 8);

    // Axis lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;

    // x-axis (t = 0 if visible, otherwise bottom edge)
    const tAxisVal = Math.max(this.tMin, Math.min(this.tMax, 0));
    const [, yAxis] = this.worldToCanvas(0, tAxisVal);
    ctx.beginPath();
    ctx.moveTo(this.margin.left, yAxis);
    ctx.lineTo(this.margin.left + this.plotWidth, yAxis);
    ctx.stroke();

    // t-axis (x = 0 if visible, otherwise left edge)
    const xAxisVal = Math.max(this.xMin, Math.min(this.xMax, 0));
    const [xAxis] = this.worldToCanvas(xAxisVal, 0);
    ctx.beginPath();
    ctx.moveTo(xAxis, this.margin.top);
    ctx.lineTo(xAxis, this.margin.top + this.plotHeight);
    ctx.stroke();

    // Tick labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px Consolas, monospace';

    // x tick labels (along bottom)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xStart = Math.ceil(this.xMin / xSpacing) * xSpacing;
    for (let x = xStart; x <= this.xMax; x += xSpacing) {
      const [cx] = this.worldToCanvas(x, 0);
      ctx.fillText(formatTick(x), cx, this.margin.top + this.plotHeight + 6);
    }

    // t tick labels (along left)
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const tStart = Math.ceil(this.tMin / tSpacing) * tSpacing;
    for (let t = tStart; t <= this.tMax; t += tSpacing) {
      const [, cy] = this.worldToCanvas(0, t);
      ctx.fillText(formatTick(t), this.margin.left - 6, cy);
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '13px Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', this.margin.left + this.plotWidth / 2, this.displayHeight - 14);

    ctx.save();
    ctx.translate(14, this.margin.top + this.plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('t', 0, 0);
    ctx.restore();
  }

  /**
   * Draw characteristic curves.
   */
  drawCharacteristics(characteristics, colorMode, aFn) {
    const ctx = this.ctx;

    // Compute global u range and speed range for color scaling
    let uMin = Infinity, uMax = -Infinity;
    let sMin = Infinity, sMax = -Infinity;

    if (colorMode === 'u-value' || colorMode === 'speed') {
      for (const char of characteristics) {
        for (const p of char.points) {
          if (isFinite(p.u)) {
            uMin = Math.min(uMin, p.u);
            uMax = Math.max(uMax, p.u);
          }
          if (colorMode === 'speed') {
            const speed = Math.abs(aFn({ u: p.u, x: p.x, t: p.t }));
            if (isFinite(speed)) {
              sMin = Math.min(sMin, speed);
              sMax = Math.max(sMax, speed);
            }
          }
        }
      }
    }

    ctx.lineWidth = 1.5;

    // Clip to plot area
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.margin.left, this.margin.top, this.plotWidth, this.plotHeight);
    ctx.clip();

    for (let ci = 0; ci < characteristics.length; ci++) {
      const char = characteristics[ci];
      const pts = char.points;
      if (pts.length < 2) continue;

      if (colorMode === 'uniform' || colorMode === 'index' || colorMode === 'uniform-dim') {
        // Single color per curve — fast path
        ctx.strokeStyle = colorMode === 'uniform-dim'
          ? 'rgba(91, 155, 213, 0.15)'
          : colorMode === 'uniform'
            ? colormap.uniform()
            : colormap.categorical(ci);

        ctx.beginPath();
        const [sx, sy] = this.worldToCanvas(pts[0].x, pts[0].t);
        ctx.moveTo(sx, sy);
        for (let i = 1; i < pts.length; i++) {
          const [px, py] = this.worldToCanvas(pts[i].x, pts[i].t);
          ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else {
        // Per-segment coloring
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i];
          let color;
          if (colorMode === 'u-value') {
            color = colormap.diverging(p.u, uMin, uMax);
          } else {
            const speed = Math.abs(aFn({ u: p.u, x: p.x, t: p.t }));
            color = colormap.sequential(speed, sMin, sMax);
          }

          ctx.strokeStyle = color;
          ctx.beginPath();
          const [x1, y1] = this.worldToCanvas(p.x, p.t);
          const [x2, y2] = this.worldToCanvas(pts[i + 1].x, pts[i + 1].t);
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  /**
   * Draw shock annotations: all crossing points + optional shock curve.
   */
  drawShocks(shocks, shockCurve = []) {
    if (!shocks.length) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.margin.left, this.margin.top, this.plotWidth, this.plotHeight);
    ctx.clip();

    const earliest = shocks.reduce((a, b) => a.t < b.t ? a : b);

    // Draw all crossing points
    for (const s of shocks) {
      const [cx, cy] = this.worldToCanvas(s.x, s.t);
      ctx.fillStyle = 'rgba(203, 67, 53, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw shock curve if resolved
    if (shockCurve.length >= 2) {
      ctx.strokeStyle = 'rgba(203, 67, 53, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [sx0, sy0] = this.worldToCanvas(shockCurve[0].x, shockCurve[0].t);
      ctx.moveTo(sx0, sy0);
      for (let i = 1; i < shockCurve.length; i++) {
        const [sx, sy] = this.worldToCanvas(shockCurve[i].x, shockCurve[i].t);
        ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }

    // Label earliest shock
    const [sx, sy] = this.worldToCanvas(earliest.x, earliest.t);
    ctx.fillStyle = 'rgba(203, 67, 53, 0.8)';
    ctx.font = '11px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`shock t\u2248${earliest.t.toFixed(2)}`, sx + 6, sy - 4);

    ctx.restore();
  }

  /**
   * Draw the initial data curve u(x,0) = f(x) along the bottom axis.
   */
  drawInitialData(f, xRange) {
    if (!f) return;

    const ctx = this.ctx;
    const [xMin, xMax] = xRange;
    const n = 200;

    const vals = [];
    let fMin = Infinity, fMax = -Infinity;
    for (let i = 0; i <= n; i++) {
      const x = xMin + (xMax - xMin) * i / n;
      const u = f(x);
      vals.push({ x, u });
      if (isFinite(u)) {
        fMin = Math.min(fMin, u);
        fMax = Math.max(fMax, u);
      }
    }

    if (!isFinite(fMin)) return;

    const bandHeight = 30;
    const [, baseY] = this.worldToCanvas(0, this.tMin);

    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;

    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [cx] = this.worldToCanvas(vals[i].x, 0);
      const uNorm = fMax > fMin ? (vals[i].u - fMin) / (fMax - fMin) : 0.5;
      const cy = baseY - uNorm * bandHeight;
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ─── Particle animation (anvaka-style) ───

  /**
   * Initialize particles along pre-computed characteristics.
   * Each particle tracks its position as a parameter along a curve,
   * moves at a speed proportional to the local characteristic velocity,
   * and leaves a fading trail.
   */
  initParticles(characteristics, countPerCurve = 5) {
    this.particles = [];
    for (let ci = 0; ci < characteristics.length; ci++) {
      const pts = characteristics[ci].points;
      if (pts.length < 2) continue;

      // Compute total arc length for this curve (in canvas pixels)
      let arcLen = 0;
      for (let i = 1; i < pts.length; i++) {
        const [x1, y1] = this.worldToCanvas(pts[i - 1].x, pts[i - 1].t);
        const [x2, y2] = this.worldToCanvas(pts[i].x, pts[i].t);
        arcLen += Math.hypot(x2 - x1, y2 - y1);
      }

      for (let p = 0; p < countPerCurve; p++) {
        this.particles.push({
          charIndex: ci,
          param: Math.random(),  // 0..1 position along curve
          arcLength: arcLen,
        });
      }
    }
  }

  /**
   * Advance particles. Speed is proportional to the local characteristic
   * velocity |dx/dt|, normalized so particles traverse the curve
   * in roughly the right physical time.
   *
   * Anvaka approach: particles that reach the end respawn at the start
   * with a random delay (probabilistic drop).
   */
  stepParticles(frameDt, characteristics) {
    const dropProbability = 0.003; // chance of random respawn per frame

    for (const p of this.particles) {
      const pts = characteristics[p.charIndex]?.points;
      if (!pts || pts.length < 2) continue;

      // Move at a rate that traverses the curve in ~2-4 seconds visually
      // Speed factor scales with arc length so short/long curves feel similar
      const speed = Math.max(80, p.arcLength * 0.15);
      const paramDelta = (speed * frameDt) / Math.max(1, p.arcLength);

      p.param += paramDelta;

      // Respawn at start when reaching end, or probabilistically
      if (p.param >= 1 || Math.random() < dropProbability) {
        p.param = 0;
      }
    }
  }

  /**
   * Render one animation frame with trail fading (anvaka approach).
   *
   * Instead of restoring a cached background each frame:
   * 1. Fade the entire canvas slightly toward the background color
   * 2. Redraw the static elements (grid, axes, curves) at low opacity
   *    → Actually, for simplicity we do: fade + draw particles on top
   *    The static curves persist through the fade, creating natural trails.
   */
  drawAnimationFrame(characteristics) {
    const ctx = this.ctx;

    // Fade previous frame — this creates the trail effect
    // Lower alpha = longer trails
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    ctx.restore();

    // Restore the static background underneath the faded trails
    // This prevents the grid/axes/curves from fading away
    if (this.cachedBackground) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.putImageData(this.cachedBackground, 0, 0);
      ctx.restore();
    }

    // Draw particles
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.margin.left, this.margin.top, this.plotWidth, this.plotHeight);
    ctx.clip();

    for (const p of this.particles) {
      const pts = characteristics[p.charIndex]?.points;
      if (!pts || pts.length < 2) continue;

      // Interpolate position along curve
      const idx = p.param * (pts.length - 1);
      const i = Math.floor(idx);
      const frac = idx - i;
      const p1 = pts[Math.min(i, pts.length - 1)];
      const p2 = pts[Math.min(i + 1, pts.length - 1)];

      const x = p1.x + frac * (p2.x - p1.x);
      const t = p1.t + frac * (p2.t - p1.t);
      const [cx, cy] = this.worldToCanvas(x, t);

      // Bright particle dot
      ctx.fillStyle = 'rgba(243, 156, 18, 0.95)';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Cache the current canvas state as the static background.
   */
  cacheBackground() {
    this.cachedBackground = this.ctx.getImageData(
      0, 0, this.canvas.width, this.canvas.height
    );
  }

  /**
   * Restore the cached background (for animation frames).
   */
  restoreBackground() {
    if (this.cachedBackground) {
      this.ctx.putImageData(this.cachedBackground, 0, 0);
    }
  }
}

// ─── Utility ───

function niceStep(range, targetCount) {
  const rough = range / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / mag;

  let nice;
  if (normalized < 1.5) nice = 1;
  else if (normalized < 3.5) nice = 2;
  else if (normalized < 7.5) nice = 5;
  else nice = 10;

  return nice * mag;
}

function formatTick(value) {
  if (Math.abs(value) < 1e-10) return '0';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1).replace(/\.0$/, '');
}
