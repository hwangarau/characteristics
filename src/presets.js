/**
 * Canonical preset definitions for the method of characteristics visualizer.
 * Each preset defines a PDE u_t + a(u,x,t) u_x = b(u,x,t) with optional initial data.
 *
 * Organized by category, covering the major types from the 50 problems set.
 */

export const PRESETS = [
  // ── Linear, constant coefficient ──
  {
    name: 'Constant transport',
    a: '2',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-4, 8],
    tRange: [0, 4],
    description: 'Parallel characteristics, Gaussian translates right at speed 2. (Problem 1)',
  },
  {
    name: 'Transport + constant source',
    a: '1',
    b: '5',
    initialData: '0',
    xRange: [-2, 6],
    tRange: [0, 4],
    description: 'u grows linearly along characteristics: u = 5t. (Problem 3)',
  },
  {
    name: 'Transport + decay',
    a: '1',
    b: '-u',
    initialData: 'exp(-x^2)',
    xRange: [-2, 8],
    tRange: [0, 5],
    description: 'Parallel curves, u decays exponentially: u = f(x-t)e^{-t}. (Problem 4)',
  },
  {
    name: 'Transport + growth',
    a: '1',
    b: '3*u',
    initialData: 'exp(-x^2)',
    xRange: [-2, 6],
    tRange: [0, 2],
    description: 'u grows exponentially along characteristics: u = f(x-t)e^{3t}. (Problem 5)',
  },

  // ── Linear, variable coefficient in t ──
  {
    name: 'Speed = t',
    a: 't',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-3, 6],
    tRange: [0, 4],
    description: 'Characteristics accelerate: x(t) = x\u2080 + t\u00b2/2. Curves are parabolas. (Problem 6)',
  },
  {
    name: 'Oscillating speed',
    a: 'cos(t)',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-4, 4],
    tRange: [0, 9],
    description: 'Characteristics oscillate: x(t) = x\u2080 + sin(t). (Problem 9)',
  },

  // ── Linear, variable coefficient in x ──
  {
    name: 'Fan-out (a = x)',
    a: 'x',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-3, 3],
    tRange: [0, 3],
    description: 'Characteristics fan exponentially: x(t) = x\u2080 e^t. x=0 is stationary. (Problem 11)',
  },
  {
    name: 'Converging (a = -x)',
    a: '-x',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-3, 3],
    tRange: [0, 3.5],
    description: 'All converge to x = 0: x(t) = x\u2080 e^{-t}. No crossings. (Problem 14)',
  },
  {
    name: 'Fan + growth (a=x, b=u)',
    a: 'x',
    b: 'u',
    initialData: 'x',
    xRange: [-2, 2],
    tRange: [0, 2],
    description: 'Characteristics fan out AND u grows along them. (Problem 13)',
  },

  // ── Mixed x,t coefficients ──
  {
    name: 'Speed = x\u00b7t',
    a: 'x*t',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-3, 3],
    tRange: [0, 2.5],
    description: 'x(t) = x\u2080 exp(t\u00b2/2). Characteristics accelerate and fan out. (Problem 15)',
  },

  // ── Quasilinear: Burgers ──
  {
    name: 'Burgers (Gaussian)',
    a: 'u',
    b: '0',
    initialData: 'exp(-x^2)',
    xRange: [-3, 5],
    tRange: [0, 3],
    description: 'Smooth hump → shock. Implicit solution u = exp(-(x-ut)\u00b2). (Problem 27)',
  },
  {
    name: 'Burgers (ramp down)',
    a: 'u',
    b: '0',
    initialData: 'x < 0 ? 1 : (x > 1 ? 0 : 1-x)',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'Piecewise ramp: compression zone → shock at t*=1. (Problem 25)',
  },
  {
    name: 'Burgers (ramp up)',
    a: 'u',
    b: '0',
    initialData: 'x < 0 ? 0 : (x > 1 ? 1 : x)',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'Piecewise ramp: expansion zone → rarefaction fan, no shock. (Problem 26)',
  },
  {
    name: 'Burgers (step shock)',
    a: 'u',
    b: '0',
    initialData: 'step(x, 1, 0)',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'Riemann problem: immediate shock at speed s = 1/2. (Problem 47)',
  },
  {
    name: 'Burgers (step rarefaction)',
    a: 'u',
    b: '0',
    initialData: 'step(x, 0, 1)',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'Reversed step: characteristics diverge → rarefaction fan u=x/t. (Problem 48)',
  },

  // ── Quasilinear: other flux ──
  {
    name: 'Quadratic flux (a = u\u00b2)',
    a: 'u^2',
    b: '0',
    initialData: '1/(1+x^2)',
    xRange: [-2, 5],
    tRange: [0, 4],
    description: 'Faster flux: a=u\u00b2 compresses harder than Burgers. (Problem 30)',
  },
  {
    name: 'Traffic flow',
    a: '1 - 2*u',
    b: '0',
    initialData: 'step(x, 0.8, 0.2)',
    xRange: [-3, 5],
    tRange: [0, 4],
    description: 'LWR model: high density \u2192 slow. Rarefaction fan. (Problem analogue)',
  },

  // ── Quasilinear with source ──
  {
    name: 'Burgers + decay',
    a: 'u',
    b: '-u',
    initialData: 'exp(-x^2)',
    xRange: [-2, 4],
    tRange: [0, 4],
    description: 'Damping delays shock formation. Compare with sourceless Burgers. (Problem 34)',
  },
  {
    name: 'Burgers + constant source',
    a: 'u',
    b: '1',
    initialData: '0',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'u = t along all curves. Characteristics accelerate: x = x\u2080 + t\u00b2/2. (Problem 35)',
  },

  // ── Source term ODE practice ──
  {
    name: 'Blowup (b = u\u00b2)',
    a: '1',
    b: 'u^2',
    initialData: '1/(1+x^2)',
    xRange: [-2, 6],
    tRange: [0, 3],
    description: 'Riccati ODE along characteristics → finite-time blowup. (Problem 18)',
  },
  {
    name: 'Logistic source',
    a: '1',
    b: 'u*(1-u)',
    initialData: '1/(1+exp(x))',
    xRange: [-6, 8],
    tRange: [0, 5],
    description: 'Sigmoid initial data + logistic growth along characteristics. (Problem 20)',
  },
];
