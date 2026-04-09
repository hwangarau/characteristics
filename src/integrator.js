/**
 * RK4 ODE integrator for tracing characteristic curves.
 *
 * The system is:
 *   dx/dt = a(u, x, t)
 *   du/dt = b(u, x, t)
 *
 * with initial conditions (x0, t0, u0).
 */

/**
 * @typedef {Object} CharPoint
 * @property {number} x
 * @property {number} t
 * @property {number} u
 */

/**
 * @typedef {Object} Characteristic
 * @property {CharPoint[]} points - ordered by t
 * @property {number} x0 - launch x
 * @property {number} t0 - launch t
 * @property {number} u0 - launch u (NaN if no initial data)
 */

/**
 * One RK4 step for the coupled (x, u) system.
 */
function rk4Step(a, b, x, u, t, h) {
  const k1x = a(u, x, t);
  const k1u = b(u, x, t);

  const k2x = a(u + h / 2 * k1u, x + h / 2 * k1x, t + h / 2);
  const k2u = b(u + h / 2 * k1u, x + h / 2 * k1x, t + h / 2);

  const k3x = a(u + h / 2 * k2u, x + h / 2 * k2x, t + h / 2);
  const k3u = b(u + h / 2 * k2u, x + h / 2 * k2x, t + h / 2);

  const k4x = a(u + h * k3u, x + h * k3x, t + h);
  const k4u = b(u + h * k3u, x + h * k3x, t + h);

  return {
    x: x + h / 6 * (k1x + 2 * k2x + 2 * k3x + k4x),
    u: u + h / 6 * (k1u + 2 * k2u + 2 * k3u + k4u),
  };
}

/**
 * Trace a single characteristic from (x0, t0) with initial value u0.
 * Integrates forward in time from t0 to tMax.
 *
 * @param {Function} aFn - (u, x, t) => number
 * @param {Function} bFn - (u, x, t) => number
 * @param {number} x0
 * @param {number} t0
 * @param {number} u0 - use NaN if no initial data (only works if a doesn't depend on u)
 * @param {number} dt
 * @param {number} tMax
 * @param {number} xBound - terminate if |x| exceeds this
 * @returns {Characteristic}
 */
function traceSingle(aFn, bFn, x0, t0, u0, dt, tMax, xBound) {
  const points = [{ x: x0, t: t0, u: u0 }];

  let x = x0;
  let u = u0;
  let t = t0;

  // Wrap a/b to handle NaN u (portrait mode — a shouldn't depend on u)
  const a = (uv, xv, tv) => {
    const scope = { u: uv, x: xv, t: tv };
    return aFn(scope);
  };
  const b = (uv, xv, tv) => {
    const scope = { u: uv, x: xv, t: tv };
    return bFn(scope);
  };

  const maxSteps = Math.ceil((tMax - t0) / dt) + 1;

  for (let i = 0; i < maxSteps; i++) {
    const h = Math.min(dt, tMax - t);
    if (h <= 0) break;

    const next = rk4Step(a, b, x, u, t, h);
    x = next.x;
    u = next.u;
    t = t + h;

    // Termination checks
    if (!isFinite(x) || !isFinite(u) || Math.abs(x) > xBound || Math.abs(u) > 1e6) {
      break;
    }

    points.push({ x, t, u });
  }

  return { points, x0, t0, u0 };
}

/**
 * Generate seed points for characteristic tracing.
 *
 * @param {Object} opts
 * @param {Function|null} opts.initialDataFn - f(x) → u0, or null for portrait mode
 * @param {boolean} opts.aDepends_u - whether a depends on u
 * @param {number} opts.numCurves
 * @param {number[]} opts.xRange - [xMin, xMax]
 * @param {number[]} opts.tRange - [tMin, tMax]
 * @returns {{ seeds: Array<{x0: number, t0: number, u0: number}>, warning: string|null }}
 */
function generateSeeds(opts) {
  const { initialDataFn, aDepends_u, numCurves, xRange, tRange } = opts;
  const [xMin, xMax] = xRange;
  const seeds = [];
  let warning = null;

  if (initialDataFn) {
    // Launch from t = tMin along x-axis
    for (let i = 0; i < numCurves; i++) {
      const x = xMin + (xMax - xMin) * i / (numCurves - 1);
      const u0 = initialDataFn(x);
      seeds.push({ x0: x, t0: tRange[0], u0 });
    }
  } else {
    // Portrait mode — no initial data
    if (aDepends_u) {
      warning = 'Quasilinear equation (a depends on u) requires initial data to trace characteristics.';
    }

    // Seed from x-axis
    for (let i = 0; i < numCurves; i++) {
      const x = xMin + (xMax - xMin) * i / (numCurves - 1);
      seeds.push({ x0: x, t0: tRange[0], u0: 0 });
    }
  }

  return { seeds, warning };
}

/**
 * Trace all characteristics.
 *
 * @param {Object} opts
 * @param {Function} opts.aFn - compiled evaluator (scope) => number
 * @param {Function} opts.bFn - compiled evaluator (scope) => number
 * @param {Function|null} opts.initialDataFn
 * @param {boolean} opts.aDepends_u
 * @param {number} opts.numCurves
 * @param {number[]} opts.xRange
 * @param {number[]} opts.tRange
 * @param {number} opts.dt
 * @returns {{ characteristics: Characteristic[], shocks: Array<{x: number, t: number}>, warning: string|null }}
 */
export function traceCharacteristics(opts) {
  const { aFn, bFn, initialDataFn, aDepends_u, numCurves, xRange, tRange, dt } = opts;

  const { seeds, warning } = generateSeeds({
    initialDataFn, aDepends_u, numCurves, xRange, tRange,
  });

  const xBound = 2 * (xRange[1] - xRange[0]);

  const characteristics = seeds.map(seed =>
    traceSingle(aFn, bFn, seed.x0, seed.t0, seed.u0, dt, tRange[1], xBound)
  );

  // Shock detection: find ALL crossings between adjacent characteristics
  const shocks = detectShocks(characteristics);

  return { characteristics, shocks, warning };
}

/**
 * Produce a "resolved" copy of characteristics: each curve is truncated
 * at the earliest shock time that affects it. Returns the truncated curves
 * plus the shock curve (points connected in order of increasing t).
 *
 * @param {Characteristic[]} chars - original characteristics
 * @param {Array<{x: number, t: number, i: number, j: number}>} shocks - crossing points
 * @returns {{ resolved: Characteristic[], shockCurve: Array<{x: number, t: number}> }}
 */
export function resolveShocks(chars, shocks) {
  if (!shocks.length) return { resolved: chars, shockCurve: [] };

  // For each characteristic, find the earliest shock time that involves it
  const sorted = [...chars].sort((a, b) => a.x0 - b.x0);
  const truncateTime = new Map(); // charIndex → earliest shock t

  for (const s of shocks) {
    // s.i and s.j are indices into the sorted array
    const ci = sorted[s.i];
    const cj = sorted[s.j];

    for (const c of [ci, cj]) {
      const key = c;
      const existing = truncateTime.get(key);
      if (existing === undefined || s.t < existing) {
        truncateTime.set(key, s.t);
      }
    }
  }

  // Truncate each characteristic at its shock time
  const resolved = sorted.map(char => {
    const cutoff = truncateTime.get(char);
    if (cutoff === undefined) return char;

    const truncated = [];
    for (const p of char.points) {
      if (p.t > cutoff) break;
      truncated.push(p);
    }

    return { ...char, points: truncated };
  });

  // Build shock curve: sort shock points by t, then connect
  const shockCurve = [...shocks]
    .sort((a, b) => a.t - b.t)
    .map(s => ({ x: s.x, t: s.t }));

  return { resolved, shockCurve };
}

/**
 * Detect ALL crossings between adjacent characteristics (sorted by x0).
 * Returns crossing points with indices of the involved curves.
 */
function detectShocks(chars) {
  if (chars.length < 2) return [];

  const sorted = [...chars].sort((a, b) => a.x0 - b.x0);
  const shocks = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const c1 = sorted[i].points;
    const c2 = sorted[i + 1].points;
    const len = Math.min(c1.length, c2.length);

    for (let k = 0; k < len - 1; k++) {
      const diff_k = c1[k].x - c2[k].x;
      const diff_k1 = c1[k + 1].x - c2[k + 1].x;

      if (diff_k * diff_k1 < 0) {
        const alpha = diff_k / (diff_k - diff_k1);
        const tCross = c1[k].t + alpha * (c1[k + 1].t - c1[k].t);
        const xCross = c1[k].x + alpha * (c1[k + 1].x - c1[k].x);
        shocks.push({ x: xCross, t: tCross, i, j: i + 1 });
        // Don't break — find ALL crossings for this pair
      }
    }
  }

  return shocks;
}
