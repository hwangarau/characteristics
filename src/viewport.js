/**
 * Compute a sensible default viewport from the equation and initial data.
 *
 * Strategy:
 * 1. Find the "active region" of f(x) — where |f| is significant
 * 2. Compute characteristic speeds at sample points
 * 3. Estimate how far characteristics travel by a reasonable tMax
 * 4. If shocks exist, set tMax to ~2*t* so the shock is visible but not dominant
 * 5. Add margins and round to nice numbers
 */

const H = 0.001;

/**
 * @param {Function} aFn - (scope) => number
 * @param {Function|null} icFn - (x) => number
 * @param {boolean} aDependsU
 * @returns {{ xRange: [number, number], tRange: [number, number] }}
 */
export function computeViewport(aFn, icFn, aDependsU) {
  if (!icFn) {
    // No initial data — use a generic viewport
    return { xRange: [-5, 5], tRange: [0, 4] };
  }

  // 1. Find where f(x) is significant
  // Sample f over a wide range to find its support
  const scanN = 200;
  const scanRange = 20; // scan [-20, 20]
  let fMax = 0;
  const samples = [];

  for (let i = 0; i <= scanN; i++) {
    const x = -scanRange + 2 * scanRange * i / scanN;
    const fv = Math.abs(icFn(x));
    if (isFinite(fv)) {
      fMax = Math.max(fMax, fv);
      samples.push({ x, f: icFn(x), absF: fv });
    }
  }

  if (fMax < 1e-10) {
    // f is essentially zero everywhere
    return { xRange: [-5, 5], tRange: [0, 4] };
  }

  // Support: where |f| > 1% of max
  const threshold = fMax * 0.01;
  const support = samples.filter(s => s.absF > threshold);
  let xLeft = support.length ? support[0].x : -5;
  let xRight = support.length ? support[support.length - 1].x : 5;

  // Ensure minimum width
  if (xRight - xLeft < 2) {
    const center = (xLeft + xRight) / 2;
    xLeft = center - 1;
    xRight = center + 1;
  }

  // 2. Compute characteristic speeds
  let speedMin = 0, speedMax = 0;

  for (const s of support) {
    let speed;
    if (aDependsU) {
      speed = aFn({ u: s.f, x: s.x, t: 0 });
    } else {
      speed = aFn({ u: 0, x: s.x, t: 0 });
    }
    if (isFinite(speed)) {
      speedMin = Math.min(speedMin, speed);
      speedMax = Math.max(speedMax, speed);
    }
  }

  const maxSpeed = Math.max(Math.abs(speedMin), Math.abs(speedMax), 0.5);

  // 3. Estimate breaking time for quasilinear equations
  let tStar = Infinity;
  if (aDependsU) {
    for (let i = 0; i <= scanN; i++) {
      const x0 = xLeft + (xRight - xLeft) * i / scanN;
      const f0 = icFn(x0);
      const fPrime = (icFn(x0 + H) - icFn(x0 - H)) / (2 * H);
      const aPrime = (aFn({ u: f0 + H, x: 0, t: 0 }) - aFn({ u: f0 - H, x: 0, t: 0 })) / (2 * H);
      const product = aPrime * fPrime;
      if (product < -1e-10) {
        tStar = Math.min(tStar, -1 / product);
      }
    }
  }

  // 4. Choose tMax
  let tMax;
  if (isFinite(tStar) && tStar > 0) {
    // Show a bit past the shock
    tMax = tStar * 2.5;
  } else {
    // No shock — show enough time for characteristics to traverse the support
    const supportWidth = xRight - xLeft;
    tMax = Math.max(2, supportWidth / maxSpeed * 1.5);
  }

  // Cap tMax at something reasonable
  tMax = Math.min(tMax, 20);
  tMax = Math.max(tMax, 1);

  // 5. Compute x range: support + where characteristics reach by tMax
  const xReachRight = xRight + Math.max(0, speedMax) * tMax;
  const xReachLeft = xLeft + Math.min(0, speedMin) * tMax;

  // Add 15% margins
  const xWidth = xReachRight - xReachLeft;
  const xMargin = xWidth * 0.15;
  let xMin = xReachLeft - xMargin;
  let xMax = xReachRight + xMargin;

  // Round to nice numbers
  xMin = niceFloor(xMin);
  xMax = niceCeil(xMax);
  tMax = niceCeil(tMax);

  return { xRange: [xMin, xMax], tRange: [0, tMax] };
}

function niceFloor(x) {
  if (Math.abs(x) < 1) return Math.floor(x * 2) / 2;
  return Math.floor(x);
}

function niceCeil(x) {
  if (Math.abs(x) < 1) return Math.ceil(x * 2) / 2;
  return Math.ceil(x);
}
