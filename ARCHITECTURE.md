# Architecture & Status — Method of Characteristics Visualizer

## High-Level Overview

Interactive web tool for visualizing the method of characteristics for first-order PDEs:
```
u_t + a(u,x,t) u_x = b(u,x,t)
```

**Live**: https://hwangarau.github.io/characteristics/  
**Repo**: https://github.com/hwangarau/characteristics

### How it works (the pipeline)

```
User types equation / selects preset
  │
  ├── math-pipeline.js: parse → compiled evaluator + LaTeX
  │     ├── equation-display.js: KaTeX renders PDE live
  │     └── symbolic.js: analytical ODE solutions (async, via Nerdamer Laplace)
  │
  ├── integrator.js: RK4 trace → array of {x, t, u} per characteristic
  │     ├── shock detection: scan for x-position crossings between curves
  │     └── shock resolution: truncate curves at crossing times
  │
  ├── shock-curve.js: R-H shock curve (independent of drawn characteristics)
  │     ├── Find t* from a'(f(x₀))·f'(x₀) < 0
  │     ├── Trace shock forward via Rankine-Hugoniot
  │     └── Root-finding in the multi-valued fold region
  │
  └── renderer.js (Canvas 2D): grid → axes → curves → shocks → initial data
        └── particles-gl.js (WebGL): trail-fading particle animation
```

### Performance design

- **recompute()**: full pipeline (parse → trace → render). On equation/preset/setting changes.
- **rerender()**: just redraws existing curves at new viewport. On pan/zoom (instant).
- Retrace is deferred 300ms after zoom/pan settles.
- WebGL particles on a separate canvas layer.

---

## File-by-File Detail

### `src/main.js` — Orchestrator
- Imports all modules, wires UI to pipeline
- `recompute()`: full pipeline, called on input changes
- `rerender()`: fast redraw, called on pan/zoom
- `setupPanZoom()`: scroll-zoom (centered on cursor), ctrl+drag pan, debounced retrace
- `setupClickInspect()`: click characteristic → inspect panel with x(t)/u(t) graphs
- `setupZoomButtons()`: +/-/recenter buttons
- `startAnimation()`/`stopAnimation()`: WebGL particle animation loop

### `src/math-pipeline.js` — Expression Parser
- Uses math.js to parse user text expressions
- `compileExpression(str)` → `{ evaluate: (scope) => number, latex: string, dependsOnU: boolean }`
- `compileInitialData(str)` → `{ evaluate: (x) => number, latex: string }`
- Registers custom functions: `step(x, a, b)`, `heaviside(x)`, `ramp(x)`
- Handles parse errors gracefully

### `src/integrator.js` — ODE Solver & Shock Detection
- **RK4**: coupled system dx/dt = a(u,x,t), du/dt = b(u,x,t)
- `traceSingle()`: traces one characteristic from (x₀, t₀, u₀) forward
- `traceCharacteristics()`: generates seeds, traces all, detects shocks
- `resolveShocks()`: re-sorts by current x at each timestep, finds ALL crossings, truncates
- `detectShocks()`: finds crossings between adjacent characteristics (for dot display)
- Respects domain bounds: characteristics terminate at boundaries

### `src/shock-curve.js` — Rankine-Hugoniot Shock Tracking
- **Independent of drawn characteristics** — computed analytically/numerically
- `computeShockCurve()`:
  1. Scans a'(f(x₀))·f'(x₀) to find breaking time t*
  2. From t* forward, finds the multi-valued fold in the characteristic map
  3. Root-finds u_L and u_R on either side of shock
  4. Steps shock position via R-H: ds/dt = [F(u_L) - F(u_R)] / [u_L - u_R]
- Only works for autonomous a(u) (no x or t dependence in a)

### `src/renderer.js` — Canvas 2D Drawing
- Full-screen canvas, world↔canvas coordinate transforms
- `drawGrid()`, `drawAxes()`: adaptive grid spacing, tick labels
- `drawCharacteristics()`: color modes (uniform, u-value, speed, index, uniform-dim)
- `drawShocks()`: red dots at crossing points
- `drawShockCurve()`: bold red R-H shock line
- `drawInitialData()`: orange curve showing f(x) along x-axis
- `drawDomainBounds()`: dashed orange vertical lines for bounded domains

### `src/particles-gl.js` — WebGL Particle Animation
- Anvaka-style: ping-pong framebuffer textures for trail persistence
- Each frame: fade previous texture → draw GL_POINTS → swap buffers → composite to screen
- Particles advance along pre-computed characteristic curves
- Soft circle fragment shader, orange color
- Separate canvas with pointer-events: none

### `src/equation-display.js` — KaTeX Rendering
- `renderEquation()`: renders u_t + [a] u_x = [b] with smart formatting
- `renderInitialCondition()`: renders u(x,0) = [f]
- `renderSolution()`: renders analytical ODE solutions

### `src/symbolic.js` — Symbolic ODE Solver (Nerdamer)
- Lazy-loads nerdamer + Solve + Calculus + Extra modules
- `solveCharacteristics(a, b)`: attempts analytical solution of dx/dt = a, du/dt = b
- Strategy: direct integration for f(t), Laplace transform for c·y + g(t)
- For quasilinear (b=0, a depends on u): substitutes u = u₀ = const
- Falls back to "Numerical solution only" for anything nonlinear

### `src/presets.js` — 22 Canonical Presets
- Organized by category: constant, variable (t), variable (x), mixed, quasilinear, source terms
- Each: `{ name, a, b, initialData, xRange, tRange, description }`
- Covers problems from the 50-problem set

### `src/ui.js` — DOM Wiring
- Initializes all controls, wires event listeners
- Debounced text input (300ms), immediate for sliders/dropdowns
- Domain type selector shows/hides boundary inputs
- Particle count slider appears when particles enabled
- Exports: `getState()`, `loadPreset()`, `updateViewport()`, `setZoomLevel()`

### `src/colormap.js` — Color Utilities
- `diverging(v, min, max)`: blue-white-red (for u values)
- `sequential(v, min, max)`: white-to-orange (for speed)
- `categorical(i)`: Tableau 10 palette
- `uniform()`: single blue

---

## Known Issues (TODO)

### Bugs
- **Particle animation toggle**: switching from non-animated to animated mode doesn't always start particles. May be a WebGL context or canvas sizing issue. Need to check browser console.
- **Shock curve rendering**: R-H shock curve computes correctly (verified locally) but may not be visible — could be viewport clipping or z-ordering issue.
- **Step function shock**: `computeShockCurve` can't find t* for discontinuous initial data (f' is infinite at jump). Workaround: use smoothed step `0.5*(1 - tanh(x/ε))`.

### Features to add
- **Smooth zoom animation** (currently snaps)
- **Solution profile panel**: show u(x) at a given time t (like the Burgers HTML reference)
- **Proper R-H shock line for step functions**: handle Riemann problems as special case
- **Click inspect**: show analytical solution with specific x₀, u₀ substituted
- **Bounded domain presets**: problems 38-41 from the 50-problem set
- **Better hover**: highlight the nearest characteristic on mouseover

### Math to add
- Equal-area rule for shock position (alternative to R-H stepping)
- Entropy condition checking (Lax entropy condition: a(u_L) > s > a(u_R))
- Rarefaction fan detection and rendering
