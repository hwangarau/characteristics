# Method of Characteristics Visualizer

**[Live Demo →](https://hwangarau.github.io/characteristics/)**

Interactive visualizer for the method of characteristics for first-order PDEs.

Given the PDE `u_t + a(u,x,t) u_x = b(u,x,t)`, this tool traces characteristic curves in the (x, t) plane and renders them in real time as you edit the equation.

## Features

- Live KaTeX rendering of the PDE as you type
- RK4 integration of the coupled characteristic ODE system
- 8 canonical presets (transport, Burgers, traffic flow, etc.)
- Color modes: uniform, by u-value, by speed, by curve index
- Shock detection for quasilinear equations
- Optional particle animation along characteristics

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
