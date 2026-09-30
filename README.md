# OmniRush

OmniRush is an extensible AI orchestration engine. It is being built as a
small, provider-independent runtime that coordinates agents, tools, context,
guards, budgets, and memory through explicit contracts.

## Current status

The repository currently contains the Phase 0 Python project foundation:

- `core/` is the initial Python package namespace.
- Packaging metadata is defined in `pyproject.toml`.
- The project has no provider integration or execution engine yet.
- The test suite currently contains an import smoke test.

The implementation will grow in vertical slices. Each slice should leave the
repository runnable and should add tests for the contracts it introduces.

## Architecture direction

The intended dependency direction is:

```text
public clients (Python API / CLI / HTTP)
                ↓
            runtime
                ↓
             router
          ↙           ↘
      agents         tools
          ↘           ↙
      context / guards / budget
                ↓
             memory
                ↓
       provider-specific adapters
```

The runtime will depend on interfaces rather than a particular model provider.
Persistent memory, routing, tools, and agents will remain replaceable.

## Aksh deterministic tax core

The repository now includes a standard-library-only deterministic core for Aksh's
AY 2026–27 / FY 2025–26 salaried-individual MVP. It supports old and new regime
progressive slabs, standard deductions, 87A rebate, surcharge configuration,
4% cess, TDS reconciliation, and structured regime comparison.

Public API:

```python
from core.tax_engine import calculate_tax, compare_regimes
from core.simulator import simulate

result = calculate_tax({"basic": "480000", "hra": "240000", "bonus": "60000", "employee_pf": "57600"}, regime="new")
comparison = compare_regimes({"gross_salary": "1500000"})
scenario = simulate({"gross_salary": "1500000"}, regime="old", changes={"additional_80c": "10000"})
```

Supported deductions are old-regime 80C (including employee PF), 80D, NPS/
80CCD(1B), and professional tax, all capped where applicable. New-regime
Chapter VI-A deductions are not applied in this MVP. HRA exemption is not
inferred without the required rent and location details. Capital gains,
business income, complex Section 24 cases, and PDF/image payslip parsing are
out of scope. Results use `Decimal` values and are structured for UI or AI
explanation; the core does not call AI, networks, or databases.

## Development

This project targets Python 3.12 or newer. From the repository root, run the
standard-library smoke tests with:

```bash
python -m unittest discover -s tests -v
```

When a test runner is available, the configured test directory can also be
used with:

```bash
pytest
```

No API keys or provider credentials belong in the repository. Local secrets
should be stored in environment variables or an ignored `.env` file.

## Roadmap

1. Domain error hierarchy
2. Typed execution context
3. Agent contract and deterministic test agent
4. Tool contract and registry
5. Deterministic capability-based router
6. Sequential runtime execution loop
7. Guards, budget accounting, memory, and provider adapters

The roadmap describes intended work; only the current status above is
implemented.
