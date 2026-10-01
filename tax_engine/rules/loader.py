"""Load and validate JSON-compatible YAML rule packs without calculation I/O."""
from __future__ import annotations
import json
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field

class RulePack(BaseModel):
    financial_year: str
    assessment_year: str
    verified: bool
    source: str
    standard_deduction: dict[str, Any]
    cess_rate: Any
    rebate: dict[str, Any]
    old_slabs: dict[str, Any]
    new_slabs: list[Any]
    surcharge: dict[str, Any]
    deduction_limits: dict[str, Any]
    special_rates: dict[str, Any]
    employer_nps_percent: dict[str, Any]
    verified_values: dict[str, bool] = Field(default_factory=dict)

RULE_DIR = Path(__file__).parent

def load_rule_pack(financial_year: str) -> RulePack:
    normalized = financial_year.replace("AY", "FY").replace(" ", "").replace("2026-27", "2026-27")
    if normalized in {"FY2025-26", "2025-26"}:
        path = RULE_DIR / "fy_2025_26.yaml"
    elif normalized in {"FY2026-27", "2026-27"}:
        path = RULE_DIR / "fy_2026_27.yaml"
    else:
        raise ValueError(f"Unsupported financial year: {financial_year}")
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Rule pack {path.name} must be valid JSON-compatible YAML") from exc
    return RulePack.model_validate(payload)

def validate_all_rule_packs() -> list[RulePack]:
    return [load_rule_pack("FY 2025-26"), load_rule_pack("FY 2026-27")]
