/**
 * Shock curve + caustic computation via ODE stepping.
 *
 * For u_t + a(u) u_x = 0, u(x,0) = f(x):
 *
 * Breaking time: t* = min { -1/[a'(f(x₀))·f'(x₀)] } where product < 0
 *
 * From t* onward, three curves emanate from the cusp:
 *   - Left caustic:  rides characteristic x₀^max(t), position x_left(t)
 *   - Right caustic: rides characteristic x₀^min(t), position x_right(t)
 *   - Shock curve:   position s(t) via Rankine-Hugoniot
 *
 * The caustic seeds satisfy the ODE:
 *   dx₀/dt = 1 / [t² · Q(x₀)]
 *   where Q(x₀) = a''(f(x₀))·f'(x₀)² + a'(f(x₀))·f''(x₀)
 *
 * The three x-positions satisfy:
 *   dx_left/dt  = a(f(x₀^max))
 *   dx_right/dt = a(f(x₀^min))
 *   ds/dt       = [F(u_L) - F(u_R)] / [u_L - u_R]
 *
 * where u_L = f(x₀^max), u_R = f(x₀^min), F(u) = ∫a(u)du.
 *
 * Total: 5 scalar updates per timestep. No root-finding, no scanning.
 * Precomputed and cached — independent of zoom, num characteristics, viewport.
 */

const H = 0.001; // finite difference step

/**
 * @param {Function} aFn - (scope) => number
 * @param {Function} icFn - (x) => number, initial data f(x)
 * @param {boolean} aDependsOnX
 * @param {boolean} aDependsOnT
 * @param {number[]} xRange
 * @param {number[]} tRange
 * @returns {{ tStar, x0Star, shockCurve, leftCaustic, rightCaustic }}
 */
export function computeShockCurve(aFn, icFn, aDependsOnX, aDependsOnT, xRange, tRange) {
  const empty = { tStar: null, x0Star: null, shockCurve: [], leftCaustic: [], rightCaustic: [] };

  if (aDependsOnX || aDependsOnT || !icFn) return empty;

  // ── Helper functions (evaluate once, reuse) ──

  function a(u) { return aFn({ u, x: 0, t: 0 }); }
  function aPrime(u) { return (a(u + H) - a(u - H)) / (2 * H); }
  function aDoublePrime(u) { return (a(u + H) - 2 * a(u) + a(u - H)) / (H * H); }
  function f(x) { return icFn(x); }
  function fPrime(x) { return (f(x + H) - f(x - H)) / (2 * H); }
  function fDoublePrime(x) { return (f(x + H) - 2 * f(x) + f(x - H)) / (H * H); }

  // Q(x₀) = a''(f(x₀))·f'(x₀)² + a'(f(x₀))·f''(x₀)
  function Q(x0) {
    const f0 = f(x0);
    const fp = fPrime(x0);
    const fpp = fDoublePrime(x0);
    return aDoublePrime(f0) * fp * fp + aPrime(f0) * fpp;
  }

  // Flux: F(u) = ∫₀ᵘ a(s)ds (trapezoidal, cached for common values)
  const fluxCache = new Map();
  function flux(u) {
    // Round to avoid floating-point cache misses
    const key = Math.round(u * 10000);
    if (fluxCache.has(key)) return fluxCache.get(key);
    const M = 40;
    const du = u / M;
    let s = 0;
    for (let i = 0; i < M; i++) {
      s += (a(i * du) + a((i + 1) * du)) / 2 * du;
    }
    fluxCache.set(key, s);
    return s;
  }

  // ── Step 1: Find t* ──

  const scanMin = xRange[0] - (xRange[1] - xRange[0]);
  const scanMax = xRange[1] + (xRange[1] - xRange[0]);
  const N = 800;

  let tStar = Infinity;
  let x0Star = null;

  for (let i = 0; i <= N; i++) {
    const x0 = scanMin + (scanMax - scanMin) * i / N;
    const product = aPrime(f(x0)) * fPrime(x0);
    if (product < -1e-10) {
      const tBreak = -1 / product;
      if (tBreak > 0 && tBreak < tStar) {
        tStar = tBreak;
        x0Star = x0;
      }
    }
  }

  // Refine x0Star with golden section search
  if (isFinite(tStar) && x0Star !== null) {
    const refineW = (scanMax - scanMin) / N * 2;
    let lo = x0Star - refineW, hi = x0Star + refineW;
    for (let iter = 0; iter < 30; iter++) {
      const m1 = lo + (hi - lo) * 0.382;
      const m2 = lo + (hi - lo) * 0.618;
      const p1 = aPrime(f(m1)) * fPrime(m1);
      const p2 = aPrime(f(m2)) * fPrime(m2);
      const t1 = p1 < -1e-10 ? -1 / p1 : Infinity;
      const t2 = p2 < -1e-10 ? -1 / p2 : Infinity;
      if (t1 < t2) hi = m2; else lo = m1;
    }
    x0Star = (lo + hi) / 2;
    const pStar = aPrime(f(x0Star)) * fPrime(x0Star);
    if (pStar < -1e-10) tStar = -1 / pStar;
  }

  if (!isFinite(tStar) || tStar > tRange[1] * 2) return empty;

  // ── Step 2: Seed the caustics ──
  // At t = t*, Q(x0Star) ≈ 0. Use the local expansion:
  // ε ~ √(2(t-t*) / (t*² · Q'(x0Star)))
  // Q'(x0Star) computed numerically:

  const QPrime = (Q(x0Star + H) - Q(x0Star - H)) / (2 * H);
  const cuspX = x0Star + a(f(x0Star)) * tStar;

  // If Q' is too small or wrong sign, fall back
  if (Math.abs(QPrime) < 1e-12) return { tStar, x0Star, shockCurve: [{ x: cuspX, t: tStar }], leftCaustic: [], rightCaustic: [] };

  // Initial seed separation using the √(t-t*) expansion
  const dt = 0.02;
  const eps0 = Math.sqrt(Math.abs(2 * dt / (tStar * tStar * QPrime)));

  let x0L = x0Star - eps0;  // left caustic seed (drifts toward smaller x₀, higher u)
  let x0R = x0Star + eps0;  // right caustic seed (drifts toward larger x₀, lower u)

  // Verify seeds are on correct sides
  if (Q(x0L) > 0) x0L = x0Star - eps0 * 0.1;
  if (Q(x0R) > 0) x0R = x0Star + eps0 * 0.1;

  // ── Step 3: ODE stepping ──

  const shockCurve = [{ x: cuspX, t: tStar }];
  const leftCaustic = [{ x: cuspX, t: tStar }];
  const rightCaustic = [{ x: cuspX, t: tStar }];

  let xLeft = cuspX;
  let xRight = cuspX;
  let shockX = cuspX;

  const tMax = tRange[1];

  for (let t = tStar + dt; t <= tMax; t += dt) {
    // Step caustic seeds
    const qL = Q(x0L);
    const qR = Q(x0R);

    // Guard against Q = 0 (inflection point of f)
    if (Math.abs(qL) < 1e-12 || Math.abs(qR) < 1e-12) break;

    const dx0L = dt / (t * t * qL);
    const dx0R = dt / (t * t * qR);

    x0L += dx0L;
    x0R += dx0R;

    // Guard against seeds diverging too far
    if (x0L < scanMin || x0R > scanMax) break;
    if (!isFinite(x0L) || !isFinite(x0R)) break;

    // Get u values
    const uL = f(x0L);
    const uR = f(x0R);

    // Step caustic positions
    xLeft += a(uL) * dt;
    xRight += a(uR) * dt;

    // Step shock position via Rankine-Hugoniot
    const jump = uL - uR;
    if (Math.abs(jump) > 1e-10) {
      const shockSpeed = (flux(uL) - flux(uR)) / jump;
      shockX += shockSpeed * dt;
    } else {
      // L'Hôpital: when u_L ≈ u_R, shock speed → a(u)
      shockX += a((uL + uR) / 2) * dt;
    }

    shockCurve.push({ x: shockX, t });
    leftCaustic.push({ x: xLeft, t });
    rightCaustic.push({ x: xRight, t });
  }

  return { tStar, x0Star, shockCurve, leftCaustic, rightCaustic };
}
