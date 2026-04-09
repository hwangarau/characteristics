/**
 * Parse user math expressions, compile to fast evaluators, and generate LaTeX.
 * Uses math.js for parsing/compilation and toTex() for LaTeX conversion.
 */

import { create, all } from 'mathjs';

const math = create(all);

// Register custom functions for piecewise initial data
math.import({
  step: function (x, a, b) {
    return x < 0 ? a : b;
  },
  heaviside: function (x) {
    return x < 0 ? 0 : (x === 0 ? 0.5 : 1);
  },
  ramp: function (x) {
    return x < 0 ? 0 : x;
  },
}, { override: true });

/**
 * Clean up math.js LaTeX output for nicer display.
 */
function cleanLatex(raw) {
  return raw
    .replace(/\\cdot\s?/g, '\\,')       // x·t → x t
    .replace(/\\left\(/g, '(')           // simpler parens
    .replace(/\\right\)/g, ')')
    .replace(/\\left\[/g, '[')
    .replace(/\\right\]/g, ']');
}

/**
 * Compile a math expression string into an evaluator and LaTeX representation.
 * @param {string} exprStr - e.g. "u * x + sin(t)"
 * @returns {{ evaluate: (scope: {u:number, x:number, t:number}) => number, latex: string, error: string|null, dependsOnU: boolean }}
 */
export function compileExpression(exprStr) {
  const trimmed = (exprStr || '').trim();
  if (!trimmed) {
    return {
      evaluate: () => 0,
      latex: '0',
      error: null,
      dependsOnU: false,
    };
  }

  try {
    const node = math.parse(trimmed);
    const compiled = node.compile();

    // Check which symbols appear
    const symbols = new Set();
    node.traverse(n => {
      if (n.isSymbolNode) symbols.add(n.name);
    });

    const dependsOnU = symbols.has('u');

    const evaluate = (scope) => {
      try {
        const result = compiled.evaluate(scope);
        return typeof result === 'number' ? result : Number(result);
      } catch {
        return NaN;
      }
    };

    const latex = cleanLatex(node.toTex({ parenthesis: 'auto' }));

    return { evaluate, latex, error: null, dependsOnU };
  } catch (e) {
    return {
      evaluate: () => NaN,
      latex: '\\text{error}',
      error: e.message,
      dependsOnU: false,
    };
  }
}

/**
 * Compile initial data expression u(x,0) = f(x).
 * Only variable is x (no u or t in scope).
 * @param {string} exprStr - e.g. "sin(x)" or "step(x, 1, 0)"
 * @returns {{ evaluate: (x: number) => number, latex: string, error: string|null }}
 */
export function compileInitialData(exprStr) {
  const trimmed = (exprStr || '').trim();
  if (!trimmed) {
    return { evaluate: null, latex: '', error: null };
  }

  try {
    const node = math.parse(trimmed);
    const compiled = node.compile();

    const evaluate = (x) => {
      try {
        const result = compiled.evaluate({ x });
        return typeof result === 'number' ? result : Number(result);
      } catch {
        return NaN;
      }
    };

    const latex = cleanLatex(node.toTex({ parenthesis: 'auto' }));

    return { evaluate, latex, error: null };
  } catch (e) {
    return {
      evaluate: null,
      latex: '\\text{error}',
      error: e.message,
    };
  }
}
