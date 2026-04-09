/**
 * Color mapping utilities for characteristic visualization.
 */

// Tableau 10 categorical palette
const CATEGORICAL = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
  '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac',
];

/**
 * Diverging blue-white-red colormap. Maps value in [min, max] to RGB string.
 * Center (midpoint) is white.
 */
export function diverging(value, min, max) {
  if (max === min) return 'rgb(255,255,255)';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  let r, g, b;
  if (t < 0.5) {
    // blue (70,130,180) → white
    const s = t * 2;
    r = Math.round(70 + (255 - 70) * s);
    g = Math.round(130 + (255 - 130) * s);
    b = Math.round(180 + (255 - 180) * s);
  } else {
    // white → red (203,67,53)
    const s = (t - 0.5) * 2;
    r = Math.round(255 + (203 - 255) * s);
    g = Math.round(255 + (67 - 255) * s);
    b = Math.round(255 + (53 - 255) * s);
  }
  return `rgb(${r},${g},${b})`;
}

/**
 * Sequential white-to-orange colormap.
 */
export function sequential(value, min, max) {
  if (max === min) return 'rgb(255,255,255)';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const r = Math.round(255 + (243 - 255) * t);
  const g = Math.round(255 + (156 - 255) * t);
  const b = Math.round(255 + (18 - 255) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Categorical palette — cycles through Tableau 10 colors.
 */
export function categorical(index) {
  return CATEGORICAL[index % CATEGORICAL.length];
}

/**
 * Single uniform color.
 */
export function uniform() {
  return '#5b9bd5';
}
