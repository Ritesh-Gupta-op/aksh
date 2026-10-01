"""Crosswalk for legacy Act sections and the Income-tax Act, 2025 nomenclature."""
from __future__ import annotations

SECTION_MAP = {
    "80C": {"legacy": "Section 80C, Income-tax Act, 1961", "new_act": "Corresponding Chapter VI-A provision; verify final numbering"},
    "80D": {"legacy": "Section 80D, Income-tax Act, 1961", "new_act": "Corresponding health-insurance deduction provision; verify final numbering"},
    "80CCD(1B)": {"legacy": "Section 80CCD(1B), Income-tax Act, 1961", "new_act": "Corresponding NPS provision; verify final numbering"},
    "87A": {"legacy": "Section 87A, Income-tax Act, 1961", "new_act": "Corresponding rebate provision; verify final numbering"},
    "24(b)": {"legacy": "Section 24(b), Income-tax Act, 1961", "new_act": "Corresponding house-property interest provision; verify final numbering"},
}

def section_reference(code: str, act: str = "legacy") -> str:
    record = SECTION_MAP.get(code)
    if record is None:
        return f"Section {code}; verify reference"
    return record["new_act" if act in {"new", "2025"} else "legacy"]
