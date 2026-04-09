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
function traceSingle(aFn, bFn, x0, t0, u0, dt, tMax, xBound, domainLeft = -Infinity, domainRight = Infinity) {
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

    // Termination checks — including domain boundaries
    if (!isFinite(x) || !isFinite(u) || Math.abs(x) > xBound || Math.abs(u) > 1e6
        || x < domainLeft || x > domainRight) {
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
  const { initialDataFn, aDepends_u, numCurves, xRange, tRange,
          domainType, domainA, domainB } = opts;

  // Seed range: use domain bounds if bounded, else viewport
  let seedMin = xRange[0], seedMax = xRange[1];
  if (domainType === 'a-inf' || domainType === 'a-b') seedMin = Math.max(seedMin, domainA);
  if (domainType === 'inf-b' || domainType === 'a-b') seedMax = Math.min(seedMax, domainB);

  const seeds = [];
  let warning = null;

  if (initialDataFn) {
    for (let i = 0; i < numCurves; i++) {
      const x = seedMin + (seedMax - seedMin) * i / (numCurves - 1);
      const u0 = initialDataFn(x);
      seeds.push({ x0: x, t0: tRange[0], u0 });
    }
  } else {
    if (aDepends_u) {
      warning = 'Quasilinear equation (a depends on u) requires initial data to trace characteristics.';
    }
    for (let i = 0; i < numCurves; i++) {
      const x = seedMin + (seedMax - seedMin) * i / (numCurves - 1);
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
  const { aFn, bFn, initialDataFn, aDepends_u, numCurves, xRange, tRange, dt,
          domainType, domainA, domainB } = opts;

  const { seeds, warning } = generateSeeds({
    initialDataFn, aDepends_u, numCurves, xRange, tRange,
    domainType, domainA, domainB,
  });

  // Domain bounds for termination
  let domainLeft = -Infinity, domainRight = Infinity;
  if (domainType === 'a-inf' || domainType === 'a-b') domainLeft = domainA;
  if (domainType === 'inf-b' || domainType === 'a-b') domainRight = domainB;

  const xBound = domainRight < Infinity && domainLeft > -Infinity
    ? Math.max(Math.abs(domainLeft), Math.abs(domainRight)) * 3
    : 2 * (xRange[1] - xRange[0]);

  const characteristics = seeds.map(seed =>
    traceSingle(aFn, bFn, seed.x0, seed.t0, seed.u0, dt, tRange[1], xBound, domainLeft, domainRight)
  );

  // Shock detection: find ALL crossings between adjacent characteristics
  const shocks = detectShocks(characteristics);

  return { characteristics, shocks, warning };
}

/**
 * Resolve shocks: for each characteristic, find the earliest time it
 * crosses any other characteristic, and truncate it there.
 *
 * Algorithm: at each time step k, sort all curves by their x-position.
 * If any pair swaps order between step k and k+1, they've crossed.
 * Record the crossing time for both curves.
 */
export function resolveShocks(chars, _shocks) {
  if (chars.length < 2) return { resolved: chars, shockCurve: [] };

  // Find earliest crossing time per characteristic
  const cutoffTime = new Array(chars.length).fill(Infinity);
  const allCrossings = [];

  // Find the minimum number of points across all curves
  const minLen = Math.min(...chars.map(c => c.points.length));
  if (minLen < 2) return { resolved: chars, shockCurve: [] };

  // At each time step, check all pairs for crossing
  // We use the initial x0 ordering and track swaps
  const indices = chars.map((_, i) => i);
  indices.sort((a, b) => chars[a].x0 - chars[b].x0);

  for (let k = 0; k < minLen - 1; k++) {
    for (let ii = 0; ii < indices.length - 1; ii++) {
      const a = indices[ii];
      const b = indices[ii + 1];

      const ptsA = chars[a].points;
      const ptsB = chars[b].points;
      if (k >= ptsA.length - 1 || k >= ptsB.length - 1) continue;

      const diffK = ptsA[k].x - ptsB[k].x;
      const diffK1 = ptsA[k + 1].x - ptsB[k + 1].x;

      if (diffK * diffK1 < 0) {
        // Crossing detected
        const alpha = diffK / (diffK - diffK1);
        const tCross = ptsA[k].t + alpha * (ptsA[k + 1].t - ptsA[k].t);
        const xCross = ptsA[k].x + alpha * (ptsA[k + 1].x - ptsA[k].x);

        cutoffTime[a] = Math.min(cutoffTime[a], tCross);
        cutoffTime[b] = Math.min(cutoffTime[b], tCross);
        allCrossings.push({ x: xCross, t: tCross });
      }
    }
  }

  // Truncate each characteristic at its cutoff time
  const resolved = chars.map((char, i) => {
    if (cutoffTime[i] === Infinity) return char;

    const truncated = [];
    for (const p of char.points) {
      if (p.t > cutoffTime[i]) break;
      truncated.push(p);
    }

    return { ...char, points: truncated };
  });

  return { resolved, shockCurve: [] };
}

/**
 * Detect crossings between adjacent characteristics (sorted by x0).
 * Returns crossing points for display as dots.
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
        shocks.push({ x: xCross, t: tCross });
      }
    }
  }

  return shocks;
}
