---
title: How to use Julia packages using calls in R scripts
summary: example for the DiffEqBase package for speeding up performance in R 
date: 2026-07-22
labels: algortihms, crn
---

## Install and precompile the Julia side

Julia packages are managed by Julia's built-in `Pkg` package. The following layer installs the packages used here and precompiles them, which is particularly useful in a container build because the slow first-use work happens at image-build time.

```dockerfile
# Install & precompile the Julia packages used by diffeqr/SciML
RUN julia -e '\
using Pkg; \
Pkg.Registry.update(); \
Pkg.add([ \
    "Suppressor", \
    "RCall", \
    "DiffEqBase", \
    "SciMLBase", \
    "DifferentialEquations" \
]); \
Pkg.precompile();'
```

`DifferentialEquations` is the main SciML meta-package. `DiffEqBase` and `SciMLBase` are installed explicitly because the R bindings and code evaluated in Julia may refer to their types/functions directly.

### Optional: load SciML packages at Julia startup

When code submitted from R refers to Julia names in `Main`, it helps to make the relevant packages available there. This startup hook avoids errors such as `UndefVarError: DiffEqBase not defined in Main`.

```dockerfile
RUN mkdir -p /root/.julia/config && \
    echo "try; using DiffEqBase, SciMLBase, DifferentialEquations; catch e; @warn \"Could not auto-load SciML packages\" exception=e; end" \
    > /root/.julia/config/startup.jl
```

This is convenient in a single-purpose container. For a reusable project, I prefer a Julia project environment (`Project.toml`/`Manifest.toml`) and an explicit `using DifferentialEquations` in the Julia initialization code, so dependencies are visible and reproducible.

Finally, initialize the bridge during the image build. `julia_setup(rebuild = TRUE)` configures JuliaCall; `diffeq_setup()` initializes the R-facing SciML bindings.

```dockerfile
RUN Rscript -e 'library(JuliaCall); julia_setup(rebuild = TRUE); library(diffeqr); diffeq_setup()'
```

At runtime, call `diffeq_setup()` once per R session before solving. If your process has not already initialized JuliaCall, call `JuliaCall::julia_setup()` first.

```r
library(JuliaCall)
library(diffeqr)

JuliaCall::julia_setup()
de <- diffeqr::diffeq_setup()
```

## A CRN solver implemented from R

Here is the full helper. It accepts a time grid, initial concentrations, a stoichiometry matrix (`Mt`), per-reaction reactant indices and exponents, and numeric rate constants (`ki`). It then defines the derivative function in Julia, creates an `ODEProblem`, and solves it through `diffeqr`.

```r
solve_crn_diffeqr <- function(t, ci, Mt, reactant_map, v_exp_reactants, ki) {
    if (!all(vapply(ki, is.numeric, logical(1)))) {
        stop("The 'diffeqr' engine currently supports numeric constant ki values only.")
    }

    if (!requireNamespace("diffeqr", quietly = TRUE) ||
        !"diffeq_setup" %in% getNamespaceExports("diffeqr")) {
        stop("The 'diffeqr' engine requires the diffeqr package with diffeq_setup().")
    }

    de <- diffeqr::diffeq_setup(pkg_check = TRUE)

    JuliaCall::julia_assign("crn_M", Mt)
    JuliaCall::julia_assign("crn_k", as.numeric(ki))
    JuliaCall::julia_assign("crn_u0", as.numeric(ci))
    JuliaCall::julia_assign("crn_tspan", c(min(t), max(t)))
    JuliaCall::julia_assign(
        "crn_reactant_map",
        lapply(reactant_map, function(r_map) {
            if (length(r_map) == 1 && is.na(r_map[1])) integer(0) else as.integer(r_map)
        })
    )
    JuliaCall::julia_assign(
        "crn_exp_map",
        lapply(v_exp_reactants, as.numeric)
    )

    JuliaCall::julia_command(paste0(
        "function crn_ode(u, p, t)\n",
        "    v = zeros(length(crn_k))\n",
        "    for i in eachindex(crn_k)\n",
        "        react_map = crn_reactant_map[i]\n",
        "        if isempty(react_map)\n",
        "            v[i] = crn_k[i]\n",
        "        else\n",
        "            term = crn_k[i]\n",
        "            exps = crn_exp_map[i]\n",
        "            for j in eachindex(react_map)\n",
        "                term *= u[react_map[j]] ^ exps[j]\n",
        "            end\n",
        "            v[i] = term\n",
        "        end\n",
        "    end\n",
        "    return vec(crn_M * v)\n",
        "end"
    ))

    prob <- JuliaCall::julia_eval("ODEProblem(crn_ode, crn_u0, crn_tspan)")

    sol <- de$solve(
        prob, de$Tsit5(), saveat = as.numeric(t), abstol = 1e-8, reltol = 1e-8
    )

    list(
        time = as.numeric(unlist(as.list(sol$t))),
        values = do.call(rbind, lapply(as.list(sol$u), as.numeric))
    )
}
```

## What each bridge call does

The three JuliaCall calls are the heart of the interop pattern:

* `julia_assign(name, value)` copies an R object into Julia under `name`. In this example, the stoichiometry matrix, rate constants, initial state, and reaction metadata become Julia variables.
* `julia_command(code)` executes Julia source code for its side effects. We use it to define `crn_ode(u, p, t)`.
* `julia_eval(code)` evaluates Julia code and returns its result to R. Here it returns a Julia `ODEProblem` object, which `diffeqr` can solve directly.

The Julia function calculates one rate per reaction. For a reaction with reactants, it builds the mass-action term `k * product(u[reactant]^exponent)`. An empty reactant map represents a zero-order reaction, so its rate is just `k`. Finally, `crn_M * v` turns the vector of reaction rates into species derivatives.

One important detail: Julia is 1-indexed, as is R. The reactant indices in `reactant_map` should therefore be species positions starting at 1. The code explicitly converts them to integers before sending them over.

## A tiny usage sketch

For the irreversible reaction `A -> B` with rate `k * A`, the stoichiometry matrix has one reaction column: A decreases and B increases.

```r
t <- seq(0, 10, length.out = 101)

out <- solve_crn_diffeqr(
    t = t,
    ci = c(A = 1, B = 0),
    Mt = matrix(c(-1, 1), nrow = 2),
    reactant_map = list(1L),
    v_exp_reactants = list(1),
    ki = list(0.4)
)

matplot(out$time, out$values, type = "l", lty = 1,
        xlab = "time", ylab = "concentration")
legend("topright", legend = c("A", "B"), col = 1:2, lty = 1)
```

`out$values` has one row per saved time and one column per species, which makes it easy to plot or join back to the rest of an R analysis pipeline.


That is the basic recipe! R stays in charge of the application and results, while Julia handles the your package command.