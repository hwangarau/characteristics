# 50 Method of Characteristics Problems

*All problems are analytically solvable (explicit or implicit). No solutions provided.*

---

## Linear, Constant Coefficients

**1.** $u_t + 3u_x = 0$, $\quad u(x,0) = e^{-x^2}$.

**2.** $u_t - 2u_x = 0$, $\quad u(x,0) = \sin(x)$.

**3.** $u_t + u_x = 5$, $\quad u(x,0) = 0$.

**4.** $u_t + 4u_x = -u$, $\quad u(x,0) = e^{-x}$.

**5.** $u_t + u_x = 3u$, $\quad u(x,0) = \cos(x)$.

---

## Linear, Variable Coefficients in $t$

**6.** $u_t + t\,u_x = 0$, $\quad u(x,0) = x^2$.

**7.** $u_t + e^t u_x = 1$, $\quad u(x,0) = 0$.

**8.** $u_t + 2t\,u_x = tu$, $\quad u(x,0) = f(x)$.

**9.** $u_t + \cos(t)\,u_x = 0$, $\quad u(x,0) = e^{-|x|}$.

**10.** $u_t + (1+t)^{-1}u_x = 0$, $\quad u(x,0) = \ln(1+x^2)$.

---

## Linear, Variable Coefficients in $x$

**11.** $u_t + x\,u_x = 0$, $\quad u(x,0) = e^{-x^2}$.

**12.** $u_t + 2x\,u_x = 0$, $\quad u(x,0) = x^3$.

**13.** $u_t + x\,u_x = u$, $\quad u(x,0) = x$.

**14.** $u_t - x\,u_x = 0$, $\quad u(x,0) = \sin(x)$.

*For problems 11–14, verify that characteristics never cross by computing $\partial X/\partial x_0$.*

---

## Linear, Variable Coefficients in $x$ and $t$

**15.** $u_t + xt\,u_x = 0$, $\quad u(x,0) = f(x)$.

**16.** $u_t + \frac{x}{1+t}\,u_x = 0$, $\quad u(x,0) = x^2 + 1$.

**17.** $u_t + (x+t)\,u_x = 1$, $\quad u(x,0) = 0$.

*(Problem 17: the $X$ ODE is $X' = X + t$, a linear first-order ODE.)*

---

## Source Terms: ODE Practice Along Characteristics

**18.** $u_t + u_x = u^2$, $\quad u(x,0) = \frac{1}{1+x^2}$.

*Find the solution and determine whether blowup occurs in finite time.*

**19.** $u_t + 2u_x = -u^2$, $\quad u(x,0) = \frac{1}{x}$ for $x > 0$.

**20.** $u_t + u_x = u(1-u)$, $\quad u(x,0) = \frac{1}{1+e^x}$.

*(Logistic ODE along characteristics.)*

**21.** $u_t + u_x = \sqrt{u}$, $\quad u(x,0) = x^2$ for $x > 0$.

*(Separable ODE. Is Picard–Lindelöf satisfied at $u = 0$?)*

**22.** $u_t + 3u_x = e^{-t}u$, $\quad u(x,0) = \sin(x)$.

**23.** $u_t + u_x = t$, $\quad u(x,0) = x$.

**24.** $u_t + u_x = t^2 - u$, $\quad u(x,0) = 0$.

*(Linear first-order ODE for $U$ with integrating factor.)*

---

## Quasilinear: Burgers-Type

**25.** $u_t + u\,u_x = 0$, $\quad u(x,0) = \begin{cases} 1, & x < 0 \\ 1 - x, & 0 \leq x \leq 1 \\ 0, & x > 1 \end{cases}$.

*Find the solution before breakdown. Compute the breakdown time $t^*$.*

**26.** $u_t + u\,u_x = 0$, $\quad u(x,0) = \begin{cases} 0, & x < 0 \\ x, & 0 \leq x \leq 1 \\ 1, & x > 1 \end{cases}$.

*Show that no shock forms.*

**27.** $u_t + u\,u_x = 0$, $\quad u(x,0) = e^{-x^2}$.

*The solution is implicit: $u = e^{-(x-ut)^2}$. Find $t^*$ (the breakdown time). At which $x_0$ does the first shock form?*

**28.** $u_t + u\,u_x = 0$, $\quad u(x,0) = -\tanh(x)$.

*Determine $t^*$ and describe where the compression zone is.*

**29.** $u_t + u\,u_x = 0$, $\quad u(x,0) = \cos(x)$ for $x \in [-\pi, \pi]$.

*Find the breakdown time. Where does the first shock form?*

---

## Quasilinear: Other Flux Functions

**30.** $u_t + u^2\,u_x = 0$, $\quad u(x,0) = \frac{1}{1+x^2}$.

*Write down the implicit solution. Determine whether a shock forms (check the sign condition on $a'(f)f'$).*

**31.** $u_t + u^2\,u_x = 0$, $\quad u(x,0) = -e^{-x^2}$.

*Does a shock form? Compare with problem 30.*

**32.** $u_t + \frac{1}{u}\,u_x = 0$ for $u > 0$, $\quad u(x,0) = 1 + x$ for $x > 0$.

*Here $a(u) = 1/u$. Find $a'(u)$ and determine whether characteristics compress or expand.*

**33.** $u_t + (1+u)u_x = 0$, $\quad u(x,0) = -\sin(x)$.

*Find $t^*$ and the location of first shock formation.*

---

## Quasilinear with Source Terms

**34.** $u_t + u\,u_x = -u$, $\quad u(x,0) = f(x)$.

*Solve for $U(t)$ and $X(t)$. Show that $\frac{\partial X}{\partial x_0} = 1 + f'(x_0)(1 - e^{-t})$ and determine conditions on $f'$ for shock formation.*

**35.** $u_t + u\,u_x = 1$, $\quad u(x,0) = 0$.

*The solution value grows linearly: $U = t$. Find the characteristic curves and the explicit solution.*

**36.** $u_t + u\,u_x = u$, $\quad u(x,0) = e^{-x^2}$.

*Solve for $U(t)$ and $X(t)$. Does the source term accelerate or delay shock formation compared to the sourceless case?*

**37.** $u_t + u^2 u_x = -2u$, $\quad u(x,0) = f(x)$ with $f > 0$.

*Find $U(t)$ along characteristics. Then determine $X(t)$.*

---

## Bounded Domains: Two-Region Problems

**38.** $u_t + 2u_x = 0$ on $[0, 1]$, $\quad u(x,0) = \sin(\pi x)$, $\quad u(0,t) = 0$.

*Find the dividing characteristic. Write the solution in both regions. Verify continuity at the dividing curve.*

**39.** $u_t + u_x = 1$ on $[0, 1]$, $\quad u(x,0) = 0$, $\quad u(0,t) = t$.

*Find the solution in both regions. Check the compatibility condition.*

**40.** $u_t + 3u_x = -u$ on $[0, 2]$, $\quad u(x,0) = e^{-x}$, $\quad u(0,t) = e^{-t}$.

*Find the solution in both regions. Verify continuity across the dividing characteristic.*

**41.** $u_t + u_x = 0$ on $[0, 1]$, $\quad u(x,0) = x$, $\quad u(0,t) = \sin(t)$.

*Find the solution in both regions. Is the solution continuous across the dividing curve? Why or why not?*

---

## Transversality and Boundary Issues

**42.** $u_t + u_x = 0$, with data prescribed along the line $x = t$: $u(t, t) = g(t)$.

*Show that this is ill-posed. What is the relationship between the data curve and the characteristics?*

**43.** $u_t + 2u_x = 0$, with data prescribed along $x = 3t$: $u(3t, t) = e^{-t}$.

*Is this well-posed? (Check transversality: is the data curve tangent to the characteristics?)*

**44.** $u_t - u_x = 0$ on $[0, 1]$, $\quad u(x,0) = f(x)$.

*Where is the inflow boundary? Where should the BC be prescribed? What happens if you prescribe $u(0,t) = 0$?*

---

## Conservation Form and Rankine–Hugoniot

**45.** For $u_t + (u^2/2)_x = 0$, a shock has left state $u_L = 2$ and right state $u_R = 0$. Find the shock speed.

**46.** For $u_t + (u^3/3)_x = 0$, a shock has $u_L = 1$, $u_R = -1$. Find the shock speed and compare with the characteristic speeds on each side.

**47.** Consider $u_t + uu_x = 0$ with $u(x,0) = \begin{cases} 1 & x < 0 \\ 0 & x > 0 \end{cases}$.

*This is a Riemann problem. Find the shock speed and write the weak solution for $t > 0$.*

**48.** Same equation, reversed data: $u(x,0) = \begin{cases} 0 & x < 0 \\ 1 & x > 0 \end{cases}$.

*Show that a shock solution would move at speed $1/2$, but characteristics diverge (rarefaction). The correct solution is a rarefaction fan: $u = x/t$ for $0 < x < t$. Verify this satisfies the PDE.*

---

## Conceptual/Structural

**49.** Consider $u_t + a(u)u_x = 0$ with $a(u) = u^3 - u$.

This flux function has $a'(u) = 3u^2 - 1$, which changes sign at $u = \pm 1/\sqrt{3}$. Given smooth initial data $f(x)$ with $f(0) = 0$ and $f'(0) < 0$:

(a) At $x_0 = 0$: $a(f(0)) = 0$ and $a'(f(0)) = -1$. What is the compression condition?

(b) Compare this with Burgers ($a(u) = u$) using the same initial data. Which equation has the earlier breakdown time?

**50.** $u_t + u\,u_x = 0$, $\quad u(x,0) = A\sin(x)$ for $A > 0$.

(a) Find $t^*$ as a function of $A$.

(b) Show that doubling the amplitude halves the breakdown time.

(c) The solution is $u = A\sin(x - ut)$. At $t = t^*/2$, sketch the solution profile and identify where it has steepened.
