"""Build a small, ground-truth JSON object for Gemma."""
from __future__ import annotations
from decimal import Decimal
from typing import Any
from .advisor import suggestions
from .models import Comparison, UserProfile

def _int(value: Any) -> int:
    return int(Decimal(str(value or 0)).quantize(Decimal("1")))

def inr_formatted(value: Any) -> str:
    number = str(abs(_int(value)))
    if len(number) <= 3:
        grouped = number
    else:
        last = number[-3:]
        rest = number[:-3]
        chunks = []
        while rest:
            chunks.append(rest[-2:])
            rest = rest[:-2]
        grouped = ",".join(reversed(chunks)) + "," + last
    return ("-" if Decimal(str(value or 0)) < 0 else "") + "₹" + grouped

def _nonzero(mapping: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in mapping.items() if value not in (None, 0, "0", "0.00", "")}

def build_engine_context(profile: UserProfile, comparison: Comparison) -> dict[str, Any]:
    snapshot = _nonzero({"age_bracket": "under_60" if profile.age < 60 else "60_79" if profile.age < 80 else "80_plus", "gross_income": _int(max(comparison.old.gross_total_income, comparison.new.gross_total_income)), "city_type": profile.city_type, "key_deductions": _nonzero({"old_deductions": _int(comparison.current_old_deductions), "80c": _int(profile.deductions.section_80c), "80ccd1b": _int(profile.deductions.section_80ccd1b), "80d": _int(profile.deductions.health_self + profile.deductions.health_parents)})})
    result = _nonzero({"recommended_regime": comparison.recommended_regime, "tax_old": _int(comparison.old.total_tax), "tax_new": _int(comparison.new.total_tax), "savings": _int(comparison.savings), "savings_pct": str(comparison.savings_percent.quantize(Decimal("0.01"))), "break_even_deduction": _int(comparison.break_even_deduction) if comparison.break_even_deduction is not None else None, "current_old_deductions": _int(comparison.current_old_deductions), "effective_rate_old": str(comparison.old.effective_tax_rate.quantize(Decimal("0.01"))), "effective_rate_new": str(comparison.new.effective_tax_rate.quantize(Decimal("0.01")))})
    context = {"meta": {"financial_year": comparison.financial_year, "engine_version": comparison.engine_version, "confidence": comparison.confidence}, "user_snapshot": snapshot, "result": result, "reasons": comparison.reasons, "what_if": [{"scenario": item.scenario, "delta_tax": _int(item.delta_tax)} for item in comparison.sensitivity], "suggestions": [{**item, "rupee_impact": _int(item["rupee_impact"])} for item in suggestions(comparison)], "warnings": [item.message for item in comparison.warnings], "missing_info": comparison.missing_fields, "assumptions": comparison.assumptions}
    return context
