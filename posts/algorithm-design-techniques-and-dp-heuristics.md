---
title: Algorithm Design Techniques, Growth Functions, and When DP Becomes Heuristic
summary: A compact guide to asymptotic notation, dynamic programming, divide-and-conquer, greedy algorithms, backtracking, and branch-and-bound.
date: 2026-07-23
labels: algorithms
---

Check out my repositories for data structures and algorthms in graphs> - [Trees_n_Graphs](https://github.com/marcotulio956/Trees_n_Graphs)
I've analyzed complexities in some classical algorithms here> - [algo.project_n_analysis.PAA](https://github.com/marcotulio956/algo.project_n_analysis.PAA)

# Algorithm Design Techniques, Growth Functions, and When DP Becomes Heuristic

Before choosing an algorithm, it helps to know two things: how its running time grows, and what kind of guarantee it actually gives. This post is a practical guide to five core design techniques—dynamic programming, divide-and-conquer, greedy algorithms, backtracking, and branch-and-bound—with definitions, examples, and an important distinction between *exact* methods and heuristics.

For the complexity-theory side of the story, see [NP-Completeness, SAT, and Why We Use Heuristics for Clock-Tree Routing](./np-completeness-clrs-steiner-tree-vlsi.md).

## Growth functions and asymptotic notation

Let `n` be the input size and let `T(n)` be the running time (or other resource use) of an algorithm. Asymptotic notation ignores constant factors and lower-order terms so that we can compare growth as `n` becomes large.

The main definitions are:

$$
f(n) \in O(g(n))
\iff
\exists c>0, n_0\ \text{such that}\ 0 \le f(n) \le c\,g(n)
\ \text{for every}\ n\ge n_0.
$$

$$
f(n) \in \Omega(g(n))
\iff
\exists c>0, n_0\ \text{such that}\ 0 \le c\,g(n) \le f(n)
\ \text{for every}\ n\ge n_0.
$$

$$
f(n) \in \Theta(g(n))
\iff
f(n) \in O(g(n))\ \text{and}\ f(n) \in \Omega(g(n)).
$$

In plain language: `O` is an eventual upper bound, `Ω` an eventual lower bound, and `Θ` a tight asymptotic bound. For example,

$$
3n^2 + 10n + 7 \in \Theta(n^2).
$$

The usual growth-rate ladder is:

$$
1\;<\;\log n\;<\;n\;<\;n\log n\;<\;n^2\;<\;n^3\;<\;2^n\;<\;n!.
$$

The base of a logarithm does not matter asymptotically because changing bases multiplies by a constant. The jump from polynomial growth (`n^k`) to exponential growth (`c^n`) matters enormously: a method that is perfect for `n = 30` may be unusable at `n = 300`.

| Example algorithm | Typical running time | Why it matters |
| --- | --- | --- |
| Binary search | `Θ(log n)` | Halving the search space is powerful. |
| Merge sort | `Θ(n log n)` | Sorting is near-linear up to the log factor. |
| All pairs of vertices | `Θ(n^2)` | Often manageable for moderate graphs. |
| Held–Karp TSP dynamic program | `Θ(n^2 2^n)` | Exact, but exponential in the number of cities. |
| Enumerate all permutations | `Θ(n!)` | Explodes even faster than `2^n`. |

## Dynamic programming (DP)

**Definition.** Dynamic programming solves a problem by identifying overlapping subproblems, solving each state once, and reusing the result. It applies when an optimal solution is assembled from optimal solutions to smaller states—often called *optimal substructure*.

There are two common implementations:

* **Memoization (top-down):** recursively ask for the needed states and cache answers.
* **Tabulation (bottom-up):** fill states in an order where dependencies are already known.

### Example: 0/1 knapsack

Given items with values `v_i`, weights `w_i`, and capacity `W`, define `DP[i,w]` as the best value using the first `i` items with capacity `w`.

$$
DP[i,w] =
\begin{cases}
DP[i-1,w], & w_i > w,\\
\max\{DP[i-1,w],\ v_i + DP[i-1,w-w_i]\}, & w_i \le w.
\end{cases}
$$

```text
KNAPSACK-DP(values, weights, W)
    DP[0, 0..W] ← 0

    for i ← 1 to number of items
        for w ← 0 to W
            DP[i, w] ← DP[i - 1, w]
            if weights[i] ≤ w
                DP[i, w] ← max(DP[i, w],
                               values[i] + DP[i - 1, w - weights[i]])

    return DP[number of items, W]
```

This is an **exact** algorithm for the stated 0/1 knapsack problem, with time `Θ(nW)` and space `Θ(nW)` (or `Θ(W)` after a standard space optimization). Notice the caveat: if `W` is encoded in binary, `nW` is pseudo-polynomial rather than polynomial in the input length.

### Is DP a heuristic?

Not by default. Full DP is an exact method whenever it explores every state and uses an exact recurrence. DP becomes heuristic when we intentionally trade completeness for speed, for example:

* **Beam DP:** retain only the best `B` partial states at each stage instead of all states.
* **State aggregation:** round time, capacity, or locations into buckets so that many states share one approximate state.
* **Restricted horizon:** optimize only the next few decisions, commit one, then repeat (a rolling-horizon heuristic).
* **Relaxed DP bounds:** solve an easier DP relaxation to estimate a lower bound inside branch-and-bound.

For a routing example, a DP that remembers every subset of `k` terminals can be exact but exponential in `k`. Keeping only a limited set of promising partial trees is fast and useful, but it is now a heuristic: the discarded state may have led to the optimum.

## Divide-and-conquer

**Definition.** Divide-and-conquer splits an instance into smaller, usually independent subinstances; solves them recursively; then combines their answers.

$$
T(n) = aT(n/b) + D(n) + C(n),
$$

where `a` is the number of subproblems, each has roughly size `n/b`, `D(n)` is division work, and `C(n)` is combination work.

### Example: merge sort

```text
MERGE-SORT(A)
    if |A| ≤ 1
        return A

    split A into left and right halves
    left  ← MERGE-SORT(left)
    right ← MERGE-SORT(right)
    return MERGE(left, right)
```

For merge sort,

$$
T(n) = 2T(n/2) + \Theta(n) = \Theta(n\log n).
$$

This is exact: the merge step preserves all elements and produces a sorted result. Divide-and-conquer becomes a heuristic when the decomposition deliberately ignores interactions between parts. For example, a large clock-routing instance can be partitioned into geographic sink clusters, each cluster can be routed well, and the cluster roots can then be connected. That is fast and often effective, but a globally optimal tree may cross the chosen cluster boundary in a better way.

## Greedy algorithms

**Definition.** A greedy algorithm repeatedly makes the locally best available choice and never revisits it. A greedy choice is safe only when a proof—often an exchange argument, a cut property, or a matroid argument—shows that some global optimum contains it.

### Example where greedy is exact: minimum spanning tree

Kruskal’s algorithm sorts graph edges by weight and adds an edge whenever it does not make a cycle.

```text
KRUSKAL(G)
    T ← empty set
    sort E(G) by nondecreasing edge weight
    make one disjoint-set component for each vertex

    for each edge (u, v) in sorted order
        if FIND-SET(u) ≠ FIND-SET(v)
            T ← T ∪ {(u, v)}
            UNION(u, v)

    return T
```

The cut property proves this returns an MST. With sorting, its running time is `O(E log E)`.

### Example where greedy is only a heuristic: nearest-neighbor TSP

Start from a city; repeatedly visit the closest unvisited city; finally return to the start. It is simple and creates a valid tour quickly, but the locally short edge can force an expensive final jump. There is no general optimality guarantee for this greedy rule.

In physical design, greedy routing is often a great *seed*: connect the easiest or cheapest pin first, then improve the topology. Do not mistake “a good seed” for “a proof of optimality.”

## Backtracking

**Definition.** Backtracking is depth-first search over a space of partial candidates. It abandons a partial candidate as soon as it violates a feasibility constraint. If it eventually explores every remaining legal branch, it is exact for feasibility and can be exact for optimization with appropriate bookkeeping.

### Example: the N-queens problem

```text
PLACE-QUEENS(row)
    if row > n
        report the current placement
        return

    for col ← 1 to n
        if column col is not attacked in row
            place a queen at (row, col)
            PLACE-QUEENS(row + 1)
            remove the queen from (row, col)
```

The “is not attacked” test prunes clearly impossible partial boards. In the worst case, backtracking still has exponential behavior, but intelligent variable ordering and constraint propagation can make it dramatically faster on real instances. SAT solvers use much more sophisticated descendants of this idea.

## Branch-and-bound

**Definition.** Branch-and-bound is an optimization search method. Like backtracking, it branches on decisions. Unlike plain backtracking, it computes a **bound** on the best solution that could still be found below a partial solution. If that bound cannot beat the best complete solution already known (the *incumbent*), prune the branch.

For minimization, if `LB(node)` is a valid lower bound and `C(best)` is the incumbent cost, then

$$
LB(\text{node}) \ge C(\text{best})
\quad\Longrightarrow\quad
\text{the node may be pruned}.
$$

### Example: 0/1 knapsack with a fractional upper bound

For maximization, a common bound fills remaining capacity using fractions of remaining items sorted by value/weight ratio. The fractional fill may be illegal for the actual 0/1 problem, but it is an **upper bound** on what a descendant can achieve. A node whose upper bound cannot exceed the incumbent value is safely discarded.

```text
BRANCH-AND-BOUND-KNAPSACK(node, best)
    if node is infeasible
        return best

    if UPPER-BOUND(node) ≤ VALUE(best)
        return best

    if node is a complete solution
        return the better of node and best

    for child in BRANCH(node)             // take next item / skip next item
        best ← BRANCH-AND-BOUND-KNAPSACK(child, best)

    return best
```

Branch-and-bound is exact **if** its bounds are valid and the algorithm terminates only after all unpruned branches are handled. In practice it is often paired with heuristics: a better initial feasible solution raises the incumbent quality and enables more pruning.

## How the techniques fit together

| Technique | Basic move | Exact by default? | Example | How it becomes heuristic |
| --- | --- | --- | --- | --- |
| Dynamic programming | Reuse solved states | Yes, with full state space | 0/1 knapsack | Beam/state-limited/aggregated DP |
| Divide-and-conquer | Split, solve, combine | Yes, if decomposition is exact | Merge sort | Cluster a global routing problem and merge |
| Greedy | Commit to a local choice | Only with a proof | Kruskal MST | Nearest-neighbor TSP |
| Backtracking | Explore partial solutions, prune infeasible ones | Yes, if exhaustive | N-queens | Stop early or cap the search budget |
| Branch-and-bound | Explore choices, prune using bounds | Yes, with valid bounds and exhaustive completion | Knapsack | Stop early and return the incumbent |

Here is a good practical recipe for an NP-hard engineering problem such as timing-aware Steiner-style routing:

1. Use **divide-and-conquer** to cluster a huge instance into manageable regions.
2. Build a feasible initial solution with a **greedy** constructor.
3. Apply local search or a metaheuristic to improve it.
4. Use a small **dynamic program** for a cluster, restricted topology, or high-quality bound.
5. Use **backtracking** or **branch-and-bound** for a small residual problem where an exact answer is worth the runtime.

The point is not to choose one technique forever. Good solvers combine them while staying honest about which components are exact, approximate, or heuristic.

## Further reading

* T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, *Introduction to Algorithms*, 4th ed., MIT Press, 2022. Especially the chapters on divide-and-conquer, dynamic programming, greedy algorithms, and NP-completeness.
* See the companion [NP-completeness and VLSI clock-tree routing post](./np-completeness-clrs-steiner-tree-vlsi.md) for reductions, SAT, Cook–Levin, and Steiner-tree heuristics.

