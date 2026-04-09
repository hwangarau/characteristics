/**
 * Main entry point — orchestrates the full pipeline:
 * UI input → math parsing → KaTeX display → ODE integration → canvas rendering → animation loop
 *
 * Priority: render curves first, then compute symbolic solutions in parallel.
 */

import { Renderer } from './renderer.js';
import { compileExpression, compileInitialData } from './math-pipeline.js';
import { renderEquation, renderInitialCondition, renderSolution } from './equation-display.js';
import { traceCharacteristics } from './integrator.js';
import { solveCharacteristics, formatSolutionDisplay } from './symbolic.js';
import { initUI, getState, setStatus, loadPreset, updateViewport } from './ui.js';
import { PRESETS } from './presets.js';

let renderer;
let currentCharacteristics = [];
let currentAFn = null;
let currentColorMode = 'uniform';
let animating = false;
let animFrameId = null;

// DOM elements for equation display
let pdeDisplay, charOdeDisplay, icDisplay, xSolDisplay, uSolDisplay;

function recompute() {
  const state = getState();

  // Clear error styles
  document.getElementById('input-a').classList.remove('error');
  document.getElementById('input-b').classList.remove('error');
  document.getElementById('input-ic').classList.remove('error');

  // 1. Compile expressions
  const aResult = compileExpression(state.a);
  const bResult = compileExpression(state.b);
  const icResult = compileInitialData(state.initialData);

  if (aResult.error) document.getElementById('input-a').classList.add('error');
  if (bResult.error) document.getElementById('input-b').classList.add('error');
  if (icResult.error) document.getElementById('input-ic').classList.add('error');

  // 2. Update KaTeX displays (fast, do first)
  renderEquation(pdeDisplay, charOdeDisplay, aResult.latex, bResult.latex);
  renderInitialCondition(icDisplay, icResult.latex);

  // 3. Bail if parse errors
  if (aResult.error || bResult.error) {
    setStatus(`Parse error: ${aResult.error || bResult.error}`);
    return;
  }

  // 4. Trace characteristics (priority — this draws the picture)
  const dt = 0.01;
  const result = traceCharacteristics({
    aFn: aResult.evaluate,
    bFn: bResult.evaluate,
    initialDataFn: icResult.evaluate,
    aDepends_u: aResult.dependsOnU,
    numCurves: state.numCurves,
    xRange: state.xRange,
    tRange: state.tRange,
    dt,
  });

  currentCharacteristics = result.characteristics;
  currentAFn = aResult.evaluate;
  currentColorMode = state.colorMode;

  // 5. Render curves immediately
  renderer.setViewport(state.xRange[0], state.xRange[1], state.tRange[0], state.tRange[1]);
  renderer.clear();
  renderer.drawGrid();
  renderer.drawAxes();
  renderer.drawCharacteristics(currentCharacteristics, state.colorMode, aResult.evaluate);
  renderer.drawInitialData(icResult.evaluate, state.xRange);

  if (result.shocks.length > 0) {
    renderer.drawShocks(result.shocks);
  }

  // Status
  let statusParts = [`${currentCharacteristics.length} characteristics`];
  if (result.shocks.length > 0) {
    const earliest = result.shocks.reduce((a, b) => a.t < b.t ? a : b);
    statusParts.push(`shock at t \u2248 ${earliest.t.toFixed(2)}`);
  }
  if (result.warning) statusParts.push(result.warning);
  setStatus(statusParts.join(' | '));

  // 6. Particles
  if (state.showParticles) {
    renderer.initParticles(currentCharacteristics, 5);
    renderer.cacheBackground();
    startAnimation();
  } else {
    stopAnimation();
  }

  // 7. Symbolic solutions (async — computed after the picture is drawn)
  solveCharacteristics(state.a, state.b).then(solutions => {
    const [xTex, uTex] = formatSolutionDisplay(solutions);
    renderSolution(xSolDisplay, xTex);
    renderSolution(uSolDisplay, uTex);
  }).catch(() => {
    if (xSolDisplay) xSolDisplay.textContent = '';
    if (uSolDisplay) uSolDisplay.textContent = '';
  });
}

function startAnimation() {
  if (animating) return;
  animating = true;
  let lastTime = performance.now();

  function frame(now) {
    if (!animating) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = now;

    renderer.stepParticles(dt, currentCharacteristics);
    renderer.drawAnimationFrame(currentCharacteristics);

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

  // Zoom with mouse wheel
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [worldX, worldT] = renderer.canvasToWorld(cx, cy);

    const zoomFactor = e.deltaY > 0 ? 1.15 : 1 / 1.15;

    // Zoom centered on cursor position
    const newXMin = worldX - (worldX - renderer.xMin) * zoomFactor;
    const newXMax = worldX + (renderer.xMax - worldX) * zoomFactor;
    const newTMin = worldT - (worldT - renderer.tMin) * zoomFactor;
    const newTMax = worldT + (renderer.tMax - worldT) * zoomFactor;

    // Clamp tMin to >= 0
    renderer.setViewport(newXMin, newXMax, Math.max(0, newTMin), newTMax);
    updateViewport(newXMin, newXMax, Math.max(0, newTMin), newTMax);
    recompute();
  }, { passive: false });

  // Pan with middle-click or ctrl+click drag
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
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

    // Convert pixel deltas to world deltas
    const worldDx = -dx / renderer.plotWidth * (renderer.xMax - renderer.xMin);
    const worldDt = dy / renderer.plotHeight * (renderer.tMax - renderer.tMin);

    const newTMin = Math.max(0, renderer.tMin + worldDt);
    const newTMax = renderer.tMax + worldDt;

    renderer.setViewport(
      renderer.xMin + worldDx,
      renderer.xMax + worldDx,
      newTMin,
      newTMax
    );
    updateViewport(
      renderer.xMin, renderer.xMax,
      renderer.tMin, renderer.tMax
    );
    recompute();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
    }
  });
}

// ─── Hover info ───

function setupHover(canvas) {
  const hoverInfo = document.getElementById('hover-info');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [x, t] = renderer.canvasToWorld(cx, cy);

    if (x < renderer.xMin || x > renderer.xMax || t < renderer.tMin || t > renderer.tMax) {
      hoverInfo.textContent = '';
      return;
    }

    // Find nearest characteristic point (sample every 5th point for perf)
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

// ─── Init ───

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('main-canvas');
  renderer = new Renderer(canvas);

  pdeDisplay = document.getElementById('pde-display');
  charOdeDisplay = document.getElementById('char-ode-display');
  icDisplay = document.getElementById('ic-display');
  xSolDisplay = document.getElementById('x-solution-display');
  uSolDisplay = document.getElementById('u-solution-display');

  initUI(recompute);
  setupHover(canvas);
  setupPanZoom(canvas);

  // Debounced resize recompute
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recompute, 100);
  });

  // Load first preset
  const presetSelect = document.getElementById('preset-select');
  presetSelect.value = '0';
  loadPreset(PRESETS[0]);
  recompute();
});
