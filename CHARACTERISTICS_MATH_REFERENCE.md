# Method of Characteristics -- Mathematical Reference for Visualizer

Comprehensive reference synthesized from five PDE textbooks. Every formula, theorem number, and page reference points to the actual source so the visualizer can be validated against exact solutions.

**Sources:**
- **Haberman** — Ch 12: Method of Characteristics for Linear and Quasilinear Wave Equations (pp. 536--590)
- **Evans** — Ch 3 §3.2: Characteristics for nonlinear first-order PDE (pp. 97--114); Ch 2 §2.1: Transport equation (pp. 18--19)
- **Rauch** — Ch 1 §1.1: The simplest PDE (pp. 1--6); §1.9: Characteristics and singular solutions (pp. 52--58)
- **Courant & Hilbert Vol 2** — Ch II: Partial Differential Equations of First Order (pp. 62--102)
- **Evans** — Ch 3 §3.3: Hamilton--Jacobi equations and Hopf--Lax formula (pp. 115--133)

---

## 1. The Setup

### The general first-order PDE

In one space dimension the core equation is:

    u_t + a(u, x, t) u_x = b(u, x, t)

where u = u(x, t). This covers almost every case relevant to the visualizer.

**Evans's general formulation** (Evans §3.2, p. 97): The most general first-order PDE in n variables is F(Du, u, x) = 0 where Du = (u_{x_1}, ..., u_{x_n}). The method of characteristics converts this PDE into a system of 2n + 1 first-order ODEs.

**Haberman's applied formulation** (Haberman §12.6.1, p. 561): For quasilinear equations, the PDE takes the form

    rho_t + c(rho, x, t) rho_x = Q(rho, x, t)

where c is the characteristic velocity and Q is a source/sink.

### What characteristics are

**Geometrically:** Characteristics are curves in the (x, t)-plane along which the PDE reduces to an ODE. The solution "propagates" along these curves. (Haberman §12.2.2, p. 538; Evans §2.1, p. 18)

**Analytically:** For u_t + a u_x = b, define a curve x = x(t) satisfying dx/dt = a. Then along this curve:

    du/dt = u_t + u_x (dx/dt) = u_t + a u_x = b

So the PDE becomes the ODE system:

    dx/dt = a(u, x, t)        (characteristic equation)
    du/dt = b(u, x, t)        (evolution of u along the characteristic)

with initial conditions x(0) = x_0 and u(0) = f(x_0), where f is the initial data.

**Rauch's perspective** (Rauch §1.1, p. 2): For u_t + c u_x = 0 with c real, the differential equation asserts that the directional derivative of u in the direction (1, c) vanishes. The lines x - ct = const are the characteristic lines (or rays). u is constant on each ray.

**Courant & Hilbert's geometric view** (Courant v2, Ch II §3, p. 73): At each point (x, y, u), the PDE F(x, y, u, p, q) = 0 defines a relation between the surface element (p, q) = (u_x, u_y). The characteristic curves are precisely those curves on the integral surface along which the PDE does not determine the surface element uniquely -- they are the "ribs" of the solution surface.

### The characteristic ODE system (Evans, full generality)

For the general PDE F(Du, u, x) = 0, Evans derives (Thm 1, §3.2.1, p. 99):

    (a) p_dot(s) = -D_x F(p, z, x) - D_z F(p, z, x) p(s)
    (b) z_dot(s) = D_p F(p, z, x) . p(s)
    (c) x_dot(s) = D_p F(p, z, x)

where x(s) is position, z(s) = u(x(s)) is the value of u along the characteristic, and p(s) = Du(x(s)) is the gradient.

**Key simplification for quasilinear case** (Evans §3.2.5b, p. 112): If F = b(x, u) . Du + c(x, u) = 0, the system reduces to:

    (a) x_dot(s) = b(x(s), z(s))
    (b) z_dot(s) = -c(x(s), z(s))

The p equation decouples and is not needed. This is the system relevant for the visualizer.

---

## 2. Classification of Cases

### Case 1: Linear constant coefficient (a = const, b = 0)

**PDE:** u_t + c u_x = 0, c in R constant.

**Characteristic ODEs:**
    dx/dt = c    =>    x = ct + x_0
    du/dt = 0    =>    u = const along each characteristic

**Solution:** u(x, t) = g(x - ct) where g is the initial data. (Evans §2.1, eq. (3), p. 18; Haberman §12.2.2, eq. 12.2.12, p. 539; Rauch Thm 1, §1.1, p. 2)

**Visual appearance:**
- Characteristics are parallel straight lines with slope dt/dx = 1/c in the (x, t)-plane
- The initial profile translates rigidly at speed c
- All characteristics have the same slope -- they never cross
- Figure 12.2.1 in Haberman (p. 539) shows this family of parallel lines

**What the visualizer should show:** Parallel lines emanating from the x-axis, all tilted at the same angle. The u-profile slides right (c > 0) or left (c < 0) without distortion.

### Case 2: Linear variable coefficient (a = a(x, t), b = 0)

**PDE:** u_t + a(x, t) u_x = 0

**Characteristic ODEs:**
    dx/dt = a(x, t)    (an ODE in x alone -- decoupled from u)
    du/dt = 0           (u is still constant along each characteristic)

**Solution:** u is constant along each characteristic curve, but these curves are no longer straight lines. They are the integral curves of the ODE dx/dt = a(x, t).

**Examples for the visualizer:**

**(a) a(x, t) = x (exponential fan):**
    dx/dt = x  =>  x(t) = x_0 e^t
Characteristics fan out exponentially from the origin. Points with x_0 > 0 race to the right; x_0 < 0 race to the left. The solution stretches.

**(b) a(x, t) = -x (convergence):**
    dx/dt = -x  =>  x(t) = x_0 e^{-t}
Characteristics converge toward x = 0. The solution compresses toward the origin.

**(c) a(x, t) = sin(t) (oscillating characteristics):**
    dx/dt = sin(t)  =>  x(t) = -cos(t) + (x_0 + 1)
All characteristics are translates of -cos(t). They oscillate back and forth in unison.

**(d) a(x, t) = 3t^2 (Haberman §12.2.2, eq. 12.2.13--16, p. 541):**
    dx/dt = 3t^2  =>  x = t^3 + x_0
Characteristics are cubic curves. u along characteristic satisfies dw/dt = 2tw, giving w = ke^{t^2}. Note: characteristics are not straight, and u is not constant when b != 0.

**Visual appearance:** Curved lines that spread, converge, or oscillate depending on a(x, t). Because a does not depend on u, the curves are determined independently of the initial data, and they never cross (by ODE uniqueness).

### Case 3: Linear with source (a = a(x, t), b != 0)

**PDE:** u_t + a(x, t) u_x = b(x, t, u)

**Characteristic ODEs:**
    dx/dt = a(x, t)
    du/dt = b(x, t, u)

Now u changes along characteristics according to the ODE for u.

**Evans's formulation for linear homogeneous** (Evans §3.2.5a, p. 110): b(x) . Du(x) + c(x)u(x) = 0. The characteristic equations (17) in Evans p. 100 reduce to x_dot = b(x) and z_dot = -c(x)z, so u grows or decays exponentially if c is constant.

**Sub-cases:**

**(a) b = -k u (exponential decay):**
    du/dt = -ku  =>  u(t) = u(0) e^{-kt}
The amplitude of the initial data decays exponentially along each characteristic. Visually: the profile flattens toward zero over time.

**(b) b = ku (exponential growth/blowup):**
    du/dt = ku  =>  u(t) = u(0) e^{kt}
The solution grows exponentially. If k > 0, the profile amplifies without bound.

**(c) b = f(x, t) (forcing term, no u-dependence):**
    du/dt = f(x(t), t)
u changes along characteristics by accumulating the forcing. Solution: u(x, t) = g(x_0) + integral of f along the characteristic.

**Evans nonhomogeneous transport** (Evans §2.1.2, p. 19): For u_t + b . Du = f in R^n x (0, infinity), the solution is u(x, t) = g(x - tb) + integral from 0 to t of f(x + (s-t)b, s) ds.

**Visual appearance:** Same characteristic curves as Case 2, but u now varies along them. Color or height on the characteristics changes as you move forward in time.

### Case 4: Quasilinear (a = a(u), b = 0) -- THE KEY CASE

**PDE:** u_t + c(u) u_x = 0, equivalently rho_t + c(rho) rho_x = 0 in Haberman's notation.

This is the critical case for visualization because the characteristic speed depends on the solution itself.

**Characteristic ODEs** (Haberman §12.6.1, p. 561; §12.6.3, p. 564):
    drho/dt = 0           =>  rho = rho(x_0, 0) = f(x_0) = const along characteristic
    dx/dt = c(rho)        =>  x = c(f(x_0)) t + x_0

Since rho is constant along each characteristic, and c depends on rho, the characteristic speed is constant along each line. Therefore **each characteristic is a straight line**, but different characteristics have different slopes.

**Solution formula** (implicit): u(x, t) = f(x_0) where x = c(f(x_0))t + x_0 determines x_0 as a function of x and t. Equivalently, u = g(x - tF'(u)) in Evans's notation (Evans §3.2.5b, eq. (61), p. 114), where F' plays the role of c.

#### Shock formation

**When characteristics cross:** If c'(u) < 0 (characteristic speed decreasing as a function of u), or equivalently if the initial data has c(f(x_0)) decreasing in x_0, then characteristics from different starting points will converge and eventually intersect. At the crossing point, the solution would need to be multi-valued, which is physically impossible. (Haberman §12.6.4, p. 567--568; Evans §3.2.5b, p. 113; Rauch §1.9, p. 55--57)

**The breaking time formula** (Rauch Thm 2, §1.9, p. 56; Thm 3, p. 57):

For u_t + u u_x = 0 (Burgers equation) with u(0, x) = g(x):

    T_break = -1 / inf{g'(x) : x in R}

if inf g' < 0 (i.e., g is somewhere decreasing), otherwise T = infinity.

More generally, for u_t + c(u) u_x = 0 with u(x, 0) = f(x), define F(x_0) = c(f(x_0)). Then characteristics intersect when F'(x_0) < 0. The time of first intersection is (Haberman §12.6.4, eq. 12.6.35, p. 578):

    t_break = -1 / min{F'(x_0)}

and the location is given by x_break = -F(x_0*)/F'(x_0*) + x_0* where x_0* achieves the minimum and F''(x_0*) = 0.

**Caustic (envelope of characteristics):** The envelope of the family of straight lines x = F(x_0)t + x_0 is given parametrically by (Haberman §12.6.4, eqs. 12.6.34--35, p. 578):

    x = -F(x_0)/F'(x_0) + x_0
    t = -1/F'(x_0)

This curve, called the caustic, has a cusp at the breaking point. Inside the caustic, three characteristics pass through each point (the solution is "triple-valued"). The shock forms at the cusp.

#### Rarefaction waves (fan characteristics)

When c(f(x_0)) is increasing across a discontinuity in the initial data, characteristics fan out instead of converging. The gap is filled by a **rarefaction fan**: a continuous family of characteristics emanating from the discontinuity point. (Haberman §12.6.3, p. 566; Rauch §1.9, p. 55--56)

**Example** (Haberman p. 565--566): rho_t + 2rho rho_x = 0, rho(x, 0) = 3 for x < 0, rho(x, 0) = 4 for x > 0. Characteristics from x < 0 have speed 6, from x > 0 have speed 8. Fan characteristics with speeds between 6 and 8 emanate from x = 0 with rho = x/(2t) for 6t < x < 8t.

**Visual appearance:** A fan of straight lines spreading from a single point on the x-axis. Between the outermost fan lines, the solution varies linearly in x/t.

#### Burgers equation (the canonical example)

**PDE:** u_t + u u_x = 0 (inviscid Burgers equation)

Here c(u) = u, so each characteristic has speed equal to the value of u carried on it. This is the simplest and most important quasilinear example.

**Characteristic system:**
    dx/dt = u,  du/dt = 0
    =>  u = f(x_0),  x = f(x_0) t + x_0

**Rauch's treatment** (Rauch §1.9, Thm 3, p. 57): There is a unique u in C^1([0, T) x R) given implicitly by u(t, x) - g(x - tu(t, x)) = 0, and T = -(inf g')^{-1}. If g is C^k on a neighborhood of x_bar, then u is C^k on a neighborhood of the characteristic (t, x_bar + tg(x_bar)), for 0 <= t < T.

### Case 5: Traffic flow models

**The Lighthill--Whitham--Richards (LWR) model** (Haberman §12.6.2, p. 562--563):

Conservation of cars: rho_t + q_x = 0 where rho is traffic density and q = rho u is traffic flow.

Car velocity model: u(rho) = u_max(1 - rho/rho_max), giving:

    q(rho) = u_max rho (1 - rho/rho_max)
    c(rho) = q'(rho) = u_max(1 - 2rho/rho_max)

The density wave velocity c(rho) decreases as density increases. This means denser traffic has slower wave speed, so **compression waves (leading to shocks) form when density increases in the direction of travel**.

**Key features:**
- c(rho) = u_max for rho = 0 (fastest waves in empty road)
- c(rho) = 0 for rho = rho_max/2 (standing wave at half capacity)
- c(rho) = -u_max for rho = rho_max (wave propagates backward through jam)

**Red light turning green** (Haberman §12.6.3, p. 567): rho = rho_max for x < 0, rho = 0 for x > 0 initially. A rarefaction fan opens at x = 0 with density rho(x, t) = (rho_max/2)(1 - x/(u_max t)) for -u_max t < x < u_max t. The fan of characteristics emanates from the origin.

**Green light turning red** (Haberman §12.6.4, p. 572): A shock wave propagates backward. Shock speed is dx_s/dt = -q(rho_0)/(rho_max - rho_0).

#### Rankine--Hugoniot jump condition

When a shock forms, its position x_s(t) satisfies (Haberman §12.6.4, eq. 12.6.20, p. 569):

    dx_s/dt = [q] / [rho] = (q(rho_+) - q(rho_-)) / (rho_+ - rho_-)

where rho_+ and rho_- are the densities on the right and left of the shock.

For Burgers equation u_t + (u^2/2)_x = 0, the shock speed is:

    s = (u_L + u_R) / 2

**Entropy condition** (Haberman §12.6.4, eq. 12.6.23, p. 571): Characteristics must enter the shock from both sides:

    c(rho_-) > dx_s/dt > c(rho_+)

This selects the physically meaningful shock among all possible discontinuous weak solutions.

---

## 3. Algorithms for Visualization

### Tracing characteristics numerically

The core algorithm is to solve the ODE system:

    dx/dt = a(u, x, t)
    du/dt = b(u, x, t)

with initial conditions x(0) = x_0, u(0) = f(x_0).

**Method:** Use any standard ODE integrator (RK4, RK45 adaptive). For each seed point x_0 on the initial line, integrate forward in t.

```
For each x_0 in seed_points:
    x = x_0, u = f(x_0), t = 0
    while t < t_max:
        dx = a(u, x, t) * dt
        du = b(u, x, t) * dt
        x += dx; u += du; t += dt
        store (x, t, u)
```

**For the quasilinear case (Case 4):** Since characteristics are straight lines (x = c(f(x_0))t + x_0), no ODE integration is needed. Simply compute the slope for each seed and draw the line. This is exact.

### Seeding strategies

**(a) Uniform seeding from initial data:** Place seed points at evenly spaced x_0 values along t = 0. This is the default for initial value problems.

**(b) Adaptive seeding near interesting features:** Place extra seeds near:
- Discontinuities in initial data (where shocks or fans form)
- Regions where c(f(x_0)) changes rapidly (where characteristics converge)
- Inflection points of the initial data

**(c) Fan seeding for rarefaction waves:** At a discontinuity where a rarefaction fan should form, seed characteristics with speeds linearly interpolated between c(u_L) and c(u_R).

### Detecting shock formation numerically

**Method 1 -- Characteristic crossing:** For straight-line characteristics, check if two neighboring characteristics cross at some positive time. The crossing time for characteristics from x_0 and x_0 + dx is:

    t_cross = -(x_0 - (x_0 + dx)) / (c(f(x_0)) - c(f(x_0 + dx)))
            = dx / (c(f(x_0 + dx)) - c(f(x_0)))

If t_cross > 0 and c(f(x_0 + dx)) < c(f(x_0)) (faster behind slower), a shock will form.

**Method 2 -- Jacobian monitoring:** Compute dx/dx_0 along the flow. When this Jacobian vanishes, the mapping from initial to current position is singular -- this is the shock formation time. For the quasilinear case: dx/dx_0 = 1 + c'(f(x_0))f'(x_0)t, which vanishes at t = -1/(c'(f(x_0))f'(x_0)).

**Method 3 -- Breaking time formula:** For u_t + c(u)u_x = 0 with u(x,0) = f(x), compute F'(x_0) = c'(f(x_0))f'(x_0) for all seed points. The minimum positive t_break is -1/min(F') where the min is over x_0 with F'(x_0) < 0.

### What to show when characteristics cross

**Option A (stop at shock):** Terminate each characteristic when it first reaches the shock curve. Draw the shock as a bold curve. This is the physically correct picture.

**Option B (continue, show multi-valued region):** Let characteristics continue past the caustic into the triple-valued region. Shade the multi-valued region differently. This shows what the "mathematical" solution would be before introducing the shock.

**Option C (draw shock + fan):** Compute the shock curve using the Rankine--Hugoniot condition. For rarefaction initial data, draw the fan of characteristics. This gives the full entropy solution.

**Recommended approach for the visualizer:** Show Option B first (educational -- shows why shocks are needed), then toggle to Option A/C (the physical solution).

### Computing the shock curve numerically

Given the Rankine--Hugoniot condition dx_s/dt = [q]/[rho]:

1. Start the shock at the breaking point (x_break, t_break)
2. At each time step, determine u_L and u_R by tracing characteristics back to t = 0
3. Compute shock speed s = [q]/[rho]
4. Advance shock position: x_s(t + dt) = x_s(t) + s * dt

For Burgers equation with step data, the shock is a straight line and can be computed exactly.

---

## 4. Canonical Examples (Visualizer Presets)

### Preset 1: Constant transport

**PDE:** u_t + 2 u_x = 0
**Initial data:** u(x, 0) = exp(-x^2)   (Gaussian)
**Exact solution:** u(x, t) = exp(-(x - 2t)^2)
**Characteristics:** x = 2t + x_0 (parallel lines, slope 1/2 in t-x plane)
**What's interesting:** Simplest possible case. Profile translates right at speed 2 without distortion.
**Source:** Haberman §12.2.2, p. 539--540; Evans §2.1, p. 18

### Preset 2: Variable speed -- exponential fan (a = x)

**PDE:** u_t + x u_x = 0
**Initial data:** u(x, 0) = sin(x)   (or any)
**Characteristic ODE:** dx/dt = x  =>  x(t) = x_0 e^t
**Exact solution:** u(x, t) = sin(x e^{-t})
**Characteristics:** Exponential curves fanning out from origin. Positive x_0 goes right, negative goes left.
**What's interesting:** Characteristics diverge exponentially. The solution stretches but never breaks. u is constant along each curve.

### Preset 3: Converging characteristics (a = -x)

**PDE:** u_t - x u_x = 0
**Initial data:** u(x, 0) = sin(x)
**Characteristic ODE:** dx/dt = -x  =>  x(t) = x_0 e^{-t}
**Exact solution:** u(x, t) = sin(x e^t)
**Characteristics:** All curves converge toward x = 0 exponentially.
**What's interesting:** The solution compresses toward the origin. Fine features in the initial data get squeezed into smaller regions, but no shock forms because u doesn't depend on a.

### Preset 4: Burgers with smooth data (shock formation)

**PDE:** u_t + u u_x = 0
**Initial data:** u(x, 0) = -sin(pi x)  on [-1, 1] or u(x, 0) = 1/(1 + x^2)
**For f(x) = -sin(pi x):** f'(x) = -pi cos(pi x), min f' = -pi at x = 0, so t_break = 1/pi approx 0.318.
**Characteristics:** x = -sin(pi x_0) t + x_0, straight lines with varying slopes.
**What's interesting:** Initially smooth data develops a vertical tangent at the breaking time. The characteristic portrait shows lines converging to form a cusp (caustic). This is the canonical shock formation example.
**Source:** Rauch §1.9, Thm 2--3, pp. 56--57; Evans §3.2.5b, p. 113--114; Haberman §12.6.4, pp. 577--579

### Preset 5: Burgers with step data (immediate shock -- Riemann problem)

**PDE:** u_t + u u_x = 0 (equivalently rho_t + 2rho rho_x = 0 as in Haberman)
**Initial data:** u(x, 0) = u_L for x < 0, u_R for x > 0, with u_L > u_R (shock case)

**Example values:** u_L = 4, u_R = 3 (Haberman §12.6.4, p. 571)
**Shock speed:** s = (u_L + u_R)/2 = 7/2. Actually for rho_t + 2rho rho_x = 0 with q = rho^2: s = [q]/[rho] = (16 - 9)/(4 - 3) = 7.
**Characteristics:** From x < 0: slope 1/8 (speed 2*4 = 8). From x > 0: slope 1/6 (speed 2*3 = 6). The faster left-side characteristics crash into the slower right-side ones.
**Shock position:** x_s = 7t.
**What's interesting:** Shock forms immediately at t = 0. The shock eats characteristics from both sides. Entropy condition is satisfied: c(4) = 8 > 7 > 6 = c(3).
**Source:** Haberman §12.6.4, pp. 570--572

### Preset 6: Traffic flow -- rarefaction fan (red light turning green)

**PDE:** rho_t + u_max(1 - 2rho/rho_max) rho_x = 0
**Initial data:** rho(x, 0) = rho_max for x < 0, rho(x, 0) = 0 for x > 0
**Parameters:** u_max = 1, rho_max = 1 for simplicity.
**Characteristic speeds:** c(rho_max) = -u_max = -1 on left, c(0) = u_max = 1 on right.
**Fan:** Characteristics emanate from x = 0 with all speeds between -1 and +1. In the fan region: rho(x, t) = (rho_max/2)(1 - x/(u_max t)).
**Exact solution:**
    rho = rho_max        for x < -u_max t
    rho = (1/2)(1 - x/t) for -t < x < t
    rho = 0              for x > u_max t
**What's interesting:** The fan of characteristics forms a wedge opening from the origin. Inside the wedge, density decreases linearly. This models the wave of cars starting to move after a green light.
**Source:** Haberman §12.6.3, p. 567

### Preset 7: Decay along characteristics

**PDE:** u_t + u_x = -u   (a = 1, b = -u)
**Initial data:** u(x, 0) = sin(x) or Gaussian
**Characteristic ODEs:**
    dx/dt = 1    =>    x = t + x_0
    du/dt = -u   =>    u = f(x_0) e^{-t}
**Exact solution:** u(x, t) = f(x - t) e^{-t}
**Characteristics:** Parallel lines (same as constant transport), but u decays exponentially along them.
**What's interesting:** Combines translation with damping. The profile both moves and shrinks. Good for showing that b != 0 changes u along characteristics.

### Preset 8: Oscillating characteristics (a = sin(t))

**PDE:** u_t + sin(t) u_x = 0
**Initial data:** u(x, 0) = f(x)
**Characteristic ODE:** dx/dt = sin(t)  =>  x = 1 - cos(t) + x_0
**Exact solution:** u(x, t) = f(x - 1 + cos(t))
**Characteristics:** Sinusoidal curves. All characteristics are translates of 1 - cos(t).
**What's interesting:** The solution oscillates back and forth. At t = 2 pi, everything returns to the initial configuration. Characteristics never cross (they're all parallel translates of each other).

### Preset 9 (bonus): Quasilinear with source (non-straight characteristics)

**PDE:** rho_t - rho rho_x = -2rho   (Haberman §12.6.5, eq. 12.6.36, p. 579)
**Initial data:** rho(x, 0) = f(x)
**Characteristic ODEs:**
    drho/dt = -2rho   =>   rho(t) = f(x_0) e^{-2t}
    dx/dt = -rho = -f(x_0) e^{-2t}   =>   x = (1/2)f(x_0)(e^{-2t} - 1) + x_0
**What's interesting:** Characteristics are curved (not straight) because the source term makes u vary along them, which in turn changes the characteristic speed. With f(x) = x, exact solution: x_0 = 2x/(1 + e^{-2t}), rho = 2x e^{-2t}/(1 + e^{-2t}).
**Source:** Haberman §12.6.5, pp. 579--581

### Preset 10 (bonus): Shock + expansion coexisting

**PDE:** rho_t + rho^2 rho_x = 0  (c(rho) = rho^2, q = rho^3/3)
**Initial data:** rho(x, 0) = -1 for x < 0, rho(x, 0) = 2 for x > 0
**Characteristics:** From left: speed (-1)^2 = 1. From right: speed 4. Gap between speeds 1 and 4 fills with a rarefaction fan from x = 0. But simultaneously, characteristics from x < 0 (rho = -1, speed 1) cross those in the fan (which have speeds > 1), producing a nonuniform shock.
**Expansion fan:** rho = sqrt(x/t) for t < x < 4t.
**Shock path:** dx/dt = (1/3)(1 + rho_fan + rho_fan^2) -- a nonlinear ODE.
**What's interesting:** Both shock and expansion from a single discontinuity. Shows the full complexity of quasilinear behavior.
**Source:** Haberman §12.6.4, pp. 573--575

---

## 5. Key Formulas

### Breaking time (general quasilinear)

For u_t + c(u) u_x = 0 with u(x, 0) = f(x), define F(x_0) = c(f(x_0)):

    t_break = -1 / min_{x_0} {F'(x_0)}  =  -1 / min_{x_0} {c'(f(x_0)) f'(x_0)}

provided the minimum is negative. If F' >= 0 everywhere, no shock forms.

**For Burgers (c(u) = u):** t_break = -1 / min f'(x)

**Source:** Haberman §12.6.4, eq. 12.6.35, p. 578; Rauch Thm 2, §1.9, p. 56

### Shock speed (Rankine--Hugoniot)

For the conservation law u_t + F(u)_x = 0 with a shock between u_L (left) and u_R (right):

    s = [F(u)] / [u] = (F(u_L) - F(u_R)) / (u_L - u_R)

**For Burgers (F(u) = u^2/2):** s = (u_L + u_R) / 2

**For traffic flow (F(rho) = u_max rho(1 - rho/rho_max)):**
    s = u_max(1 - (rho_L + rho_R)/rho_max)

**Source:** Haberman §12.6.4, eqs. 12.6.20, 12.6.22, pp. 569--570; Evans §3.4

### Entropy condition

    c(u_L) > s > c(u_R)

i.e., characteristics on both sides impinge on the shock. Shocks that violate this are unphysical and should be replaced by rarefaction fans.

**Source:** Haberman §12.6.4, eq. 12.6.23, p. 571

### Implicit solution formula (quasilinear, before shock)

For u_t + c(u) u_x = 0, u(x, 0) = f(x):

    u(x, t) = f(x_0)  where  x = c(f(x_0)) t + x_0

This is an implicit equation for u. Valid as long as the mapping x_0 -> x is invertible, i.e., for t < t_break.

**Jacobian:** dx/dx_0 = 1 + c'(f(x_0)) f'(x_0) t. Solution breaks down when this vanishes.

**Source:** Evans §3.2.5b, eq. (61), p. 114; Haberman §12.6.3, eq. 12.6.16, p. 564

### Caustic (envelope) parametric formula

For the family of straight-line characteristics x = F(x_0) t + x_0:

    x_caustic = -F(x_0)/F'(x_0) + x_0
    t_caustic = -1/F'(x_0)

The caustic has a cusp at the point where F''(x_0) = 0.

**Source:** Haberman §12.6.4, eqs. 12.6.34--35, p. 578

### Rarefaction fan formula

For u_t + c(u) u_x = 0 with step data u_L (x < 0), u_R (x > 0), and c(u_L) < c(u_R) (fan case):

The fan characteristics from x = 0 have speeds c ranging from c(u_L) to c(u_R). The solution in the fan is determined by:

    x/t = c(u)  =>  u = c^{-1}(x/t)

**For Burgers (c(u) = u):** u = x/t in the fan region g(a)t < x < g(b)t.

**For traffic (c(rho) = u_max(1 - 2rho/rho_max)):** rho = (rho_max/2)(1 - x/(u_max t)).

**Source:** Haberman §12.6.3, pp. 565--567; Rauch §1.9, p. 56

### Noncharacteristic condition (Evans)

The boundary data surface Gamma is noncharacteristic at a point x^0 if (Evans Lemma 1, §3.2.3, p. 105):

    F_{p_n}(p^0, z^0, x^0) != 0

equivalently D_p F(p^0, z^0, x^0) . nu(x^0) != 0 where nu is the normal to Gamma.

For the quasilinear case b(x, u) . Du + c(x, u) = 0, this becomes b(x^0, z^0) . nu(x^0) != 0.

**Significance for visualization:** The local existence theorem (Evans Thm 2, §3.2.4, p. 107) guarantees a unique smooth local solution near noncharacteristic boundary data. Failure of this condition means the boundary is tangent to a characteristic -- the method of characteristics cannot uniquely determine the solution there.

**Source:** Evans §3.2.3, Lemma 1, p. 105; Courant v2, Ch II §7, pp. 97--102

### Propagation of singularities (Rauch)

**Rauch Thm 1, §1.9, p. 53:** For linear equations Pu = 0 where P has C^infinity coefficients, if u is piecewise smooth and Pu in C^infinity, then the singular surface Sigma of u must be characteristic.

**Consequence for visualization:** Discontinuities and kinks in the initial data propagate along characteristic curves. Singularities cannot appear on noncharacteristic surfaces. This is why, for the wave equation, discontinuities travel at speed c.

**Source:** Rauch §1.9, Thm 1, p. 53

### D'Alembert's formula (wave equation connection)

The wave equation u_{tt} = c^2 u_{xx} factors as (partial_t + c partial_x)(partial_t - c partial_x)u = 0, producing two families of characteristics x - ct = const and x + ct = const. (Haberman §12.3.1, p. 544; Rauch §1.8, Thm 5, p. 47)

D'Alembert's solution:

    u(x, t) = (f(x + ct) + f(x - ct))/2 + (1/(2c)) integral from x-ct to x+ct of g(s) ds

**Domain of dependence:** The solution at (x, t) depends on initial data in [x - ct, x + ct].
**Domain of influence:** The initial data at x affects the solution in the cone |x' - x| <= ct.

**Source:** Haberman §12.3.3, eq. 12.3.13, p. 549; Rauch Thm 5, §1.8, p. 47

### Hamilton--Jacobi and the Hopf--Lax formula

For u_t + H(Du) = 0, u(x, 0) = g(x), with H convex and superlinear, the Hopf--Lax formula gives (Evans Thm 4, §3.3.2, p. 124):

    u(x, t) = min_y { t L((x - y)/t) + g(y) }

where L is the Legendre transform of H. This provides the weak (viscosity) solution even after characteristics cross.

**Source:** Evans §3.3.2, Thm 4--6, pp. 124--129

---

## Notes for Implementation

**Coordinate conventions:** Throughout, x is the spatial axis (horizontal), t is time (vertical in characteristic diagrams). Characteristics are curves in the (x, t)-plane. The solution u is displayed either as color on the (x, t)-plane or as height in a separate u-vs-x plot for fixed t.

**Numerical validation strategy:** For every preset, there is an exact or semi-exact solution. Use these to validate the ODE integrator:
- Presets 1, 7, 8: exact closed-form solutions
- Presets 2, 3: exact via characteristic formula
- Presets 4, 5, 6: exact for the piecewise-linear cases, implicit formula otherwise
- Preset 9: exact with given f(x) = x

**Units and scaling:** For traffic flow examples, natural units are rho_max = 1, u_max = 1. For Burgers, no natural scale -- the breaking time formula provides the relevant timescale.
