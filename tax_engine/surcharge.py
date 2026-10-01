"""Surcharge tiers and a conservative marginal-relief implementation."""
from decimal import Decimal
from .models import AuditStep
from .slabs import round_rupees
D = Decimal

def surcharge_tax(base_tax: D, total_income: D, regime: str, special_income: D, pack: dict) -> tuple[D, list[AuditStep]]:
    rate = D("0")
    for threshold, candidate in pack["surcharge"]["thresholds"]:
        if total_income > D(str(threshold)):
            rate = D(str(candidate))
    if regime == "NEW":
        rate = min(rate, D(str(pack["surcharge"]["new_top_rate"])))
    if special_income > 0:
        rate = min(rate, D(str(pack["surcharge"]["capital_gains_cap"])))
    raw = base_tax * rate
    # Marginal relief prevents surcharge from exceeding income above a threshold.
    relief = D("0")
    if rate:
        highest = max(D(str(threshold)) for threshold, candidate in pack["surcharge"]["thresholds"] if D(str(candidate)) == rate)
        excess_income = max(D("0"), total_income - highest)
        if raw > excess_income:
            relief = raw - excess_income
    result = round_rupees(max(D("0"), raw - relief))
    step = AuditStep(label="Surcharge", formula="base tax × applicable rate − marginal relief", inputs={"base_tax": base_tax, "total_income": total_income, "rate": rate, "relief": relief}, result=result, legal_reference="Sections 2(6C), 115A and surcharge provisions")
    return result, [step]
