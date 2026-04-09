# Method of Characteristics Visualizer

**[Live Demo →](https://hwangarau.github.io/characteristics/)**

Interactive visualizer for the method of characteristics for first-order PDEs, inspired by [anvaka/fieldplay](https://anvaka.github.io/fieldplay/).

Given the PDE `u_t + a(u,x,t) u_x = b(u,x,t)`, this tool traces characteristic curves in the (x, t) plane and renders them in real time as you edit the equation.

## Features

- **Live KaTeX rendering** — the PDE, characteristic ODE, and analytical solutions update as you type
- **RK4 integration** — coupled ODE system `dx/dt = a`, `du/dt = b` solved with 4th-order Runge-Kutta
- **8 canonical presets** — transport, Burgers, traffic flow, rarefaction, decay, and more
- **Symbolic ODE solutions** — Nerdamer computes analytical solutions via Laplace transforms when possible
- **WebGL particle animation** — anvaka-style trail fading with ping-pong framebuffers
- **Shock detection** — detects all characteristic crossings; "Resolve shocks" truncates at the shock curve
- **Smooth pan/zoom** — scroll to zoom, ctrl+drag to pan; instant redraw with deferred retrace
- **Color modes** — uniform, by u-value (diverging), by speed (sequential), by curve index (categorical)

## Architecture

```
index.html              — Two stacked canvases (2D + WebGL) + floating control panel
src/
  main.js               — Pipeline orchestration, pan/zoom, animation loop
  math-pipeline.js      — math.js expression parser → evaluator + LaTeX
  integrator.js          — RK4 ODE solver, characteristic tracing, shock detection
  renderer.js            — Canvas 2D: axes, grid, curves, shocks, initial data
  particles-gl.js        — WebGL particle layer: trail fading via framebuffer ping-pong
  equation-display.js    — KaTeX live rendering of PDE + solutions
  symbolic.js            — Nerdamer symbolic ODE solver (Laplace transforms)
  presets.js             — 8 canonical preset definitions
  ui.js                  — DOM wiring, state management
  colormap.js            — Diverging/sequential/categorical color maps
```

### Rendering pipeline

```
User input (text / preset)
    │
    ├─► math-pipeline: compile a, b, f → evaluators + LaTeX
    │     ├─► equation-display: KaTeX renders PDE live
    │     └─► symbolic.js: analytical solutions (async, non-blocking)
    │
    ├─► integrator: RK4 trace characteristics → [{x,t,u}, ...]
    │     └─► shock detection: find all crossings between adjacent curves
    │
    └─► renderer (Canvas 2D): grid → axes → curves → shocks → initial data
          └─► particles-gl (WebGL): trail-fading particle animation
```

### Performance design

- **recompute()** — full pipeline (parse → trace → render). Called on equation/preset changes.
- **rerender()** — just redraws existing curves at new viewport. Called on pan/zoom (instant).
- Retrace is deferred 300ms after zoom/pan settles, so scrolling is smooth.
- WebGL particles run on a separate canvas layer with `pointer-events: none`.

## Presets

| Name | a | b | u(x,0) | What it shows |
|------|---|---|--------|---------------|
| Constant transport | `2` | `0` | `sin(x)` | Parallel lines, wave translates |
| Variable speed | `x` | `0` | `sin(x)` | Exponential fan-out |
| Converging | `-x` | `0` | `sin(x)` | All curves → x=0 |
| Burgers (smooth) | `u` | `0` | `sin(x)` | Shock at t≈1 |
| Burgers (step) | `u` | `0` | `step(x,1,0)` | Immediate shock |
| Traffic flow | `1-2u` | `0` | `step(x,0.8,0.2)` | Rarefaction fan |
| Decay | `1` | `-u` | `sin(x)` | Exponential decay along curves |
| Oscillating | `sin(t)` | `0` | `sin(x)` | Characteristics oscillate |

## Math reference

See [CHARACTERISTICS_MATH_REFERENCE.md](CHARACTERISTICS_MATH_REFERENCE.md) — comprehensive reference synthesized from Haberman, Evans, Rauch, and Courant & Hilbert, with exact solutions for all presets.

## Development

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # → dist/
```

## Tech stack

- **Vite** — build tool (vanilla JS, no framework)
- **math.js** — expression parsing, compilation, LaTeX conversion
- **KaTeX** — math rendering
- **Nerdamer** — symbolic ODE solving via Laplace transforms
- **Canvas 2D** — static elements (curves, axes, grid)
- **WebGL** — particle animation with trail fading
