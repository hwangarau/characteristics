/**
 * Canonical preset definitions for the method of characteristics visualizer.
 * Each preset defines a PDE u_t + a(u,x,t) u_x = b(u,x,t) with optional initial data.
 */

export const PRESETS = [
  {
    name: 'Constant transport',
    a: '2',
    b: '0',
    initialData: 'sin(x)',
    xRange: [-6, 6],
    tRange: [0, 4],
    description: 'Parallel characteristics with slope dx/dt = 2. The wave u = sin(x - 2t) translates right.',
  },
  {
    name: 'Variable speed (a = x)',
    a: 'x',
    b: '0',
    initialData: 'sin(x)',
    xRange: [-3, 3],
    tRange: [0, 3],
    description: 'Characteristics fan out exponentially: x(t) = x\u2080 e^t. Speed grows with distance from origin.',
  },
  {
    name: 'Converging (a = -x)',
    a: '-x',
    b: '0',
    initialData: 'sin(x)',
    xRange: [-3, 3],
    tRange: [0, 3.5],
    description: 'All characteristics converge to x = 0: x(t) = x\u2080 e^{-t}. Information collapses to the origin.',
  },
  {
    name: 'Burgers (smooth)',
    a: 'u',
    b: '0',
    initialData: 'sin(x)',
    xRange: [-4, 8],
    tRange: [0, 3],
    description: 'Quasilinear: characteristic speed depends on u. Shock forms at t \u2248 1 where f\u2032(x) is most negative.',
  },
  {
    name: 'Burgers (step)',
    a: 'u',
    b: '0',
    initialData: 'step(x, 1, 0)',
    xRange: [-2, 4],
    tRange: [0, 3],
    description: 'Step initial data creates an immediate shock. Left characteristics (speed 1) overtake right (speed 0).',
  },
  {
    name: 'Traffic flow',
    a: '1 - 2 * u',
    b: '0',
    initialData: 'step(x, 0.8, 0.2)',
    xRange: [-3, 5],
    tRange: [0, 4],
    description: 'LWR model: high density \u2192 slow speed. Characteristics fan out into a rarefaction wave.',
  },
  {
    name: 'Decay along characteristics',
    a: '1',
    b: '-u',
    initialData: 'sin(x)',
    xRange: [-4, 8],
    tRange: [0, 5],
    description: 'Parallel characteristics (speed 1). Solution decays exponentially: u(x,t) = f(x-t) e^{-t}.',
  },
  {
    name: 'Oscillating speed',
    a: 'sin(t)',
    b: '0',
    initialData: 'sin(x)',
    xRange: [-4, 4],
    tRange: [0, 9],
    description: 'Characteristics oscillate: x(t) = x\u2080 + 1 - cos(t). They advance and retreat periodically.',
  },
];
