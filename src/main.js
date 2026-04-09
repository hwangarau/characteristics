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
import { computeViewport } from './viewport.js';
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

  // 4. Render and snapshot for pan/zoom
  rerender();
  renderer.snapshot();

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
// Click+drag = pan. Click (no drag) = inspect.
// Scroll = zoom. Touch: two-finger pinch = zoom, two-finger drag = pan.

function setupInteraction(canvas) {
  let isDown = false;
  let startMouse = null;
  let lastMouse = null;
  let totalDrag = 0; // total pixels dragged — used to distinguish click from drag
  let recomputeTimer = null;

  const DRAG_THRESHOLD = 5; // pixels — below this is a click, above is a drag

  function scheduleRecompute() {
    clearTimeout(recomputeTimer);
    recomputeTimer = setTimeout(recompute, 300);
  }

  function applyPan(dx, dy) {
    const worldDx = -dx / renderer.plotWidth * (renderer.xMax - renderer.xMin);
    const worldDt = dy / renderer.plotHeight * (renderer.tMax - renderer.tMin);

    const newXMin = renderer.xMin + worldDx;
    const newXMax = renderer.xMax + worldDx;
    const newTMin = Math.max(0, renderer.tMin + worldDt);
    const newTMax = renderer.tMax + worldDt;

    currentState = { ...currentState, xRange: [newXMin, newXMax], tRange: [newTMin, newTMax] };
    updateViewport(newXMin, newXMax, newTMin, newTMax);
    renderer.setViewport(newXMin, newXMax, newTMin, newTMax);
    renderer.blitSnapshot();

    if (animating) {
      particleGL.setViewport(newXMin, newXMax, newTMin, newTMax);
    }
  }

  function applyZoom(zoomFactor, cx, cy) {
    const [worldX, worldT] = renderer.canvasToWorld(cx, cy);

    const newXMin = worldX - (worldX - renderer.xMin) * zoomFactor;
    const newXMax = worldX + (renderer.xMax - worldX) * zoomFactor;
    const newTMin = Math.max(0, worldT - (worldT - renderer.tMin) * zoomFactor);
    const newTMax = worldT + (renderer.tMax - worldT) * zoomFactor;

    zoomScale /= zoomFactor;
    currentState = { ...currentState, xRange: [newXMin, newXMax], tRange: [newTMin, newTMax] };
    updateViewport(newXMin, newXMax, newTMin, newTMax);
    setZoomLevel(zoomScale);
    renderer.setViewport(newXMin, newXMax, newTMin, newTMax);
    renderer.blitSnapshot();

    if (animating) {
      particleGL.setViewport(newXMin, newXMax, newTMin, newTMax);
    }

    scheduleRecompute();
  }

  // Mouse wheel → zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    applyZoom(factor, cx, cy);
  }, { passive: false });

  // Mouse down → start potential pan
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDown = true;
    startMouse = { x: e.clientX, y: e.clientY };
    lastMouse = { x: e.clientX, y: e.clientY };
    totalDrag = 0;
  });

  // Mouse move → pan if dragging
  window.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    totalDrag += Math.abs(dx) + Math.abs(dy);
    lastMouse = { x: e.clientX, y: e.clientY };

    if (totalDrag > DRAG_THRESHOLD) {
      canvas.style.cursor = 'grabbing';
      applyPan(dx, dy);
    }
  });

  // Mouse up → end pan, or trigger click-inspect if no drag
  window.addEventListener('mouseup', (e) => {
    if (!isDown) return;
    isDown = false;
    canvas.style.cursor = '';

    if (totalDrag > DRAG_THRESHOLD) {
      // Was a drag → schedule retrace
      scheduleRecompute();
    } else {
      // Was a click → inspect
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      handleInspectClick(cx, cy);
    }
  });

  // Touch: pinch to zoom, two-finger drag to pan
  let lastTouches = null;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && lastTouches) {
      e.preventDefault();
      const cur = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));

      // Pan: average movement
      const dx = ((cur[0].x + cur[1].x) - (lastTouches[0].x + lastTouches[1].x)) / 2;
      const dy = ((cur[0].y + cur[1].y) - (lastTouches[0].y + lastTouches[1].y)) / 2;
      applyPan(dx, dy);

      // Pinch zoom
      const prevDist = Math.hypot(lastTouches[1].x - lastTouches[0].x, lastTouches[1].y - lastTouches[0].y);
      const curDist = Math.hypot(cur[1].x - cur[0].x, cur[1].y - cur[0].y);
      if (prevDist > 10 && curDist > 10) {
        const factor = prevDist / curDist;
        const rect = canvas.getBoundingClientRect();
        const cx = (cur[0].x + cur[1].x) / 2 - rect.left;
        const cy = (cur[0].y + cur[1].y) / 2 - rect.top;
        applyZoom(factor, cx, cy);
      }

      lastTouches = cur;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    if (lastTouches) {
      lastTouches = null;
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

// Inspect panel refs (set up in init)
let inspectPanel, inspectTitle, inspectEqns, inspectCanvasX, inspectCanvasU;

function initInspectPanel() {
  inspectPanel = document.getElementById('inspect-panel');
  inspectTitle = document.getElementById('inspect-title');
  inspectEqns = document.getElementById('inspect-equations');
  inspectCanvasX = document.getElementById('inspect-canvas-x');
  inspectCanvasU = document.getElementById('inspect-canvas-u');
  document.getElementById('inspect-close').addEventListener('click', () => inspectPanel.classList.add('hidden'));
}

function handleInspectClick(cx, cy) {
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
    inspectPanel.classList.add('hidden');
    return;
  }

  inspectPanel.classList.remove('hidden');
  inspectTitle.textContent = `x\u2080 = ${bestChar.x0.toFixed(3)}, u\u2080 = ${isFinite(bestChar.u0) ? bestChar.u0.toFixed(3) : 'N/A'}`;

  inspectEqns.innerHTML = '';
  const solDiv = document.createElement('div');
  solDiv.id = 'inspect-sol';
  inspectEqns.appendChild(solDiv);

  solveCharacteristics(currentState.a, currentState.b).then(solutions => {
    const lines = [];
    if (solutions.xSolution) lines.push(solutions.xSolution.latex);
    if (solutions.uSolution) lines.push(solutions.uSolution.latex);
    if (lines.length) renderSolution(solDiv, lines.join(', \\quad '));
  }).catch(() => {});

  drawMiniGraph(inspectCanvasX, bestChar, 'x');
  drawMiniGraph(inspectCanvasU, bestChar, 'u');
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
  const { zoomIn, zoomOut, recenter, fit } = getZoomControls();

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

    renderer.setViewport(newXMin, newXMax, newTMin, newTMax);
    renderer.blitSnapshot();

    clearTimeout(zoom._timer);
    zoom._timer = setTimeout(recompute, 300);
  }

  zoomIn?.addEventListener('click', () => zoom(1 / 1.3));
  zoomOut?.addEventListener('click', () => zoom(1.3));

  // Recenter: reset to preset's original viewport
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

  // Fit: auto-compute viewport from current equation
  fit?.addEventListener('click', () => {
    const state = getState();
    const aResult = compileExpression(state.a);
    const icResult = compileInitialData(state.initialData);
    if (aResult.error || !icResult.evaluate) return;

    const vp = computeViewport(aResult.evaluate, icResult.evaluate, aResult.dependsOnU);
    zoomScale = 1.0;
    currentState = { ...currentState, xRange: vp.xRange, tRange: vp.tRange };
    updateViewport(vp.xRange[0], vp.xRange[1], vp.tRange[0], vp.tRange[1]);
    setZoomLevel(1.0);
    recompute();
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
  initInspectPanel();
  setupHover(canvas);
  setupInteraction(canvas);
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
