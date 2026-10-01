#!/usr/bin/env python3
"""Run the real local model against tests/slips.json and report extraction accuracy."""
from __future__ import annotations

import json
from pathlib import Path

from ai.gemma import parse_slip


def main() -> None:
    cases = json.loads(Path(__file__).parents[1].joinpath("tests/slips.json").read_text())
    fields = ("period", "gross_salary", "basic", "hra", "da", "special_allowance", "bonus", "employee_pf", "professional_tax", "tds")
    correct = total = 0
    for number, case in enumerate(cases, 1):
        result = parse_slip(case["text"])["salary"]
        expected = case["expected"]
        matches = {field: result.get(field) == expected.get(field) for field in fields}
        correct += sum(matches.values())
        total += len(fields)
        print(f"slip {number}: {sum(matches.values())}/{len(fields)} fields; " + ", ".join(f"{k}={'OK' if v else 'MISS'}" for k, v in matches.items()))
    print(f"total accuracy: {correct}/{total} ({correct / total:.1%})")


if __name__ == "__main__":
    main()
