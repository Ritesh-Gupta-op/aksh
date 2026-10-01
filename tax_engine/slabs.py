"""Progressive slab calculations for old and new regimes."""
from __future__ import annotations
from decimal import Decimal, ROUND_HALF_UP
from typing import Any
from .models import AuditStep

D = Decimal

def age_bracket(age: int) -> str:
    return "under_60" if age < 60 else "60_79" if age < 80 else "80_plus"

def round_rupees(value: D) -> D:
    return value.quantize(D("1"), rounding=ROUND_HALF_UP)

def round_ten(value: D) -> D:
    return (value / D("10")).quantize(D("1"), rounding=ROUND_HALF_UP) * D("10")

def slab_tax(income: D, slabs: list[Any], label: str = "slab tax") -> tuple[D, list[AuditStep], D]:
    remaining = max(D("0"), income)
    lower = D("0")
    total = D("0")
    audit: list[AuditStep] = []
    marginal = D("0")
    for index, row in enumerate(slabs):
        upper_raw, rate_raw = row
        upper = D(str(upper_raw)) if upper_raw is not None else None
        rate = D(str(rate_raw))
        width = remaining if upper is None else min(remaining, max(D("0"), upper - lower))
        if width > 0:
            part = width * rate
            total += part
            marginal = rate
            audit.append(AuditStep(label=f"{label} band {index + 1}", formula=f"{width} × {rate}", inputs={"lower": lower, "upper": upper, "rate": rate}, result=part, legal_reference="Rule pack slab table"))
            remaining -= width
        if remaining <= 0:
            break
        if upper is not None:
            lower = upper
    return round_rupees(total), audit, marginal
