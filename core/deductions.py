"""Eligibility and limits for deductions supported by the MVP."""
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Mapping
from .tax_config import DEDUCTION_LIMITS

_ZERO = Decimal("0")

def money(value: Any, field: str = "amount") -> Decimal:
    if value is None or value == "":
        return _ZERO
    try:
        result = Decimal(str(value))
    except Exception as exc:
        raise ValueError(f"{field} must be a valid monetary amount") from exc
    if not result.is_finite():
        raise ValueError(f"{field} must be finite")
    if result < _ZERO:
        raise ValueError(f"{field} cannot be negative")
    return result

@dataclass(frozen=True)
class DeductionBreakdown:
    claimed_80c: Decimal = _ZERO
    eligible_80c: Decimal = _ZERO
    eligible_80d: Decimal = _ZERO
    claimed_nps: Decimal = _ZERO
    eligible_nps: Decimal = _ZERO
    professional_tax: Decimal = _ZERO
    total_eligible: Decimal = _ZERO

    def to_dict(self) -> dict[str, Decimal]:
        return {"claimed_80c": self.claimed_80c, "eligible_80c": self.eligible_80c, "eligible_80d": self.eligible_80d, "claimed_nps": self.claimed_nps, "eligible_nps": self.eligible_nps, "professional_tax": self.professional_tax, "total_eligible": self.total_eligible}

def eligible_deductions(salary: Mapping[str, Any], regime: str = "old") -> DeductionBreakdown:
    """Return capped deductions; Chapter VI-A deductions apply only to old regime here.

    Employee PF is treated as part of the user's 80C contribution. HRA, Section 24,
    and employer NPS are not inferred without the required supporting inputs.
    """
    if regime not in {"old", "new"}:
        raise ValueError("Unsupported tax regime")
    if regime == "new":
        return DeductionBreakdown()
    explicit_80c = money(salary.get("80c", salary.get("deduction_80c", 0)), "80c")
    employee_pf = money(salary.get("employee_pf", salary.get("pf", 0)), "employee_pf")
    claimed_80c = explicit_80c + employee_pf
    eligible_80c = min(claimed_80c, DEDUCTION_LIMITS["80c"])
    eligible_80d = min(money(salary.get("80d", salary.get("deduction_80d", 0)), "80d"), DEDUCTION_LIMITS["80d"])
    claimed_nps = money(salary.get("nps", salary.get("nps_contribution", 0)), "nps")
    eligible_nps = min(claimed_nps, DEDUCTION_LIMITS["nps"])
    professional_tax = money(salary.get("professional_tax", 0), "professional_tax")
    total = eligible_80c + eligible_80d + eligible_nps + professional_tax
    return DeductionBreakdown(claimed_80c, eligible_80c, eligible_80d, claimed_nps, eligible_nps, professional_tax, total)
