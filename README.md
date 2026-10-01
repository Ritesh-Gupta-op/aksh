# OmniRush

OmniRush is an extensible AI orchestration engine. It is being built as a
small, provider-independent runtime that coordinates agents, tools, context,
guards, budgets, and memory through explicit contracts.

## Current status

The repository contains a local-first Aksh tax coach:

- `core/` contains the deterministic Decimal tax engine and simulator.
- `ai/` contains the local Ollama/Gemma extraction, chat, advisor, and UPI layer.
- `app.py` serves the frontend and JSON API using Python's standard-library HTTP server.
- `web/` contains the warm fintech frontend with no frontend build dependency.
- Packaging metadata and the runnable `aksh` entry point are defined in `pyproject.toml`.

The project remains runnable in vertical slices, with tests for the backend contracts and the local web boundary. The production-grade `tax_engine/` package adds versioned rule packs, typed profiles, audit steps, break-even analysis, sensitivity scenarios, validation, and Gemma-safe context construction.

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

## Tax engine architecture

```text
browser → app.py → UserProfile → tax_engine validators
                              ↓
                    versioned rule pack (YAML)
                              ↓
        income + exemptions + deductions + slabs + special rates
                              ↓
          OLD/NEW RegimeResult with AuditStep records
                              ↓
       comparison + break-even + sensitivity + context_builder
                              ↓
                 Gemma explanation (never tax arithmetic)
```

Rule packs are stored in `tax_engine/rules/`. They are JSON-compatible YAML so
Aksh can validate them with the standard library; adding a year means adding a
file and updating the loader's year mapping. Every pack has `source`, `verified`,
and per-value `verified_values` metadata. A new deduction should be added to the
profile model, the appropriate `deductions_old.py` or `deductions_new.py` rule
function, its audit step, the context builder if user-facing, and a focused test.


## Aksh deterministic tax core

The repository includes a standard-library-only deterministic core for Aksh's
AY 2026–27 / FY 2025–26 salaried-individual MVP, plus the broader auditable
`tax_engine/` layer used by the web flow. It supports old and new regime
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

## Run the local website

Start Ollama in one terminal:

```bash
ollama serve
```

Then start Aksh from the repository root:

```bash
source .venv/bin/activate
python app.py
```

Open <http://127.0.0.1:8000>. The browser talks to the local JSON API at
`/api/analyze`, `/api/profile-analysis`, `/api/chat`, `/api/upi`, and `/api/simulate`. Salary slips,
chat messages, and UPI CSV contents are not logged or uploaded.

Run all checks with:

```bash
python -m pytest
```

## Tax assumptions and verification checklist

The engine currently treats all supplied monetary inputs as annual amounts,
uses resident salaried-individual rules unless the profile says otherwise, and
treats absent inputs as zero while surfacing important missing fields. HRA uses
Basic plus eligible DA, 50% for metro and 40% for non-metro. Let-out property
uses a 30% standard deduction; self-occupied interest is capped at ₹2,00,000
under the old regime and is not used in the new-regime calculation. 80G is
kept as a claimed amount pending recipient-category metadata, so it must not be
used for filing without verification.

Before production filing, verify every `verified: true` value in
`tax_engine/rules/fy_2025_26.yaml` against the Finance Act and Income Tax
Department notifications, especially the FY 2025-26 special capital-gains
rates, Section 87A treatment, surcharge/marginal-relief treatment, employer
NPS limits, and the interaction of special-rate income with rebates. The
FY 2026-27 pack is intentionally `verified: false` and is a placeholder only.
Business/professional income, foreign income, notices, gifts, and complex
capital-gains cases should be reviewed by a qualified CA.

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
