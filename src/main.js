/**
 * Main entry point — orchestrates the full pipeline:
 * UI input → math parsing → KaTeX display → ODE integration → canvas rendering → animation loop
 */

import { Renderer } from './renderer.js';
import { compileExpression, compileInitialData } from './math-pipeline.js';
import { renderEquation, renderInitialCondition } from './equation-display.js';
import { traceCharacteristics } from './integrator.js';
import { initUI, getState, setStatus, loadPreset } from './ui.js';
import { PRESETS } from './presets.js';

let renderer;
let currentCharacteristics = [];
let animating = false;
let animFrameId = null;

// DOM elements for equation display
let pdeDisplay, charOdeDisplay, icDisplay;

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

  // Mark errors
  if (aResult.error) document.getElementById('input-a').classList.add('error');
  if (bResult.error) document.getElementById('input-b').classList.add('error');
  if (icResult.error) document.getElementById('input-ic').classList.add('error');

  // 2. Update KaTeX displays
  renderEquation(pdeDisplay, charOdeDisplay, aResult.latex, bResult.latex);
  renderInitialCondition(icDisplay, icResult.latex);

  // 3. Bail if parse errors
  if (aResult.error || bResult.error) {
    setStatus(`Parse error: ${aResult.error || bResult.error}`);
    return;
  }

  // 4. Trace characteristics
  const dt = 0.01;
  const result = traceCharacteristics({
    aFn: aResult.evaluate,
    bFn: bResult.evaluate,
    initialDataFn: icResult.evaluate, // null if empty
    aDepends_u: aResult.dependsOnU,
    numCurves: state.numCurves,
    xRange: state.xRange,
    tRange: state.tRange,
    dt,
  });

  currentCharacteristics = result.characteristics;

  // 5. Render
  renderer.setViewport(state.xRange[0], state.xRange[1], state.tRange[0], state.tRange[1]);
  renderer.clear();
  renderer.drawGrid();
  renderer.drawAxes();
  renderer.drawCharacteristics(currentCharacteristics, state.colorMode, aResult.evaluate);
  renderer.drawInitialData(icResult.evaluate, state.xRange);

  if (result.shocks.length > 0) {
    renderer.drawShocks(result.shocks);
  }

  // Status bar
  let statusParts = [`${currentCharacteristics.length} characteristics`];
  if (result.shocks.length > 0) {
    const earliest = result.shocks.reduce((a, b) => a.t < b.t ? a : b);
    statusParts.push(`shock at t \u2248 ${earliest.t.toFixed(2)}`);
  }
  if (result.warning) {
    statusParts.push(result.warning);
  }
  setStatus(statusParts.join(' | '));

  // 6. Particles
  if (state.showParticles) {
    renderer.initParticles(currentCharacteristics, 3);
    renderer.cacheBackground();
    startAnimation();
  } else {
    stopAnimation();
  }
}

function startAnimation() {
  if (animating) return;
  animating = true;

  let lastTime = performance.now();

  function frame(now) {
    if (!animating) return;

    const dt = (now - lastTime) / 1000;
    lastTime = now;

    renderer.restoreBackground();
    renderer.stepParticles(dt, currentCharacteristics);
    renderer.drawParticles(currentCharacteristics);

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

// ─── Hover info ───

function setupHover(canvas) {
  const hoverInfo = document.getElementById('hover-info');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const [x, t] = renderer.canvasToWorld(cx, cy);

    // Check bounds
    if (x < renderer.xMin || x > renderer.xMax || t < renderer.tMin || t > renderer.tMax) {
      hoverInfo.textContent = '';
      return;
    }

    // Find nearest characteristic point
    let nearest = null;
    let nearestDist = Infinity;

    for (const char of currentCharacteristics) {
      for (const p of char.points) {
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

  initUI(recompute);
  setupHover(canvas);
  window.addEventListener('resize', recompute);

  // Load first preset
  const presetSelect = document.getElementById('preset-select');
  presetSelect.value = '0';
  loadPreset(PRESETS[0]);
  recompute();
});
