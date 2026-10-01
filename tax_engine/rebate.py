"""Section 87A rebate and marginal relief."""
from decimal import Decimal
from .models import AuditStep, UserProfile
from .slabs import round_rupees
D = Decimal

def rebate_and_relief(taxable_normal: D, normal_tax: D, profile: UserProfile, regime: str, pack: dict) -> tuple[D, list[AuditStep]]:
    if profile.residential_status == "NRI":
        return D("0"), []
    rule = pack["rebate"][regime.lower()]
    threshold = D(str(rule["threshold"]))
    maximum = D(str(rule["maximum"]))
    if taxable_normal <= threshold:
        rebate = min(normal_tax, maximum)
        return round_rupees(rebate), [AuditStep(label=f"87A rebate ({regime})", formula="min(tax before rebate, maximum)", inputs={"taxable_income": taxable_normal, "threshold": threshold, "maximum": maximum}, result=rebate, legal_reference="Section 87A")]
    excess = taxable_normal - threshold
    relief = max(D("0"), normal_tax - excess)
    rebate = min(maximum, relief)
    return round_rupees(rebate), [AuditStep(label=f"87A marginal relief ({regime})", formula="min(maximum rebate, tax − income above threshold)", inputs={"taxable_income": taxable_normal, "threshold": threshold, "maximum": maximum}, result=rebate, legal_reference="Section 87A marginal relief")]
