# Complete Classification: u_t + a·u_x = b

Throughout: u(x,0) = f(x), characteristics start at (x₀, 0) with u₀ = f(x₀).

Along characteristics: dx/dt = a, du/dt = b, so the PDE reduces to two ODEs.

---

## I. Constant speed, no source: a = c, b = 0

| Quantity | Formula |
|----------|---------|
| x(t) | x₀ + ct |
| u(t) | u₀ |
| x₀ in terms of (x,t) | x - ct |
| **Solution** | **u(x,t) = f(x - ct)** |
| Shocks | Never |
| Computation | Closed form. No ODE needed. |

Test: a=2, f=exp(-x²). Verify: u(x,t) = exp(-(x-2t)²).

---

## II. Constant speed + source: a = c, b = b(u,t)

| Quantity | Formula |
|----------|---------|
| x(t) | x₀ + ct |
| u(t) | Solve du/dt = b(u,t), u(0) = f(x₀) |
| **Solution** | **u(x,t) = U(t; f(x-ct))** where U solves the ODE |
| Shocks | Never (characteristics are parallel) |
| Computation | One integral for x. One ODE for u (same ODE for all chars, only u₀ differs). |

### Analytical u(t) for common b:

| b | du/dt = | u(t) | u(x,t) |
|---|---------|------|---------|
| k (const) | k | u₀ + kt | f(x-ct) + kt |
| -αu | -αu | u₀ e^{-αt} | f(x-ct) e^{-αt} |
| αu | αu | u₀ e^{αt} | f(x-ct) e^{αt} |
| u² | u² | u₀/(1-u₀t) | f(x-ct) / (1 - f(x-ct)·t) |
| -u² | -u² | u₀/(1+u₀t) | f(x-ct) / (1 + f(x-ct)·t) |
| u(1-u) | u(1-u) | u₀e^t/(1-u₀+u₀e^t) | logistic with u₀=f(x-ct) |
| √u | √u | (√u₀ + t/2)² | (√f(x-ct) + t/2)² |
| g(t) | g(t) | u₀ + G(t) | f(x-ct) + G(t), G=∫₀ᵗg(s)ds |
| -αu + g(t) | -αu+g(t) | u₀e^{-αt} + e^{-αt}∫₀ᵗg(s)e^{αs}ds | integrating factor |

**Blowup** (b=u²): u → ∞ at t_blow = 1/u₀ = 1/f(x₀). Different characteristics blow up at different times. The **first blowup** is at t = 1/max(f).

**Non-uniqueness** (b=√u): Picard-Lindelöf fails at u=0. The ODE du/dt = √u from u₀=0 has both u≡0 and u=(t/2)² as solutions.

---

## III. Variable speed in t only: a = a(t), b = 0

| Quantity | Formula |
|----------|---------|
| x(t) | x₀ + A(t), where A(t) = ∫₀ᵗ a(s)ds |
| u(t) | u₀ |
| x₀ in terms of (x,t) | x - A(t) |
| **Solution** | **u(x,t) = f(x - A(t))** |
| Shocks | Never (all characteristics are horizontal translates of each other) |
| Computation | One integral A(t). No ODE. |

### Common a(t):

| a(t) | A(t) = ∫₀ᵗ a(s)ds | x(t) | u(x,t) |
|------|---------------------|------|---------|
| t | t²/2 | x₀ + t²/2 | f(x - t²/2) |
| t² | t³/3 | x₀ + t³/3 | f(x - t³/3) |
| e^t | e^t - 1 | x₀ + e^t - 1 | f(x - e^t + 1) |
| cos(t) | sin(t) | x₀ + sin(t) | f(x - sin(t)) |
| sin(t) | 1-cos(t) | x₀ + 1-cos(t) | f(x - 1 + cos(t)) |
| 1/(1+t) | ln(1+t) | x₀ + ln(1+t) | f(x - ln(1+t)) |

---

## IV. Variable speed in x only: a = a(x), b = 0

| Quantity | Formula |
|----------|---------|
| x(t) | Solve dx/dt = a(x) (separable: ∫dx/a(x) = t + C) |
| u(t) | u₀ |
| **Solution** | **u(x,t) = f(x₀(x,t))** where x₀ is found by inverting x(t;x₀) |
| Shocks | Never (ODE uniqueness: two solutions of dx/dt=a(x) can't cross) |
| Computation | Separable ODE. Analytic for common a(x). |

### Common a(x):

| a(x) | ∫dx/a(x) | x(t; x₀) | x₀(x,t) | u(x,t) |
|------|-----------|-----------|----------|---------|
| αx | (1/α)ln|x| | x₀ e^{αt} | x e^{-αt} | f(x e^{-αt}) |
| -αx | -(1/α)ln|x| | x₀ e^{-αt} | x e^{αt} | f(x e^{αt}) |
| x² | -1/x | x₀/(1-x₀t) | x/(1+xt) | f(x/(1+xt)) |
| √x | 2√x | (√x₀ + t/2)² | (√x - t/2)² | f((√x - t/2)²) |
| 1+x² | arctan(x) | tan(arctan(x₀)+t) | tan(arctan(x)-t) | f(tan(arctan(x)-t)) |

**Note on blowup vs crossing**: For a(x) = x², x(t) = x₀/(1-x₀t) blows up at t=1/x₀ — the characteristic escapes to ±∞. But different characteristics **don't cross** because a(x) = x² is locally Lipschitz. They blow up at different times and at different locations.

---

## V. Variable speed in x and t: a = a(x,t), b = 0

| Quantity | Formula |
|----------|---------|
| x(t) | Solve dx/dt = a(x,t) — general first-order ODE |
| u(t) | u₀ |
| **Solution** | **u(x,t) = f(x₀(x,t))** |
| Shocks | Never (Picard-Lindelöf: a Lipschitz in x ⟹ unique solutions ⟹ no crossing) |
| Computation | First-order ODE. Analytic if separable or linear. Otherwise RK4. |

### Common a(x,t):

| a(x,t) | Type | x(t; x₀) | x₀(x,t) |
|---------|------|-----------|----------|
| xt | separable | x₀ exp(t²/2) | x exp(-t²/2) |
| x/(1+t) | separable | x₀(1+t) | x/(1+t) |
| x+t | linear 1st order | (x₀+t+1)eᵗ - t - 1 | (x+t+1)e⁻ᵗ - t - 1 |
| x-t | linear 1st order | (x₀+t-1)eᵗ + 1-t | (x-t+1)e⁻ᵗ + t-1 |

For a = x+t: dx/dt - x = t is a linear ODE with integrating factor e⁻ᵗ. Multiply: d/dt(xe⁻ᵗ) = te⁻ᵗ. Integrate: xe⁻ᵗ = -te⁻ᵗ - e⁻ᵗ + C. So x = -t-1+Ceᵗ, C = x₀+1.

---

## VI. Variable speed + source: a = a(x,t), b = b(u,x,t)

| Quantity | Formula |
|----------|---------|
| x(t) | Solve dx/dt = a(x,t) (independent of u for linear PDE) |
| u(t) | Solve du/dt = b(u, x(t), t) along the known x(t) |
| **Solution** | **u(x,t) = U(t; x₀, f(x₀))** |
| Shocks | Never |
| Computation | Solve x-ODE first (independent), then u-ODE with x(t) substituted. |

Example: a=x, b=-u. Then x(t)=x₀eᵗ, du/dt=-u → u=u₀e⁻ᵗ. So u(x,t) = f(xe⁻ᵗ)e⁻ᵗ.

Example: a=x, b=u. Then x(t)=x₀eᵗ, du/dt=u → u=u₀eᵗ. So u(x,t) = f(xe⁻ᵗ)eᵗ.

---

## VII. Quasilinear homogeneous: a = a(u), b = 0

**This is where shocks happen.**

| Quantity | Formula |
|----------|---------|
| u(t) | u₀ = f(x₀) (constant — du/dt = 0) |
| x(t) | x₀ + a(f(x₀))·t (straight line — speed is constant per char) |
| x₀ in terms of (x,t) | Solve x₀ + a(f(x₀))·t = x (implicit) |
| **Solution** | **u = f(x₀) where x₀ + a(f(x₀))·t = x** (implicit) |
| Equivalent | **u(x,t) = f(x - a(u)·t)** (implicit in u) |

### Breaking time

Characteristics cross when ∂x/∂x₀ = 0:

**∂x/∂x₀ = 1 + a'(f(x₀))·f'(x₀)·t = 0**

**t\*(x₀) = -1 / [a'(f(x₀))·f'(x₀)]**

**Global breaking time: t\* = min{t\*(x₀)} over x₀ where a'(f)·f' < 0**

| Condition | Behavior |
|-----------|----------|
| a'(f)·f' < 0 somewhere | Shock at t* |
| a'(f)·f' ≥ 0 everywhere | No shock ever |
| a'(f)·f' = 0 everywhere | Parallel or stationary |

### Shock speed (Rankine-Hugoniot)

After t*, the shock at position s(t) moves at:

**ds/dt = [F(u_L) - F(u_R)] / [u_L - u_R]**

where F(u) = ∫a(u)du is the **flux function**.

### Entropy condition (Lax)

A shock with u_L on the left and u_R on the right is admissible only if:

**a(u_L) > s > a(u_R)**

(characteristics must flow INTO the shock from both sides)

If violated → the physical solution is a **rarefaction fan**.

### Rarefaction fan

When u_L < u_R (for convex flux), characteristics diverge. The solution in the fan:

**u(x,t) = (a')⁻¹(x/t)**

For Burgers (a=u, a'=1): u = x/t in the fan region a(u_L)·t < x < a(u_R)·t.

### Common a(u):

| a(u) | a'(u) | F(u)=∫a du | Implicit solution | t* | R-H speed |
|------|-------|------------|-------------------|----|----|
| u | 1 | u²/2 | u = f(x-ut) | -1/min f' | (u_L+u_R)/2 |
| u² | 2u | u³/3 | u = f(x-u²t) | -1/min(2f·f') | (u_L²+u_Lu_R+u_R²)/3 |
| 1-2u | -2 | u-u² | u = f(x-(1-2u)t) | 1/(2·max f') | 1-(u_L+u_R) |
| u³ | 3u² | u⁴/4 | u = f(x-u³t) | -1/min(3f²f') | ... |
| 1+u | 1 | u+u²/2 | u = f(x-(1+u)t) | -1/min f' | 1+(u_L+u_R)/2 |

### Specific initial data for Burgers (a=u):

| f(x) | t* | x₀ at first shock | Shock speed | Notes |
|------|----|--------------------|-------------|-------|
| sin(x) | 1 | x₀ = π (where f'=-1) | varies | Periodic |
| exp(-x²) | 1/(2e⁻¹/²) ≈ 1.166 | x₀ = 1/√2 ≈ 0.707 | starts ≈ a(f(x₀*)) | Gaussian |
| step(x,1,0) | 0⁺ | x₀ = 0 | 1/2 | Riemann shock |
| step(x,0,1) | ∞ (never) | — | — | Riemann rarefaction |
| 1-x on [0,1] | 1 | everywhere simultaneously | 1/2 | Entire ramp compresses |
| -tanh(x) | min over x₀ | near x=0 | ≈ 0 | Symmetric compression |

### Computation strategy

Characteristics are **straight lines** — no ODE integration needed.
```
x(t) = x₀ + a(f(x₀)) · t     (closed form)
u(t) = f(x₀)                   (closed form)
```
The only numerical work is:
1. Evaluate a(f(x₀)) for each seed → slope of each line
2. Scan a'(f)·f' for t* (one pass, N samples, finite differences for f')
3. R-H stepping for shock curve (one ODE, not per-characteristic)

---

## VIII. Quasilinear + source: a = a(u), b = b(u)

**Shocks possible, but characteristics are curved.**

| Quantity | Formula |
|----------|---------|
| u(t) | Solve du/dt = b(u), u(0) = f(x₀) — call solution U(t; u₀) |
| x(t) | x₀ + ∫₀ᵗ a(U(s; u₀)) ds |
| **Solution** | Implicit: invert (x(t;x₀), t) → x₀, then u = U(t; f(x₀)) |

### Breaking condition (modified)

∂x/∂x₀ = 1 + f'(x₀) · ∫₀ᵗ a'(U(s)) · (∂U/∂u₀)(s) ds = 0

For b = -αu (damping), U = u₀e^{-αt}, ∂U/∂u₀ = e^{-αt}:

**∂x/∂x₀ = 1 + f'(x₀) · (1 - e^{-αt})/α**

Shock forms only if **f'(x₀) < -α** (needs steeper gradient than sourceless case).

For b = αu (growth), ∂U/∂u₀ = e^{αt}:

**∂x/∂x₀ = 1 + f'(x₀) · (e^{αt} - 1)/α**

Any f' < 0 causes shock, and it happens **sooner** than sourceless case.

### Common cases:

| a(u) | b(u) | U(t;u₀) | x(t;x₀) | Shock condition |
|------|------|---------|---------|-----------------|
| u | -αu | u₀e^{-αt} | x₀ + u₀(1-e^{-αt})/α | f' < -α |
| u | αu | u₀e^{αt} | x₀ + u₀(e^{αt}-1)/α | any f' < 0, sooner |
| u | 1 | u₀+t | x₀ + u₀t + t²/2 | f' < 0 always |
| u | -u² | u₀/(1+u₀t) | x₀ + (1/1)ln(1+u₀t) | complicated |
| u | u(1-u) | logistic | ∫ hard | complicated |

### Computation strategy

Characteristics are **curved** — need RK4 (or analytical integration when possible).
But the u-ODE is the same for all characteristics (only u₀ differs). So:
1. Solve du/dt = b(u) once analytically if possible → U(t; u₀)
2. For each characteristic: x(t) = x₀ + ∫₀ᵗ a(U(s; f(x₀))) ds
3. If U is known analytically, the x-integral may also be closed-form
4. Shock curve: modified R-H with time-dependent u_L(t) and u_R(t)

---

## IX. Fully general: a = a(u,x,t), b = b(u,x,t)

No simplifications. Coupled 2×2 ODE system, solved by RK4. Shocks possible but analysis is case-by-case.

---

## X. Bounded domain [a,b]

Everything above applies, plus:

| Property | Rule |
|----------|------|
| Inflow boundary | Where characteristics ENTER the domain: x=a if a(u)>0, x=b if a(u)<0 |
| Outflow boundary | Where characteristics EXIT — no BC needed (overdetermined if prescribed) |
| Two-region structure | Dividing characteristic from corner (a,0): left of it = BC data, right = IC data |
| Compatibility | At corner: need f(a) = g(0) for continuity |

---

## Decision Tree for the Visualizer

```
Does a depend on u?
├── NO (linear PDE): no shocks possible
│   ├── a = const?
│   │   ├── YES: x(t) = x₀ + ct, closed form
│   │   └── NO: solve dx/dt = a(x,t)
│   │       ├── a = a(t) only: x = x₀ + ∫a(t)dt, closed form
│   │       ├── a = a(x) only: separable ODE, often closed form
│   │       └── a = a(x,t): general ODE, try analytic else RK4
│   └── Then solve du/dt = b along known x(t)
│       ├── b = 0: u = f(x₀), done
│       ├── b linear in u: integrating factor / Laplace
│       └── b nonlinear: numerical ODE
│
└── YES (quasilinear/nonlinear): shocks possible
    ├── b = 0?
    │   ├── YES: u = const along chars, chars are STRAIGHT LINES
    │   │   ├── Compute t* = min{-1/[a'(f)·f']} where product < 0
    │   │   ├── If t* < ∞: shock forms, trace via R-H
    │   │   ├── If a'(f)·f' ≥ 0 everywhere: no shock, rarefaction possible
    │   │   └── Riemann problem (step data): shock or rarefaction by entropy
    │   │
    │   └── NO: u evolves, chars are CURVED
    │       ├── Solve du/dt = b(u) → U(t; u₀)
    │       ├── x(t) = x₀ + ∫a(U(s))ds
    │       ├── Modified breaking condition
    │       └── Modified R-H with time-dependent states
    └── a depends on x or t too → full RK4, case-by-case analysis
```
