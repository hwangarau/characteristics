/**
 * Main entry point — orchestrates the full pipeline.
 *
 * Two render paths for performance:
 *   recompute() — full pipeline: parse → integrate → render (on input change)
 *   rerender()  — just redraw at current viewport (on pan/zoom, instant)
 */

import { Renderer } from './renderer.js';
import { ParticleGL } from './particles-gl.js';
import { compileExpression, compileInitialData } from './math-pipeline.js';
import { renderEquation, renderInitialCondition, renderSolution } from './equation-display.js';
import { traceCharacteristics, resolveShocks } from './integrator.js';
import { computeShockCurve } from './shock-curve.js';
import { solveCharacteristics, formatSolutionDisplay } from './symbolic.js';
import { initUI, getState, setStatus, loadPreset, updateViewport, setZoomLevel, getZoomControls, getCurrentPreset } from './ui.js';
import { PRESETS } from './presets.js';

let renderer;
let particleGL;
let currentCharacteristics = [];
let currentShocks = [];
let currentShockCurve = [];
let currentLeftCaustic = [];
let currentRightCaustic = [];
let currentAFn = null;
let currentICFn = null;
let currentState = null;
let defaultViewport = null; // for recenter
let zoomScale = 1.0;
let animating = false;
let animFrameId = null;

// DOM elements
let pdeDisplay, charOdeDisplay, icDisplay, xSolDisplay, uSolDisplay;

/**
 * Full recompute: parse expressions, trace characteristics, render.
 * Called on equation/preset/setting changes.
 */
function recompute() {
  const state = getState();
  currentState = state;

  // Clear error styles
  document.getElementById('input-a').classList.remove('error');
  document.getElementById('input-b').classList.remove('error');
  document.getElementById('input-ic').classList.remove('error');

  // 1. Compile
  const aResult = compileExpression(state.a);
  const bResult = compileExpression(state.b);
  const icResult = compileInitialData(state.initialData);

  if (aResult.error) document.getElementById('input-a').classList.add('error');
  if (bResult.error) document.getElementById('input-b').classList.add('error');
  if (icResult.error) document.getElementById('input-ic').classList.add('error');

  // 2. KaTeX displays
  renderEquation(pdeDisplay, charOdeDisplay, aResult.latex, bResult.latex);
  renderInitialCondition(icDisplay, icResult.latex);

  if (aResult.error || bResult.error) {
    setStatus(`Parse error: ${aResult.error || bResult.error}`);
    return;
  }

  // 3. Trace characteristics
  const result = traceCharacteristics({
    aFn: aResult.evaluate,
    bFn: bResult.evaluate,
    initialDataFn: icResult.evaluate,
    aDepends_u: aResult.dependsOnU,
    numCurves: state.numCurves,
    xRange: state.xRange,
    tRange: state.tRange,
    dt: 0.01,
    domainType: state.domainType,
    domainA: state.domainA,
    domainB: state.domainB,
  });

  currentCharacteristics = result.characteristics;
  currentShocks = result.shocks;
  currentAFn = aResult.evaluate;
  currentICFn = icResult.evaluate;

  // 3b. Compute shock curve analytically (independent of drawn characteristics)
  const aDependsX = exprContainsVar(state.a, 'x');
  const aDependsT = exprContainsVar(state.a, 't');
  const shockResult = computeShockCurve(
    aResult.evaluate, icResult.evaluate,
    aDependsX, aDependsT, state.xRange, state.tRange
  );
  currentShockCurve = shockResult.shockCurve;
  currentLeftCaustic = shockResult.leftCaustic || [];
  currentRightCaustic = shockResult.rightCaustic || [];

  // 4. Render
  rerender();

  // 5. Particles — always stop first, then restart if needed
  stopAnimation();
  if (state.showParticles) {
    const displayChars = getDisplayChars();
    particleGL.resize(window.innerWidth, window.innerHeight);
    particleGL.setViewport(state.xRange[0], state.xRange[1], state.tRange[0], state.tRange[1]);
    particleGL.initParticles(displayChars, state.particlesPerCurve || 5);
    startAnimation();
  } else {
    particleGL.clear();
  }

  // 6. Symbolic solutions (async, after picture)
  solveCharacteristics(state.a, state.b).then(solutions => {
    const [xTex, uTex] = formatSolutionDisplay(solutions);
    renderSolution(xSolDisplay, xTex);
    renderSolution(uSolDisplay, uTex);
  }).catch(() => {
    if (xSolDisplay) xSolDisplay.textContent = '';
    if (uSolDisplay) uSolDisplay.textContent = '';
  });
}

/**
 * Get display characteristics (resolved if toggle is on).
 */
function getDisplayChars() {
  if (currentState?.resolveShocks && currentShocks.length > 0) {
    return resolveShocks(currentCharacteristics, currentShocks).resolved;
  }
  return currentCharacteristics;
}

/**
 * Fast re-render: just redraw at current viewport without retracing.
 * Used for pan/zoom — instant response.
 */
function rerender() {
  const state = currentState || getState();

  renderer.setViewport(state.xRange[0], state.xRange[1], state.tRange[0], state.tRange[1]);
  renderer.clear();
  renderer.drawGrid();
  renderer.drawAxes();

  const displayChars = getDisplayChars();
  // In particle mode, draw curves very dim
  if (state.showParticles) {
    renderer.drawCharacteristics(displayChars, 'uniform-dim', currentAFn);
  } else {
    renderer.drawCharacteristics(displayChars, state.colorMode, currentAFn);
  }

  renderer.drawInitialData(currentICFn, state.xRange);
  renderer.drawDomainBounds(state.domainType, state.domainA, state.domainB);

  if (currentShocks.length > 0) {
    renderer.drawShocks(currentShocks);
  }
  if (currentShockCurve.length > 0) {
    renderer.drawShockSystem(currentShockCurve, currentLeftCaustic, currentRightCaustic);
  }

  // Status
  let statusParts = [`${displayChars.length} characteristics`];
  if (currentShocks.length > 0) {
    const earliest = currentShocks.reduce((a, b) => a.t < b.t ? a : b);
    statusParts.push(`${currentShocks.length} crossings | shock t\u2248${earliest.t.toFixed(2)}`);
  }
  setStatus(statusParts.join(' | '));
}

// ─── Animation ───

function startAnimation() {
  if (animating) return;
  animating = true;
  let lastTime = performance.now();

  function frame(now) {
    if (!animating) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const displayChars = getDisplayChars();
    particleGL.frame(dt, displayChars);

    animFrameId = requestAnimationFrame(frame);
  }

  animFrameId = requestAnimationFrame(frame);
}

function stopAnimation() {
  animating = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}

// ─── Pan & Zoom ───

function setupPanZoom(canvas) {
  let isPanning = false;
  let lastMouse = null;
  let recomputeTimer = null;

  // Debounced recompute — retrace after viewport settles
  function scheduleRecompute() {
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recompute, 300);
  }

  // Zoom: instant rerender, debounced retrace
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [worldX, worldT] = renderer.canvasToWorld(cx, cy);

    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

    const newXMin = worldX - (worldX - renderer.xMin) * zoomFactor;
    const newXMax = worldX + (renderer.xMax - worldX) * zoomFactor;
    const newTMin = Math.max(0, worldT - (worldT - renderer.tMin) * zoomFactor);
    const newTMax = worldT + (renderer.tMax - worldT) * zoomFactor;

    // Update state immediately
    zoomScale /= zoomFactor;
    currentState = { ...currentState, xRange: [newXMin, newXMax], tRange: [newTMin, newTMax] };
    updateViewport(newXMin, newXMax, newTMin, newTMax);
    setZoomLevel(zoomScale);

    // Instant redraw with existing curves
    rerender();

    // Update particle viewport if animating
    if (animating) {
      particleGL.setViewport(newXMin, newXMax, newTMin, newTMax);
    }

    // Retrace after zoom settles
    scheduleRecompute();
  }, { passive: false });

  // Pan: instant rerender
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && (e.ctrlKey || e.metaKey))) {
      isPanning = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };

    const worldDx = -dx / renderer.plotWidth * (renderer.xMax - renderer.xMin);
    const worldDt = dy / renderer.plotHeight * (renderer.tMax - renderer.tMin);

    const newXMin = renderer.xMin + worldDx;
    const newXMax = renderer.xMax + worldDx;
    const newTMin = Math.max(0, renderer.tMin + worldDt);
    const newTMax = renderer.tMax + worldDt;

    currentState = { ...currentState, xRange: [newXMin, newXMax], tRange: [newTMin, newTMax] };
    updateViewport(newXMin, newXMax, newTMin, newTMax);
    rerender();

    if (animating) {
      particleGL.setViewport(newXMin, newXMax, newTMin, newTMax);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
      scheduleRecompute();
    }
  });
}

// ─── Utility ───

function exprContainsVar(expr, v) {
  const masked = (expr || '').replace(/\bexp\b/g, '_').replace(/\bstep\b/g, '_');
  return new RegExp(`(?<![a-zA-Z_])${v}(?![a-zA-Z0-9_])`).test(masked);
}

// ─── Hover ───

function setupClickInspect(canvas) {
  const panel = document.getElementById('inspect-panel');
  const title = document.getElementById('inspect-title');
  const eqns = document.getElementById('inspect-equations');
  const canvasX = document.getElementById('inspect-canvas-x');
  const canvasU = document.getElementById('inspect-canvas-u');
  const closeBtn = document.getElementById('inspect-close');

  closeBtn.addEventListener('click', () => panel.classList.add('hidden'));

  canvas.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    let bestChar = null;
    let bestDist = Infinity;

    for (const char of currentCharacteristics) {
      for (let i = 0; i < char.points.length; i += 3) {
        const p = char.points[i];
        const [pcx, pcy] = renderer.worldToCanvas(p.x, p.t);
        const dist = Math.hypot(pcx - cx, pcy - cy);
        if (dist < bestDist) {
          bestDist = dist;
          bestChar = char;
        }
      }
    }

    if (!bestChar || bestDist > 20) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    title.textContent = `x\u2080 = ${bestChar.x0.toFixed(3)}, u\u2080 = ${isFinite(bestChar.u0) ? bestChar.u0.toFixed(3) : 'N/A'}`;

    // Show analytical solution (from the symbolic solver, if available)
    eqns.innerHTML = '';
    const solDiv = document.createElement('div');
    solDiv.id = 'inspect-sol';
    eqns.appendChild(solDiv);

    // Fetch symbolic solution for display
    solveCharacteristics(currentState.a, currentState.b).then(solutions => {
      const lines = [];
      if (solutions.xSolution) lines.push(solutions.xSolution.latex);
      if (solutions.uSolution) lines.push(solutions.uSolution.latex);
      if (lines.length) {
        for (const latex of lines) {
          renderSolution(solDiv, lines.join(', \\quad '));
        }
      }
    }).catch(() => {});

    // Draw x(t) and u(t) curves
    drawMiniGraph(canvasX, bestChar, 'x');
    drawMiniGraph(canvasU, bestChar, 'u');
  });
}

function drawMiniGraph(canvas, char, field) {
  const dpr = window.devicePixelRatio || 1;
  const w = 340, h = 100;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const m = { top: 10, right: 10, bottom: 18, left: 40 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;

  ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
  ctx.fillRect(0, 0, w, h);

  const pts = char.points;
  if (pts.length < 2) return;

  // Get values and range
  let vMin = Infinity, vMax = -Infinity;
  for (const p of pts) {
    const v = field === 'x' ? p.x : p.u;
    if (isFinite(v)) {
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
  }
  if (!isFinite(vMin)) return;
  if (vMax - vMin < 0.01) { vMin -= 0.5; vMax += 0.5; }

  const tMin = pts[0].t;
  const tMax = pts[pts.length - 1].t;
  if (tMax - tMin < 1e-10) return;

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(m.left, m.top + ph);
  ctx.lineTo(m.left + pw, m.top + ph);
  ctx.moveTo(m.left, m.top);
  ctx.lineTo(m.left, m.top + ph);
  ctx.stroke();

  // Tick labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '9px Consolas';
  ctx.textAlign = 'right';
  ctx.fillText(vMax.toFixed(2), m.left - 3, m.top + 8);
  ctx.fillText(vMin.toFixed(2), m.left - 3, m.top + ph + 3);
  ctx.textAlign = 'center';
  ctx.fillText(tMax.toFixed(1), m.left + pw, h - 2);

  // Curve
  ctx.strokeStyle = field === 'x' ? '#f39c12' : '#5b9bd5';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const v = field === 'x' ? pts[i].x : pts[i].u;
    const px = m.left + (pts[i].t - tMin) / (tMax - tMin) * pw;
    const py = m.top + ph - (v - vMin) / (vMax - vMin) * ph;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function setupHover(canvas) {
  const hoverInfo = document.getElementById('hover-info');

  canvas.addEventListener('mousemove', (e) => {
    if (e.ctrlKey || e.metaKey) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [x, t] = renderer.canvasToWorld(cx, cy);

    if (x < renderer.xMin || x > renderer.xMax || t < renderer.tMin || t > renderer.tMax) {
      hoverInfo.textContent = '';
      return;
    }

    let nearest = null;
    let nearestDist = Infinity;

    for (const char of currentCharacteristics) {
      const pts = char.points;
      for (let i = 0; i < pts.length; i += 5) {
        const p = pts[i];
        const [pcx, pcy] = renderer.worldToCanvas(p.x, p.t);
        const dist = Math.hypot(pcx - cx, pcy - cy);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = p;
        }
      }
    }

    let text = `x=${x.toFixed(2)}, t=${t.toFixed(2)}`;
    if (nearest && nearestDist < 15 && isFinite(nearest.u)) {
      text += ` | u=${nearest.u.toFixed(3)}`;
    }
    hoverInfo.textContent = text;
  });

  canvas.addEventListener('mouseleave', () => {
    hoverInfo.textContent = '';
  });
}

// ─── Zoom buttons ───

function setupZoomButtons() {
  const { zoomIn, zoomOut, recenter } = getZoomControls();

  function zoom(factor) {
    const cx = (renderer.xMin + renderer.xMax) / 2;
    const ct = (renderer.tMin + renderer.tMax) / 2;
    const hw = (renderer.xMax - renderer.xMin) / 2 * factor;
    const ht = (renderer.tMax - renderer.tMin) / 2 * factor;

    const newXMin = cx - hw;
    const newXMax = cx + hw;
    const newTMin = Math.max(0, ct - ht);
    const newTMax = ct + ht;

    zoomScale /= factor;
    currentState = { ...currentState, xRange: [newXMin, newXMax], tRange: [newTMin, newTMax] };
    updateViewport(newXMin, newXMax, newTMin, newTMax);
    setZoomLevel(zoomScale);
    rerender();

    // Debounced retrace
    clearTimeout(zoom._timer);
    zoom._timer = setTimeout(recompute, 300);
  }

  zoomIn?.addEventListener('click', () => zoom(1 / 1.3));
  zoomOut?.addEventListener('click', () => zoom(1.3));

  recenter?.addEventListener('click', () => {
    const preset = getCurrentPreset();
    if (preset) {
      zoomScale = 1.0;
      currentState = { ...currentState, xRange: [...preset.xRange], tRange: [...preset.tRange] };
      updateViewport(preset.xRange[0], preset.xRange[1], preset.tRange[0], preset.tRange[1]);
      setZoomLevel(1.0);
      recompute();
    } else if (defaultViewport) {
      zoomScale = 1.0;
      currentState = { ...currentState, xRange: [...defaultViewport.xRange], tRange: [...defaultViewport.tRange] };
      updateViewport(defaultViewport.xRange[0], defaultViewport.xRange[1], defaultViewport.tRange[0], defaultViewport.tRange[1]);
      setZoomLevel(1.0);
      recompute();
    }
  });
}

// ─── Init ───

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('main-canvas');
  const glCanvas = document.getElementById('particle-canvas');

  renderer = new Renderer(canvas);
  particleGL = new ParticleGL(glCanvas);

  pdeDisplay = document.getElementById('pde-display');
  charOdeDisplay = document.getElementById('char-ode-display');
  icDisplay = document.getElementById('ic-display');
  xSolDisplay = document.getElementById('x-solution-display');
  uSolDisplay = document.getElementById('u-solution-display');

  initUI(recompute);
  setupHover(canvas);
  setupClickInspect(canvas);
  setupPanZoom(canvas);
  setupZoomButtons();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recompute, 100);
  });

  // Load first preset
  document.getElementById('preset-select').value = '0';
  loadPreset(PRESETS[0]);
  defaultViewport = { xRange: [...PRESETS[0].xRange], tRange: [...PRESETS[0].tRange] };
  zoomScale = 1.0;
  recompute();
});
