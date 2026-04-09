/**
 * Live KaTeX rendering of the PDE, characteristic ODE, and initial condition.
 */

import katex from 'katex';
import 'katex/dist/katex.min.css';

function render(container, latex) {
  try {
    katex.render(latex, container, {
      throwOnError: false,
      displayMode: true,
    });
  } catch {
    container.textContent = latex;
  }
}

/**
 * Update the rendered PDE display: u_t + a u_x = b
 */
export function renderEquation(pdeContainer, charOdeContainer, aLatex, bLatex) {
  // Build PDE string
  let aDisplay = aLatex || '0';
  const bDisplay = bLatex || '0';

  // Special case: a = 1 → omit coefficient
  let aTerm;
  if (aDisplay === '1') {
    aTerm = 'u_x';
  } else if (aDisplay === '-1') {
    aTerm = '-u_x';
  } else if (aDisplay === '0') {
    aTerm = '';
  } else {
    // Wrap in parens if it contains +/- (multi-term expression)
    const needsParens = /[+\-]/.test(aDisplay.replace(/^-/, ''));
    aTerm = needsParens
      ? `\\left(${aDisplay}\\right) u_x`
      : `${aDisplay}\\, u_x`;
  }

  let pdeLatex;
  if (aTerm) {
    pdeLatex = bDisplay === '0'
      ? `u_t + ${aTerm} = 0`
      : `u_t + ${aTerm} = ${bDisplay}`;
  } else {
    pdeLatex = bDisplay === '0'
      ? `u_t = 0`
      : `u_t = ${bDisplay}`;
  }

  render(pdeContainer, pdeLatex);

  // Characteristic ODE
  const charLatex = `\\frac{dx}{dt} = ${aDisplay}`;
  render(charOdeContainer, charLatex);
}

/**
 * Update the rendered initial condition: u(x, 0) = f(x)
 */
export function renderInitialCondition(container, fLatex) {
  if (!fLatex) {
    container.textContent = '';
    return;
  }
  render(container, `u(x, 0) = ${fLatex}`);
}

/**
 * Render a symbolic ODE solution line.
 */
export function renderSolution(container, latex) {
  if (!latex) {
    container.textContent = '';
    return;
  }
  render(container, latex);
}
