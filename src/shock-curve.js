/**
 * Shock curve computation — independent of drawn characteristics.
 *
 * For u_t + a(u) u_x = 0, u(x,0) = f(x), characteristic map:
 *   g(x₀, t) = x₀ + a(f(x₀)) · t
 *
 * Breaking time: t* = min { -1/[a'(f(x₀))·f'(x₀)] } where product < 0
 *
 * Shock position at time t: find s such that the equal-area rule holds
 * in the multi-valued region. Equivalently, step using R-H:
 *   ds/dt = [F(u_L) - F(u_R)] / [u_L - u_R]
 * where F(u) = ∫a(u)du.
 */

export function computeShockCurve(aFn, icFn, aDependsOnX, aDependsOnT, xRange, tRange) {
  if (aDependsOnX || aDependsOnT || !icFn) {
    return { tStar: null, x0Star: null, shockCurve: [] };
  }

  const h = 0.001;
  const tMax = tRange[1];
  const scanMin = xRange[0] - (xRange[1] - xRange[0]);
  const scanMax = xRange[1] + (xRange[1] - xRange[0]);

  function aPrime(u) {
    return (aFn({ u: u + h, x: 0, t: 0 }) - aFn({ u: u - h, x: 0, t: 0 })) / (2 * h);
  }

  function charMap(x0, t) {
    return x0 + aFn({ u: icFn(x0), x: 0, t: 0 }) * t;
  }

  function flux(u) {
    const M = 40;
    const du = u / M;
    let s = 0;
    for (let i = 0; i < M; i++) {
      s += (aFn({ u: i * du, x: 0, t: 0 }) + aFn({ u: (i + 1) * du, x: 0, t: 0 })) / 2 * du;
    }
    return s;
  }

  // 1. Find t*
  let tStar = Infinity;
  let x0Star = null;
  const N = 800;

  for (let i = 0; i <= N; i++) {
    const x0 = scanMin + (scanMax - scanMin) * i / N;
    const f0 = icFn(x0);
    const fPrime = (icFn(x0 + h) - icFn(x0 - h)) / (2 * h);
    const product = aPrime(f0) * fPrime;

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

  // 2. Trace shock curve from t* to tMax
  //    At each t, find the multi-valued region and apply R-H.
  const dt = 0.02;
  const shockCurve = [];

  // Initial shock position: at t = t*, the fold is just forming.
  // Start just after t* and find the shock by equal-area.
  let shockX = charMap(x0Star, tStar);
  shockCurve.push({ x: shockX, t: tStar });

  for (let t = tStar + dt; t <= tMax; t += dt) {
    // Find multi-valued region: where g(x0, t) is not monotonic
    // Scan g and find the fold boundaries
    const Ns = 600;
    let gPrev = charMap(scanMin, t);
    let foldLeft = null, foldRight = null;
    let foldXmin = Infinity, foldXmax = -Infinity;

    for (let i = 1; i <= Ns; i++) {
      const x0 = scanMin + (scanMax - scanMin) * i / Ns;
      const g = charMap(x0, t);
      if (g < gPrev && foldLeft === null) {
        // g started decreasing — fold begins
        foldLeft = scanMin + (scanMax - scanMin) * (i - 1) / Ns;
      }
      if (g < gPrev) {
        foldRight = x0;
      }
      foldXmin = Math.min(foldXmin, g);
      foldXmax = Math.max(foldXmax, g);
      gPrev = g;
    }

    if (foldLeft === null) {
      // No fold — shock has consumed all the wave
      break;
    }

    // The shock position s must be in [g(foldRight), g(foldLeft)]
    // i.e., in the range of x values where g is multi-valued.
    const gAtFoldLeft = charMap(foldLeft, t);
    const gAtFoldRight = charMap(foldRight, t);
    const sMin = Math.min(gAtFoldLeft, gAtFoldRight);
    const sMax = Math.max(gAtFoldLeft, gAtFoldRight);

    // Find all x0 roots of g(x0,t) = s for a candidate s
    // Then pick s so that R-H is satisfied.
    // Use the previous shock speed to estimate, then correct.

    // Find roots of g(x0,t) = shockX
    const roots = findRoots(x0 => charMap(x0, t) - shockX, scanMin, scanMax, 500);

    if (roots.length >= 2) {
      const uL = icFn(roots[0]);
      const uR = icFn(roots[roots.length - 1]);

      if (Math.abs(uL - uR) > 1e-8) {
        const speed = (flux(uL) - flux(uR)) / (uL - uR);
        shockX += speed * dt;
      } else {
        shockX += aFn({ u: uL, x: 0, t: 0 }) * dt;
      }
    } else if (roots.length === 1) {
      // Shock has moved outside the multi-valued region at this position.
      // Nudge shockX toward the fold center and retry.
      const foldCenter = (sMin + sMax) / 2;
      shockX = foldCenter;
      const roots2 = findRoots(x0 => charMap(x0, t) - shockX, scanMin, scanMax, 500);
      if (roots2.length >= 2) {
        const uL = icFn(roots2[0]);
        const uR = icFn(roots2[roots2.length - 1]);
        if (Math.abs(uL - uR) > 1e-8) {
          const speed = (flux(uL) - flux(uR)) / (uL - uR);
          shockX += speed * dt;
        }
      }
    } else {
      break;
    }

    shockCurve.push({ x: shockX, t });
  }

  return { tStar, x0Star, shockCurve };
}

function findRoots(f, a, b, N) {
  const roots = [];
  let fPrev = f(a);
  for (let i = 1; i <= N; i++) {
    const x = a + (b - a) * i / N;
    const fx = f(x);
    if (fPrev * fx <= 0) {
      let lo = a + (b - a) * (i - 1) / N, hi = x, flo = fPrev;
      for (let j = 0; j < 30; j++) {
        const mid = (lo + hi) / 2;
        const fm = f(mid);
        if (fm * flo <= 0) hi = mid;
        else { lo = mid; flo = fm; }
      }
      roots.push((lo + hi) / 2);
    }
    fPrev = fx;
  }
  return roots;
}
