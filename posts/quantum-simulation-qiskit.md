---
title: Simulating Quantum Systems with Quantum Circuits in Qiskit
summary: From the Schrödinger equation to Hamiltonian simulation, Trotterization, spin models, quantum oscillators, and quantum algorithms using Qiskit.
date: 2026-10-07
labels: quantum-computing, qiskit, algorithms, simulation
---

# Simulating Quantum Systems with Quantum Circuits in Qiskit

Quantum circuits can represent more than logical computations. They can also approximate the time evolution of physical quantum systems. This is the foundation of **digital quantum simulation**: encode a model in qubits, express its dynamics as an evolution operator, decompose that operator into elementary gates, and measure observables of interest.

This post develops the mathematical foundations and a practical gate-based workflow with Qiskit. It starts with the Schrödinger equation, derives product-formula approximations such as Trotterization, and applies them to spin systems. It also discusses a truncated quantum harmonic oscillator, time-dependent Hamiltonians, and the relationship between Hamiltonian simulation and algorithmic circuits such as quantum phase estimation and Shor's algorithm.

The examples use the Qiskit SDK and its state-vector tools. A classical state-vector run is useful for checking a circuit on small systems; executing the same circuit on quantum hardware introduces measurement statistics and hardware noise.

## 1. The dynamics of a quantum system

A pure quantum state is represented by a normalized vector in a Hilbert space:

\[
|\psi(t)\rangle \in \mathcal{H}, \qquad \langle\psi(t)|\psi(t)\rangle=1.
\]

For a closed system, its time evolution is governed by the time-dependent Schrödinger equation,

\[
\boxed{ i\hbar\frac{d}{dt}|\psi(t)\rangle = H(t)|\psi(t)\rangle },
\]

where \(H(t)\) is the Hamiltonian and \(\hbar\) is the reduced Planck constant. The Hamiltonian is Hermitian, so the evolution preserves the state's norm.

When the Hamiltonian does not depend on time, the solution is

\[
\boxed{ |\psi(t)\rangle = U(t)|\psi(0)\rangle,
\qquad U(t)=e^{-iHt/\hbar}. }
\]

The operator \(U(t)\) is unitary because \(H=H^\dagger\). It contains all the information needed to evolve any initial state under that Hamiltonian.

For a time-dependent Hamiltonian, Hamiltonians at different times need not commute. The solution is then written using the time-ordering operator:

\[
U(t,0)=\mathcal{T}\exp\left[-\frac{i}{\hbar}
\int_0^t H(s)\,ds\right].
\]

Time ordering, denoted by \(\mathcal{T}\), ensures that factors associated with later times appear in the correct order. If \([H(t_1),H(t_2)]=0\) for all times, the time-ordering operator is unnecessary and the exponential of the integral is sufficient.

### What is the simulation trying to reproduce?

Given an initial state \(|\psi(0)\rangle\), the goal is to construct a circuit whose unitary approximates \(U(t)\):

\[
U_{\mathrm{circuit}}(t)\approx U(t).
\]

The circuit produces an approximation to the evolved state,

\[
|\widetilde{\psi}(t)\rangle=U_{\mathrm{circuit}}(t)|\psi(0)\rangle,
\]

from which we estimate physical quantities. For an observable represented by a Hermitian operator \(O\), its expectation value is

\[
\boxed{\langle O\rangle_t=
\langle\psi(t)|O|\psi(t)\rangle.}
\]

Examples include energy, spin polarization, particle number, and correlations between different spins. The objective is often to estimate a small number of these quantities rather than reconstruct the full wavefunction.

## 2. Encoding a system in qubits

A register of \(n\) qubits spans a Hilbert space of dimension \(2^n\):

\[
\mathcal{H}_n=(\mathbb{C}^2)^{\otimes n}.
\]

A general pure state has the form

\[
|\psi\rangle=\sum_{x=0}^{2^n-1}\alpha_x|x\rangle,
\qquad \sum_x|\alpha_x|^2=1.
\]

The basis states \(|x\rangle\) are computational-basis bit strings, and \(\alpha_x\) are complex probability amplitudes. The probability of observing outcome \(x\) in a computational-basis measurement is \(|\alpha_x|^2\).

The physical meaning of a qubit depends on the chosen encoding. A spin-\(\tfrac12\) degree of freedom maps naturally to one qubit. Electronic occupations in quantum chemistry can be mapped to qubits as well. A harmonic oscillator, whose Hilbert space is infinite-dimensional, must first be truncated to a finite number of levels and then encoded in qubits.

Encoding is not merely a storage choice. It determines how the system's Hamiltonian is represented and how expensive its evolution is to implement as a circuit.

## 3. Representing the Hamiltonian with Pauli operators

The single-qubit Pauli operators are

\[
I=\begin{pmatrix}1&0\\0&1\end{pmatrix},\quad
X=\begin{pmatrix}0&1\\1&0\end{pmatrix},
\]

\[
Y=\begin{pmatrix}0&-i\\i&0\end{pmatrix},\quad
Z=\begin{pmatrix}1&0\\0&-1\end{pmatrix}.
\]

For qubit registers, tensor products of these operators form a basis for operators acting on the Hilbert space. A Hamiltonian can therefore be expanded as a weighted sum of Pauli strings:

\[
\boxed{H=\sum_{j=1}^{M} h_j P_j,}
\]

where the coefficients \(h_j\) are real for a Hermitian Pauli expansion and each \(P_j\) is a tensor product such as \(X_0\), \(Z_0Z_1\), or \(X_0Y_1Z_2\). Identity factors are omitted from mathematical expressions when doing so is unambiguous.

This representation is central to gate-based Hamiltonian simulation because the evolution generated by an individual Pauli string can be implemented efficiently with single-qubit rotations and entangling gates.

For one qubit, consider

\[
H=hZ.
\]

Setting \(\hbar=1\), its evolution is

\[
e^{-ihtZ}=\begin{pmatrix}e^{-iht}&0\\0&e^{iht}\end{pmatrix}.
\]

Qiskit's \(R_Z\) gate follows the convention

\[
R_Z(\theta)=e^{-i\theta Z/2},
\]

so

\[
\boxed{e^{-ihtZ}=R_Z(2ht).}
\]

The factor of two is important: a Pauli evolution for time \(t\) has a rotation angle \(2ht\) under the standard rotation-gate convention.

For a two-qubit interaction,

\[
H=JZ_0Z_1,
\]

the evolution can be implemented by conjugating a single-qubit rotation with two CNOT gates:

\[
e^{-iJtZ_0Z_1}=
\mathrm{CNOT}_{0\rightarrow1}
R_Z^{(1)}(2Jt)
\mathrm{CNOT}_{0\rightarrow1}.
\]

In circuit execution order, apply the first CNOT, then \(R_Z(2Jt)\) to qubit 1, and then the second CNOT. The circuit transforms a one-qubit phase rotation into the required two-qubit interaction.

Throughout the gate examples below, we use units with \(\hbar=1\). If the Hamiltonian coefficients are specified in physical energy units, the dimensionless angle is formed using the factor \(t/\hbar\).

## 4. Hamiltonian simulation and the Trotter problem

Suppose the Hamiltonian is a sum of terms,

\[
H=H_1+H_2+\cdots+H_M.
\]

The desired unitary is

\[
U(t)=e^{-it(H_1+H_2+\cdots+H_M)}
\]

when \(\hbar=1\). If all the terms commute with one another, then

\[
e^{-it\sum_j H_j}=\prod_j e^{-itH_j}
\]

and the factorization is exact. The main difficulty is that terms in a realistic Hamiltonian often do not commute. In general,

\[
\boxed{e^{A+B}\ne e^Ae^B.}
\]

For example, if

\[
H=JZ_0Z_1+hX_0,
\]

then

\[
[Z_0Z_1,X_0]\ne0.
\]

The interaction term and the local field term cannot simply be exponentiated separately once and multiplied together to obtain the exact evolution.

### 4.1 First-order Lie-Trotter formula

The Lie-Trotter product formula approximates the evolution over a short interval \(\Delta t\) by

\[
\boxed{
 e^{-i(H_1+H_2)\Delta t}
 \approx e^{-iH_1\Delta t}e^{-iH_2\Delta t}.
}
\]

The approximation follows from expanding both sides as a power series. The leading discrepancy depends on the commutator \([H_1,H_2]\), so the terms' failure to commute is the source of the product-formula error.

To simulate a total time \(t\), divide it into \(r\) time steps, with \(\Delta t=t/r\):

\[
\boxed{
 e^{-i(H_1+H_2)t}\approx
 \left(e^{-iH_1t/r}e^{-iH_2t/r}\right)^r.
}
\]

Each step uses shorter evolutions, reducing the local error. For a fixed total time and under standard bounded-operator assumptions, the global first-order product-formula error scales as \(O(t^2/r)\), with constants that depend on commutators and the Hamiltonian terms. Increasing \(r\) generally improves the approximation but also increases the circuit depth.

One must also be consistent about operator ordering. In a mathematical product, the rightmost operator acts first on a state. In circuit diagrams, gates are usually read from left to right in execution order. Reversing the order of the factors gives a different finite-step approximation, though both can converge to the same exact evolution as the step size approaches zero.

### 4.2 Second-order Suzuki formula

A symmetric second-order formula can reduce the product-formula error:

\[
\boxed{
 e^{-i(H_1+H_2)\Delta t}
 \approx e^{-iH_1\Delta t/2}
 e^{-iH_2\Delta t}
 e^{-iH_1\Delta t/2}.
}
\]

For a fixed total time divided into \(r\) steps, the global error of this second-order formula typically scales as \(O(t^3/r^2)\), under the usual assumptions. Higher-order Suzuki formulas are built from symmetric compositions of lower-order formulas. They can improve accuracy, but usually require additional exponentials and therefore more gates.

The choice is not simply “use as many steps as possible.” A deeper circuit takes longer to execute and accumulates more hardware errors. On quantum hardware, one balances product-formula error against gate error, qubit connectivity, and measurement cost.

### 4.3 What exactly is being approximated?

There are several distinct errors to keep separate:

- **Product-formula error:** The gate sequence only approximates the target exponential because Hamiltonian terms do not commute.
- **Synthesis error:** A high-level evolution operation must be compiled into the gates supported by a device; compilation can introduce additional approximation.
- **Encoding or truncation error:** A finite register may only represent a restricted version of the physical model, as with an oscillator cutoff.
- **Hardware and sampling error:** Real quantum devices have gate noise and measurement uncertainty. Repeated shots estimate expectation values statistically.

A classically simulated circuit can isolate product-formula error from hardware noise. It cannot, by itself, establish that the method is faster than the best classical algorithm.

## 5. Example: a two-qubit spin system

Consider a spin model with Hamiltonian

\[
\boxed{H=JZ_0Z_1+hX_0.}
\]

The \(JZ_0Z_1\) term couples the spins through a longitudinal interaction, while \(hX_0\) acts as a transverse field on qubit 0. Since these terms do not commute, this model is a simple example of a nontrivial Trotterization problem.

For a step of duration \(\Delta t\), use the first-order approximation

\[
e^{-iH\Delta t}
\approx e^{-iJZ_0Z_1\Delta t}
       e^{-ihX_0\Delta t}.
\]

The single-qubit term is implemented with \(R_X(2h\Delta t)\). The two-qubit term is implemented with CNOT–\(R_Z(2J\Delta t)\)–CNOT. Repeating these gates \(r\) times approximates evolution over total time \(t\).

### Install the dependencies

```bash
pip install qiskit scipy numpy
```

The following example constructs the Trotter circuit and compares its final state with a matrix-exponential reference. The reference calculation is practical only for small systems, but it is valuable for validating the circuit.

```python
import numpy as np
from scipy.linalg import expm

from qiskit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp, Statevector


def simulate_spin_system(J=1.0, h=0.5, time=1.0, steps=20):
    """First-order Trotter simulation of H = J*Z0*Z1 + h*X0.

    Uses hbar = 1. Here `h` is the transverse-field coefficient,
    not Planck's constant.
    """
    if steps < 1:
        raise ValueError("steps must be a positive integer")

    # Qiskit Pauli labels place qubit 0 at the rightmost character:
    # 'ZZ' = Z on both qubits; 'IX' = X on qubit 0.
    H = SparsePauliOp.from_list([
        ("ZZ", J),
        ("IX", h),
    ])

    # Initial condition: |+> on qubit 0 and |0> on qubit 1.
    preparation = QuantumCircuit(2)
    preparation.h(0)
    initial_state = Statevector.from_instruction(preparation).data

    # Classical exact reference for this small Hamiltonian.
    U_exact = expm(-1j * H.to_matrix() * time)
    exact_state = U_exact @ initial_state

    # Gate-based first-order product formula.
    circuit = QuantumCircuit(2)
    circuit.h(0)
    dt = time / steps

    for _ in range(steps):
        # exp(-i * h * X0 * dt) = RX(2*h*dt) on qubit 0.
        circuit.rx(2 * h * dt, 0)

        # exp(-i * J * Z0*Z1 * dt)
        # = CNOT(0,1) -> RZ(2*J*dt) on qubit 1 -> CNOT(0,1).
        circuit.cx(0, 1)
        circuit.rz(2 * J * dt, 1)
        circuit.cx(0, 1)

    approximate_state = Statevector.from_instruction(circuit).data

    # Global-phase-insensitive pure-state fidelity.
    fidelity = abs(np.vdot(exact_state, approximate_state)) ** 2
    state_vector_error = np.linalg.norm(exact_state - approximate_state)

    return circuit, exact_state, approximate_state, fidelity, state_vector_error


circuit, exact, approximate, fidelity, error = simulate_spin_system(
    J=1.0,
    h=0.5,
    time=1.0,
    steps=20,
)

print(circuit.draw())
print(f"State fidelity: {fidelity:.10f}")
print(f"Vector 2-norm error: {error:.3e}")
print("Approximate final amplitudes:")
print(approximate)
```

The fidelity is

\[
F=|\langle\psi_{\mathrm{exact}}|\psi_{\mathrm{approx}}\rangle|^2.
\]

For pure states, it equals one when the states agree up to a global phase. The vector 2-norm error shown in the code is sensitive to a global phase, so it is useful to interpret it together with fidelity.

To study convergence, run the simulation for several values of `steps`. A first-order formula should usually show improved accuracy as the number of steps increases, until floating-point effects become relevant in the classical test. On real hardware, increasing the number of steps can eventually make results worse because the deeper circuit incurs more noise.

### Measuring an observable

Once the state has been simulated, the expectation value of an observable can be evaluated. For example, \(Z_0\) measures the polarization of qubit 0 in the computational basis:

\[
\langle Z_0\rangle=P(q_0=0)-P(q_0=1).
\]

```python
from qiskit.quantum_info import SparsePauliOp

Z0 = SparsePauliOp.from_list([("IZ", 1.0)])
state = Statevector(approximate)
expectation_z0 = np.real(state.expectation_value(Z0))
print("<Z0> =", expectation_z0)
```

Qiskit Pauli labels use the rightmost character for qubit 0. Therefore, `"IZ"` represents identity on qubit 1 and \(Z\) on qubit 0. This convention matters when constructing multi-qubit observables.

For hardware execution, add measurements to a circuit and run it on a compatible backend. The result is a collection of bitstrings from repeated shots, not a directly returned state vector. Expectation values are estimated from the measured frequencies.

## 6. Building an evolution gate directly in Qiskit

Qiskit also provides `PauliEvolutionGate`, which represents the unitary

\[
U(t)=e^{-itH}
\]

for a Pauli-based Hamiltonian when \(\hbar=1\). Its synthesis strategy determines how the abstract evolution is translated into gates.

```python
from qiskit import QuantumCircuit
from qiskit.quantum_info import SparsePauliOp
from qiskit.circuit.library import PauliEvolutionGate
from qiskit.synthesis import LieTrotter, SuzukiTrotter

H = SparsePauliOp.from_list([
    ("ZZ", 1.0),
    ("IX", 0.5),
])

time = 1.0
steps = 20

# First-order product formula.
evolution = PauliEvolutionGate(
    H,
    time=time,
    synthesis=LieTrotter(reps=steps),
)

circuit = QuantumCircuit(2)
circuit.h(0)
circuit.append(evolution, circuit.qubits)
print(circuit.draw())
```

For the symmetric second-order formula, replace `LieTrotter(reps=steps)` with:

```python
SuzukiTrotter(order=2, reps=steps)
```

`PauliEvolutionGate` is a high-level representation of an evolution operator; its actual gate implementation is produced through synthesis and compilation. A high-level gate should not be interpreted as proof that the underlying evolution has become exact or inexpensive. The synthesis method, number of repetitions, and target hardware determine the resulting circuit.

The explicit RX/CNOT/RZ implementation in the previous section is useful for learning and testing a small model. The high-level evolution gate is more convenient when the Hamiltonian contains many Pauli terms.

## 7. Practical application: spin chains and lattice models

Spin models are a natural application because each spin-\(\tfrac12\) degree of freedom maps directly to a qubit and interactions often have concise Pauli decompositions.

### Transverse-field Ising model

A one-dimensional transverse-field Ising model with \(n\) spins can be written as

\[
\boxed{
H_{\mathrm{TFI}}=-J\sum_{i=0}^{n-2}Z_iZ_{i+1}
-g\sum_{i=0}^{n-1}X_i.
}
\]

The first sum couples neighboring spins, while the second sum applies a transverse field. The Hamiltonian separates naturally into interaction and field terms:

\[
H_{\mathrm{TFI}}=H_{ZZ}+H_X.
\]

Each \(ZZ\) interaction is implemented with a CNOT–RZ–CNOT sequence, and each \(X\) term is implemented as an RX rotation. If the interaction terms commute with one another and the field terms commute with one another, each group can be evolved as a block; however, the interaction block generally does not commute with the field block. Product-formula methods can then approximate the full evolution.

Time evolution under this model can be used to investigate magnetization, spin-spin correlations, and the propagation of local disturbances. For example,

\[
C_{ij}(t)=\langle\psi(t)|Z_iZ_j|\psi(t)\rangle
\]

measures a two-spin correlation. The magnetization along the \(z\) direction is often defined as

\[
M_z(t)=\frac{1}{n}\sum_{i=0}^{n-1}\langle Z_i\rangle_t.
\]

Different initial states and Hamiltonian parameters can produce different dynamical behavior, including relaxation of local observables and propagation of correlations. In a closed system, this is unitary evolution rather than dissipative relaxation to a thermal state unless an environment or an appropriate open-system method is also modeled.

### Heisenberg and XXZ interactions

A related model is the Heisenberg spin chain:

\[
H_{\mathrm{Heis}}=J\sum_i
\left(X_iX_{i+1}+Y_iY_{i+1}+Z_iZ_{i+1}\right).
\]

The XXZ model allows anisotropy between the transverse and longitudinal interactions:

\[
H_{\mathrm{XXZ}}=J\sum_i
\left(X_iX_{i+1}+Y_iY_{i+1}+\Delta Z_iZ_{i+1}\right).
\]

These models are useful for studying magnetization transport, correlation dynamics, and quantum many-body phenomena. Their implementation requires two-qubit interactions for each Pauli product and an evolution strategy for combining the different terms. Efficient gate ordering, exploiting commuting terms, and matching the circuit to the hardware's connectivity can have a substantial impact on circuit cost.

## 8. Application: a truncated quantum harmonic oscillator

The quantum harmonic oscillator has an infinite-dimensional Hilbert space, so it cannot be represented exactly using finitely many qubits. A finite simulation must truncate the oscillator's number states.

The Hamiltonian is

\[
\boxed{H_{\mathrm{osc}}=\hbar\omega\left(a^\dagger a+\frac{1}{2}I\right),}
\]

where \(a\) and \(a^\dagger\) are the annihilation and creation operators and \(\omega\) is the angular frequency. They act on number states according to

\[
a|n\rangle=\sqrt{n}|n-1\rangle,
\qquad
a^\dagger|n\rangle=\sqrt{n+1}|n+1\rangle.
\]

The number operator is \(N=a^\dagger a\), and

\[
H_{\mathrm{osc}}|n\rangle
=\hbar\omega\left(n+\frac{1}{2}\right)|n\rangle.
\]

A cutoff of \(d\) levels keeps \(|0\rangle,\ldots,|d-1\rangle\). If \(d=2^n\), those levels can be represented with \(n\) qubits using a binary encoding. A general cutoff can be embedded in a larger power-of-two register, but unused basis states must be handled consistently.

For the bare oscillator Hamiltonian, number states are energy eigenstates, so the time evolution simply adds phases:

\[
|\psi(0)\rangle=\sum_{n=0}^{d-1}c_n|n\rangle
\quad\Longrightarrow\quad
|\psi(t)\rangle=\sum_{n=0}^{d-1}
 c_n e^{-i\omega(n+1/2)t}|n\rangle,
\]

where we have set \(\hbar=1\). The probabilities \(|c_n|^2\) remain constant, while relative phases change. For a coherent state, this phase evolution corresponds to rotation in oscillator phase space.

The following small example represents a four-level oscillator with two qubits. It converts the truncated Hamiltonian to a Pauli expansion and uses a Qiskit evolution gate. Because the bare oscillator Hamiltonian is diagonal in the number basis, its Pauli terms commute; this is not a challenging example of Trotter error, but it demonstrates the finite-dimensional encoding and evolution workflow.

```python
import math
import numpy as np

from qiskit import QuantumCircuit
from qiskit.quantum_info import Operator, SparsePauliOp, Statevector
from qiskit.circuit.library import PauliEvolutionGate, StatePreparation
from qiskit.synthesis import LieTrotter


cutoff = 4                 # Four number states: |0>, ..., |3>
omega = 1.0
time = 0.7                # hbar = 1
alpha = 0.8 + 0.0j         # Coherent-state amplitude

# Construct the truncated annihilation operator.
a = np.zeros((cutoff, cutoff), dtype=complex)
for n in range(1, cutoff):
    a[n - 1, n] = np.sqrt(n)

adag = a.conj().T
H_osc = omega * (adag @ a + 0.5 * np.eye(cutoff))

# Convert the 4x4 Hermitian matrix to a Pauli-operator sum.
H_pauli = SparsePauliOp.from_operator(Operator(H_osc))

# Truncated coherent state: c_n proportional to alpha^n / sqrt(n!).
coeffs = np.array([
    np.exp(-abs(alpha) ** 2 / 2) * alpha**n / np.sqrt(math.factorial(n))
    for n in range(cutoff)
], dtype=complex)
coeffs /= np.linalg.norm(coeffs)  # Renormalize after truncation.

circuit = QuantumCircuit(2)
circuit.append(StatePreparation(coeffs), circuit.qubits)
circuit.append(
    PauliEvolutionGate(
        H_pauli,
        time=time,
        synthesis=LieTrotter(reps=1),
    ),
    circuit.qubits,
)

final_state = Statevector.from_instruction(circuit)
print("Truncated final amplitudes:")
print(final_state.data)
print("Number-basis probabilities:")
print(final_state.probabilities())
```

The cutoff is a modeling approximation, not just an implementation detail. If the dynamics transfers appreciable probability toward the highest included number state, the truncation may distort the dynamics. Increase the cutoff and check convergence of the observables of interest.

More demanding oscillator simulations can use other encodings or simulate Hamiltonians involving position and momentum, driven oscillators, or nonlinear terms. These often produce less trivial Pauli decompositions and can require product-formula or other Hamiltonian-simulation techniques. Binary encoding is not always the most gate-efficient representation.

## 9. Time-dependent Hamiltonians

For a driven system, the Hamiltonian may explicitly depend on time, for example

\[
H(t)=H_0+f(t)H_1.
\]

The exact evolution is

\[
U(t,0)=\mathcal{T}\exp\left[-i\int_0^t H(s)\,ds\right]
\]

in units where \(\hbar=1\). One practical approximation divides time into short intervals and treats the Hamiltonian as constant within each interval:

\[
U(t,0)\approx
\prod_{k=r-1}^{0} e^{-iH(t_k)\Delta t},
\qquad t_k=k\Delta t,
\]

where the written product has later-time factors to the left, so that the earliest-time evolution acts first. Each short-time evolution can then be approximated with a product formula if its Hamiltonian is itself a sum of noncommuting terms.

There are therefore two discretizations to consider: time discretization for the varying Hamiltonian, and Hamiltonian-term decomposition inside each time slice. Reducing either error generally increases computational cost. The time step should be chosen according to how rapidly the drive changes and how accurate the target observables must be.

## 10. Approximating evolution operators beyond basic Trotterization

Product formulas are not the only way to implement Hamiltonian evolution. The best method depends on Hamiltonian structure, target precision, system size, and gate constraints.

### Higher-order Suzuki formulas

Higher-order formulas combine exponentials symmetrically to cancel increasingly many leading error terms. For example, the second-order formula uses half-steps around a full step. Higher order can reduce the number of steps needed for a target accuracy, but each step is more expensive. These methods are useful when the Hamiltonian is naturally represented as a sum of Pauli terms.

### Randomized product formulas: qDRIFT

qDRIFT samples Hamiltonian terms according to weights derived from their coefficients and constructs a randomized sequence of short evolutions. Its error guarantees and cost behave differently from fixed-order Trotter formulas. It can be attractive for Hamiltonians with many terms, although random sampling does not make every instance cheaper.

### Linear-combination-of-unitaries and Taylor-series methods

The exponential can be approximated by a truncated series,

\[
e^{-iHt}=\sum_{k=0}^{\infty}\frac{(-itH)^k}{k!}.
\]

A direct truncated series is generally not itself unitary. Quantum algorithms based on linear combinations of unitaries (LCU) and related techniques use additional registers and probabilistic or amplitude-amplification steps to implement a controlled approximation while managing normalization. Such approaches can offer strong asymptotic guarantees for suitable Hamiltonians, but their circuit constructions are more involved than the basic Pauli-rotation approach.

### Qubitization and quantum signal processing

For structured Hamiltonians provided through an appropriate block encoding, qubitization and quantum signal processing can implement highly precise functions of the Hamiltonian, including its time evolution. These methods are important in advanced Hamiltonian-simulation algorithms. Their practical cost depends on the quality and cost of the block encoding, so they are not automatically preferable for small, simple circuits.

### Variational quantum simulation

A variational approach restricts the state to a parameterized family,

\[
|\psi(\boldsymbol{\theta})\rangle
=U(\boldsymbol{\theta})|\psi_0\rangle.
\]

Instead of constructing a gate sequence that approximates the full evolution operator directly, the method estimates quantities needed to update the parameters over time. In one family of formulations, projecting the Schrödinger equation onto the tangent space of the ansatz produces equations of the form

\[
\sum_j A_{ij}(\boldsymbol{\theta})\dot{\theta}_j
=C_i(\boldsymbol{\theta}),
\]

where \(A\) and \(C\) depend on the ansatz and Hamiltonian. Quantum measurements estimate these quantities and a classical routine advances the parameters. This hybrid method can reduce circuit depth in some cases, but it may introduce ansatz bias, large measurement costs, or numerical instability.

### Choosing a method

For a small model, an exact matrix exponential is an excellent classical reference. For a pedagogical circuit or modest Pauli Hamiltonian, explicit rotations or a Lie-Trotter formula are easy to inspect. A higher-order formula can help when product-formula error dominates. For large-scale fault-tolerant simulations, more advanced methods such as qubitization may be relevant. On noisy hardware, the best asymptotic method may not yield the best result at realistic circuit depths.

## 11. Quantum circuits for algorithms, not only physical dynamics

A quantum circuit can represent a physical evolution or implement an algorithmic transformation. These goals share gate-level technology but should not be confused: not every useful quantum algorithm is a simulation of a physical Hamiltonian.

### Quantum phase estimation

Suppose a unitary \(U\) has an eigenstate \(|u\rangle\):

\[
U|u\rangle=e^{2\pi i\phi}|u\rangle.
\]

Quantum phase estimation estimates the phase \(\phi\). If \(U\) is generated by a Hamiltonian,

\[
U(t)=e^{-iHt/\hbar},
\]

and \(|E_j\rangle\) is an energy eigenstate satisfying \(H|E_j\rangle=E_j|E_j\rangle\), then

\[
U(t)|E_j\rangle=e^{-iE_jt/\hbar}|E_j\rangle.
\]

Thus the eigenphase contains information about the energy, modulo the phase range and the chosen time scale. With a suitable scaling and an appropriate input state, phase estimation can be used for energy estimation. Implementing the controlled powers of \(U\) makes Hamiltonian simulation a key subroutine in this application.

### Shor's algorithm and modular exponentiation

Shor's algorithm is not ordinarily described as a physical Hamiltonian simulation. Its core circuit performs reversible modular arithmetic. For a fixed integer \(a\) coprime to \(N\), the modular multiplication unitary can be written schematically as

\[
U_a|y\rangle=|ay\bmod N\rangle,
\]

with the implementation defined on the chosen computational register and any required auxiliary space. Controlled powers of this operation, together with the quantum Fourier transform, support period finding. The circuit is designed to realize a particular reversible computation rather than to approximate \(e^{-iHt/\hbar}\).

### Grover's algorithm

Grover search uses an oracle and an amplitude-amplification iterate to increase the probability of measuring a marked state. It is another example where circuit design is about implementing a computational transformation, not reproducing a continuous-time physical model. Hamiltonian-based formulations also exist, but the standard gate algorithm does not require Trotterizing a physical system's Hamiltonian.

The practical distinction is useful: Hamiltonian simulation usually starts with a model of dynamics and asks how to reproduce its evolution, while algorithm design starts with a computational task and asks which circuit transformations solve it.

## 12. Validation and practical considerations

Before running a circuit on quantum hardware, validate small cases using a classical reference whenever feasible. For a time-independent Hamiltonian, compute

\[
|\psi_{\mathrm{ref}}(t)\rangle=e^{-iHt/\hbar}|\psi(0)\rangle
\]

with a matrix exponential and compare its observables with those from the circuit. Vary the number of Trotter steps, check conservation laws where applicable, and test multiple initial states.

For a closed, time-independent system, the exact energy expectation is conserved:

\[
\langle H\rangle_t=\langle H\rangle_0.
\]

A product-formula circuit approximates the evolution and may show small energy deviations, while real hardware may show larger deviations due to noise. Conservation checks are useful diagnostics but do not prove that a simulation is correct.

Also consider the following practical issues:

- **State preparation:** An easy-to-write initial state may be difficult to prepare efficiently on actual hardware.
- **Connectivity:** Two-qubit interactions between nonadjacent physical qubits may require extra routing gates.
- **Circuit depth:** Increasing Trotter steps improves one source of error but increases gate count and exposure to noise.
- **Measurements:** Expectation values are estimated from a finite number of shots; small statistical error may require many repetitions.
- **System size:** An \(n\)-qubit state vector has \(2^n\) complex amplitudes, making direct classical state-vector simulation exponentially expensive in general. This does not mean every circuit is hard to simulate classically; structure and entanglement can make some cases tractable.
- **Model fidelity:** A correct circuit for a truncated or simplified Hamiltonian only simulates that model. The physical approximation must be assessed separately.

A quantum computer does not automatically make every simulation efficient. The benefit depends on the structure of the Hamiltonian, the observables requested, the encoding, the fault model, and the resources required to reach the desired precision.

## 13. Summary

Digital quantum simulation follows a direct mathematical path:

\[
\text{physical model}\longrightarrow H
\longrightarrow U(t)=e^{-iHt/\hbar}
\longrightarrow \text{quantum gates}
\longrightarrow \text{measured observables}.
\]

The central challenge is implementing the time-evolution operator with a tractable number of gates. Pauli decompositions turn common Hamiltonian terms into rotations and entangling-gate patterns. Trotterization combines evolutions for individual terms when they do not commute, trading circuit depth against approximation error. More advanced product formulas, randomized methods, variational approaches, and block-encoding-based algorithms offer alternatives for different regimes.

Spin chains are especially natural examples because their interactions are compact Pauli sums. Oscillator simulations are also possible, but require a finite-level approximation before encoding the system in qubits. Finally, quantum algorithms such as phase estimation can use Hamiltonian simulation as a subroutine, while algorithms such as Shor's use circuits to implement reversible computations with a different objective.

## References and further reading

- [Qiskit: `PauliEvolutionGate`](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.circuit.library.PauliEvolutionGate) — representing Hamiltonian evolution as a gate.
- [Qiskit: circuit synthesis](https://quantum.cloud.ibm.com/docs/en/api/qiskit/synthesis) — product formulas and evolution-synthesis methods, including Lie-Trotter, Suzuki-Trotter, matrix-exponential synthesis, and qDRIFT.
- [Qiskit: `Statevector`](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.quantum_info.Statevector) — classical state-vector simulation and expectation values.
- [Qiskit: `SparsePauliOp`](https://quantum.cloud.ibm.com/docs/en/api/qiskit/qiskit.quantum_info.SparsePauliOp) — representing Hamiltonians as weighted sums of Pauli strings.
- D. Berry, G. Ahokas, R. Cleve, and B. Sanders, “Efficient Quantum Algorithms for Simulating Sparse Hamiltonians,” *Communications in Mathematical Physics* 270, 359–371 (2007).
- M. Suzuki, “General theory of fractal path integrals with applications to many-body theories and statistical physics,” *Journal of Mathematical Physics* 32, 400–407 (1991).
