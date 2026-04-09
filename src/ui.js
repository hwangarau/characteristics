/**
 * UI wiring: DOM elements, event listeners, state get/set.
 */

import { PRESETS } from './presets.js';

const $ = (id) => document.getElementById(id);

const elements = {};

export function initUI(onRecompute) {
  elements.inputA = $('input-a');
  elements.inputB = $('input-b');
  elements.inputIC = $('input-ic');
  elements.presetSelect = $('preset-select');
  elements.presetDescription = $('preset-description');
  elements.xMin = $('x-min');
  elements.xMax = $('x-max');
  elements.tMin = $('t-min');
  elements.tMax = $('t-max');
  elements.numCurves = $('num-curves');
  elements.numCurvesVal = $('num-curves-val');
  elements.colorMode = $('color-mode');
  elements.showParticles = $('show-particles');
  elements.statusText = $('status-text');

  // Populate preset dropdown
  elements.presetSelect.innerHTML = '';
  const customOpt = document.createElement('option');
  customOpt.value = '-1';
  customOpt.textContent = '(custom)';
  elements.presetSelect.appendChild(customOpt);

  PRESETS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i.toString();
    opt.textContent = p.name;
    elements.presetSelect.appendChild(opt);
  });

  // Debounce helper for text inputs
  let debounceTimer = null;
  const debouncedRecompute = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(onRecompute, 300);
  };

  // Text inputs: debounced, and switch preset to custom
  for (const el of [elements.inputA, elements.inputB, elements.inputIC]) {
    el.addEventListener('input', () => {
      elements.presetSelect.value = '-1';
      elements.presetDescription.textContent = '';
      debouncedRecompute();
    });
  }

  // Numeric inputs: immediate (tMin is hidden, always 0)
  for (const el of [elements.xMin, elements.xMax, elements.tMax]) {
    el.addEventListener('change', onRecompute);
  }

  // Slider
  elements.numCurves.addEventListener('input', () => {
    elements.numCurvesVal.textContent = elements.numCurves.value;
    onRecompute();
  });

  // Color mode
  elements.colorMode.addEventListener('change', onRecompute);

  // Particles checkbox
  elements.showParticles.addEventListener('change', onRecompute);

  // Preset dropdown
  elements.presetSelect.addEventListener('change', () => {
    const idx = parseInt(elements.presetSelect.value);
    if (idx >= 0 && idx < PRESETS.length) {
      loadPreset(PRESETS[idx]);
      onRecompute();
    }
  });
}

/**
 * Load a preset into the UI fields.
 */
export function loadPreset(preset) {
  elements.inputA.value = preset.a;
  elements.inputB.value = preset.b;
  elements.inputIC.value = preset.initialData || '';
  elements.xMin.value = preset.xRange[0];
  elements.xMax.value = preset.xRange[1];
  elements.tMin.value = preset.tRange[0];
  elements.tMax.value = preset.tRange[1];
  elements.presetDescription.textContent = preset.description || '';
}

/**
 * Read current UI state.
 */
export function getState() {
  return {
    a: elements.inputA.value,
    b: elements.inputB.value,
    initialData: elements.inputIC.value,
    xRange: [parseFloat(elements.xMin.value), parseFloat(elements.xMax.value)],
    tRange: [parseFloat(elements.tMin.value), parseFloat(elements.tMax.value)],
    numCurves: parseInt(elements.numCurves.value),
    colorMode: elements.colorMode.value,
    showParticles: elements.showParticles.checked,
  };
}

/**
 * Update the status bar text.
 */
export function setStatus(text) {
  if (elements.statusText) {
    elements.statusText.textContent = text;
  }
}
