/**
 * Shock curve computation — independent of drawn characteristics.
 *
 * For u_t + a(u) u_x = 0 with u(x,0) = f(x):
 *
 * 1. Breaking condition: characteristics cross when
 *      ∂x/∂x₀ = 1 + a'(f(x₀)) · f'(x₀) · t = 0
 *    so t*(x₀) = -1 / [a'(f(x₀)) · f'(x₀)]
 *    Breaking time: t* = min over x₀ where a'(f)·f' < 0
 *
 * 2. From t* onward, shock position s(t) evolves by Rankine-Hugoniot:
 *      ds/dt = [F(u_L) - F(u_R)] / [u_L - u_R]
 *    where F(u) = ∫a(u) du is the flux.
 *
 * 3. u_L and u_R are found by solving x₀ + a(f(x₀))·t = s(t) for x₀
 *    on either side of the shock.
 */

/**
 * Compute the breaking time and shock curve.
 *
 * @param {Function} aFn - (scope) => number, the characteristic speed a(u,x,t)
 * @param {Function} icFn - (x) => number, initial data f(x)
 * @param {boolean} aDependsOnX - if a depends on x, we can't do the simple analysis
 * @param {boolean} aDependsOnT - if a depends on t, we can't do the simple analysis
 * @param {number[]} xRange - seed range for scanning
 * @param {number[]} tRange - time range
 * @returns {{ tStar: number|null, x0Star: number|null, shockCurve: Array<{x: number, t: number}> }}
 */
export function computeShockCurve(aFn, icFn, aDependsOnX, aDependsOnT, xRange, tRange) {
  // Only works for autonomous a(u) — if a depends on x or t, skip
  if (aDependsOnX || aDependsOnT || !icFn) {
    return { tStar: null, x0Star: null, shockCurve: [] };
  }

  const [xMin, xMax] = xRange;
  const tMax = tRange[1];
  const h = 0.001; // for numerical differentiation
  const N = 500;   // sample points for scanning

  // Numerically compute a'(u) at a given u
  function aPrime(u) {
    const uPlus = aFn({ u: u + h, x: 0, t: 0 });
    const uMinus = aFn({ u: u - h, x: 0, t: 0 });
    return (uPlus - uMinus) / (2 * h);
  }

  // Scan for breaking time: t*(x₀) = -1 / [a'(f(x₀)) · f'(x₀)]
  let tStar = Infinity;
  let x0Star = null;

  // Extend scan range beyond viewport to catch shocks that start outside view
  const scanMin = xMin - (xMax - xMin) * 0.5;
  const scanMax = xMax + (xMax - xMin) * 0.5;

  for (let i = 0; i <= N; i++) {
    const x0 = scanMin + (scanMax - scanMin) * i / N;
    const f0 = icFn(x0);

    // f'(x₀) numerically
    const fPrime = (icFn(x0 + h) - icFn(x0 - h)) / (2 * h);

    // a'(f(x₀))
    const aPrimeVal = aPrime(f0);

    const product = aPrimeVal * fPrime;

    if (product < -1e-10) {
      const tBreak = -1 / product;
      if (tBreak > 0 && tBreak < tStar) {
        tStar = tBreak;
        x0Star = x0;
      }
    }
  }

  if (!isFinite(tStar) || tStar > tMax * 2) {
    return { tStar: null, x0Star: null, shockCurve: [] };
  }

  // Shock position at t*
  const f0Star = icFn(x0Star);
  const aAtStar = aFn({ u: f0Star, x: 0, t: 0 });
  let shockX = x0Star + aAtStar * tStar;

  // Trace shock curve forward from t* using Rankine-Hugoniot
  const shockCurve = [{ x: shockX, t: tStar }];
  const dt = 0.01;

  for (let t = tStar + dt; t <= tMax; t += dt) {
    // Find u_L and u_R: solve x₀ + a(f(x₀))·t = shockX for x₀
    // u_L comes from the left (larger u for Burgers-type)
    // u_R comes from the right (smaller u)
    const { uL, uR } = findShockStates(aFn, icFn, shockX, t, scanMin, scanMax);

    if (uL === null || uR === null || Math.abs(uL - uR) < 1e-10) break;

    // Rankine-Hugoniot: ds/dt = [F(u_L) - F(u_R)] / [u_L - u_R]
    // where F(u) = ∫a(u) du is the flux
    // For general a(u), approximate F using the trapezoidal rule
    const fluxL = numericalFlux(aFn, uL);
    const fluxR = numericalFlux(aFn, uR);
    const shockSpeed = (fluxL - fluxR) / (uL - uR);

    shockX += shockSpeed * dt;
    shockCurve.push({ x: shockX, t });
  }

  return { tStar, x0Star, shockCurve };
}

/**
 * Find u_L and u_R on either side of the shock at position (shockX, t).
 * Solve x₀ + a(f(x₀))·t = shockX for x₀, finding the leftmost and rightmost roots.
 */
function findShockStates(aFn, icFn, shockX, t, scanMin, scanMax) {
  const N = 300;
  const roots = [];

  for (let i = 0; i < N; i++) {
    const x0a = scanMin + (scanMax - scanMin) * i / N;
    const x0b = scanMin + (scanMax - scanMin) * (i + 1) / N;

    const fa = x0a + aFn({ u: icFn(x0a), x: 0, t: 0 }) * t - shockX;
    const fb = x0b + aFn({ u: icFn(x0b), x: 0, t: 0 }) * t - shockX;

    if (fa * fb <= 0) {
      // Bisect to find root
      let lo = x0a, hi = x0b;
      for (let j = 0; j < 20; j++) {
        const mid = (lo + hi) / 2;
        const fmid = mid + aFn({ u: icFn(mid), x: 0, t: 0 }) * t - shockX;
        if (fmid * fa <= 0) hi = mid;
        else lo = mid;
      }
      roots.push((lo + hi) / 2);
    }
  }

  if (roots.length < 2) return { uL: null, uR: null };

  // u_L from the leftmost root (usually the larger u), u_R from the rightmost
  const uL = icFn(roots[0]);
  const uR = icFn(roots[roots.length - 1]);

  return { uL, uR };
}

/**
 * Numerical flux F(u) = ∫₀ᵘ a(s) ds, approximated by trapezoidal rule.
 */
function numericalFlux(aFn, u) {
  const N = 50;
  const du = u / N;
  let sum = 0;

  for (let i = 0; i < N; i++) {
    const s0 = i * du;
    const s1 = (i + 1) * du;
    const a0 = aFn({ u: s0, x: 0, t: 0 });
    const a1 = aFn({ u: s1, x: 0, t: 0 });
    sum += (a0 + a1) / 2 * du;
  }

  return sum;
}
