/**
 * Symbolic ODE solver for characteristic equations using Nerdamer.
 *
 * For linear ODEs, uses Laplace transforms:
 *   dy/dt = f(t)  →  y = y₀ + ∫f dt
 *   dy/dt = c·y   →  y = y₀·e^{ct}       (via Laplace)
 *   dy/dt = c·y + g(t) → Laplace method
 *
 * Falls back to direct integration when Laplace has issues.
 * Returns "Numerical solution only" for anything it can't handle.
 */

// Lazy-load nerdamer so a failure doesn't crash the whole app
let nerdamer = null;
let nerdamerReady = false;

async function ensureNerdamer() {
  if (nerdamerReady) return;
  try {
    const mod = await import('nerdamer');
    nerdamer = mod.default || mod;
    await import('nerdamer/Solve');
    await import('nerdamer/Calculus');
    await import('nerdamer/Extra');
    nerdamerReady = true;
  } catch (e) {
    console.warn('Nerdamer failed to load:', e);
    nerdamerReady = false;
  }
}

/**
 * Check if an expression contains a variable as a free symbol.
 */
function containsVar(expr, v) {
  const masked = expr
    .replace(/\bexp\b/g, '_EXP_')
    .replace(/\bsqrt\b/g, '_SQRT_')
    .replace(/\bstep\b/g, '_STEP_')
    .replace(/\bheaviside\b/g, '_HEAV_');
  return new RegExp(`(?<![a-zA-Z_])${v}(?![a-zA-Z0-9_])`).test(masked);
}

/**
 * Clean nerdamer LaTeX for KaTeX display.
 */
function cleanTex(tex) {
  return tex
    .replace(/\\cdot\s?/g, '\\,')
    .replace(/\\left\(/g, '(')
    .replace(/\\right\)/g, ')')
    .replace(/\bx0\b/g, 'x_0')
    .replace(/\bu0\b/g, 'u_0')
    .replace(/\\mathrm\{(\w+)\}/g, '\\$1');  // \mathrm{cos} → \cos
}

/**
 * Solve a first-order linear ODE dy/dt = rhs(y, t).
 *
 * @param {string} rhs - right-hand side expression
 * @param {string} yVar - variable name ('x' or 'u')
 * @param {string} y0 - initial value symbol ('x_0' or 'u_0')
 * @returns {{ latex: string, raw: string } | null}
 */
function solveLinearODE(rhs, yVar, y0) {
  const dependsOnY = containsVar(rhs, yVar);

  try {
    if (!dependsOnY) {
      // dy/dt = f(t) → y = y₀ + ∫f(t) dt
      // Use direct integration — more robust than Laplace for this case
      const integral = nerdamer(`integrate(${rhs}, t)`);
      const raw = `${y0} + ${integral.toString()}`;
      const tex = cleanTex(nerdamer(raw).toTeX());
      return {
        latex: `${yVar}(t) = ${tex}`,
        raw,
      };
    }

    // Extract linear coefficient: rhs = coeff * y + remainder
    const re = new RegExp(`(?<![a-zA-Z_])${yVar}(?![a-zA-Z0-9_])`, 'g');
    const atZeroStr = rhs.replace(re, '(0)');
    const atOneStr = rhs.replace(re, '(1)');

    const atZero = nerdamer(atZeroStr);
    const atOne = nerdamer(atOneStr);
    const coeff = nerdamer(`${atOne.toString()} - (${atZero.toString()})`);

    const coeffStr = coeff.toString();
    const remStr = atZero.toString();

    // Reject variable-coefficient case
    if (containsVar(coeffStr, 't')) return null;

    if (remStr === '0') {
      // dy/dt = c·y  →  y = y₀ · e^{ct}
      try {
        const Ys = nerdamer(`${y0}/(s-(${coeffStr}))`);
        const yt = nerdamer(`ilt(${Ys.toString()}, s, t)`);
        return {
          latex: `${yVar}(t) = ${cleanTex(yt.toTeX())}`,
          raw: yt.toString(),
        };
      } catch {
        // Fallback: construct manually
        const raw = `${y0}*e^((${coeffStr})*t)`;
        const tex = cleanTex(nerdamer(raw).toTeX());
        return { latex: `${yVar}(t) = ${tex}`, raw };
      }
    }

    // dy/dt = c·y + g(t) → try Laplace, fallback to manual
    try {
      const Lg = nerdamer(`laplace(${remStr}, t, s)`);
      const Ys = nerdamer(`(${y0}+${Lg.toString()})/(s-(${coeffStr}))`);
      const yt = nerdamer(`ilt(${Ys.toString()}, s, t)`);
      return {
        latex: `${yVar}(t) = ${cleanTex(yt.toTeX())}`,
        raw: yt.toString(),
      };
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Attempt to solve the characteristic ODE system symbolically.
 *
 * @param {string} aExpr - expression for a(u, x, t) in dx/dt = a
 * @param {string} bExpr - expression for b(u, x, t) in du/dt = b
 * @returns {Promise<{ xSolution: { latex: string, raw: string } | null, uSolution: { latex: string, raw: string } | null }>}
 */
export async function solveCharacteristics(aExpr, bExpr) {
  await ensureNerdamer();
  if (!nerdamerReady) return result;

  const aStr = (aExpr || '0').trim();
  const bStr = (bExpr || '0').trim();
  const result = { xSolution: null, uSolution: null };

  try {
    const aDependsU = containsVar(aStr, 'u');
    const bDependsX = containsVar(bStr, 'x');
    const bIsZero = bStr === '0';

    // ── Solve for u ──
    if (bIsZero) {
      result.uSolution = { latex: 'u(t) = u_0', raw: 'u_0' };
    } else if (!bDependsX) {
      result.uSolution = solveLinearODE(bStr, 'u', 'u_0');
    }

    // ── Solve for x ──
    if (!aDependsU) {
      result.xSolution = solveLinearODE(aStr, 'x', 'x_0');
    } else if (bIsZero) {
      // u is constant (u₀) along characteristics → substitute
      const aWithU0 = aStr.replace(
        /(?<![a-zA-Z_])u(?![a-zA-Z0-9_])/g, 'u_0'
      );
      result.xSolution = solveLinearODE(aWithU0, 'x', 'x_0');
    }
  } catch {
    // Both remain null → numerical only
  }

  return result;
}

/**
 * Format solutions as LaTeX strings for KaTeX rendering.
 * @returns {string[]} Array of LaTeX strings
 */
export function formatSolutionDisplay(solutions) {
  const parts = [];

  parts.push(solutions.xSolution
    ? solutions.xSolution.latex
    : 'x(t):\\; \\text{Numerical solution only}');

  parts.push(solutions.uSolution
    ? solutions.uSolution.latex
    : 'u(t):\\; \\text{Numerical solution only}');

  return parts;
}
