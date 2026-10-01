"""Income-head aggregation and house-property rules."""
from __future__ import annotations
from decimal import Decimal
from .models import AuditStep, UserProfile, WarningItem
D = Decimal

def salary_total(profile: UserProfile) -> tuple[D, list[AuditStep]]:
    i = profile.income_sources
    fields = ("basic", "da", "hra_received", "special_allowance", "lta_received", "bonus", "perquisites", "employer_nps", "employer_pf", "other_salary")
    total = sum((getattr(i, field) for field in fields), D("0"))
    step = AuditStep(label="Salary income before exemptions", formula="sum taxable salary components", inputs={field: getattr(i, field) for field in fields}, result=total, legal_reference="Sections 15–17, Income-tax Act, 1961")
    return total, [step]

def house_property(profile: UserProfile, old_regime: bool) -> tuple[D, list[AuditStep], list[WarningItem]]:
    i = profile.income_sources
    rent = i.rental_income
    interest = profile.property_interest or profile.home_loan_interest or profile.deductions.home_loan_interest
    warnings: list[WarningItem] = []
    if rent <= 0 and interest <= 0:
        return D("0"), [], warnings
    if profile.self_occupied:
        allowed = min(interest, D("200000")) if old_regime else D("0")
        value = -allowed
        if interest > allowed:
            warnings.append(WarningItem(code="HOUSE_PROPERTY_INTEREST_CAP", message=f"Home-loan interest above ₹{allowed:f} was not used under this regime."))
        step = AuditStep(label="Self-occupied house property", formula="−min(home-loan interest, statutory cap)", inputs={"interest": interest, "cap": D("200000") if old_regime else D("0")}, result=value, legal_reference="Section 24(b), Income-tax Act, 1961")
        return value, [step], warnings
    municipal = profile.municipal_taxes
    net_rent = max(D("0"), rent - municipal)
    standard = net_rent * D("0.30")
    value = net_rent - standard - interest
    steps = [AuditStep(label="Net annual value", formula="rent − municipal taxes", inputs={"rent": rent, "municipal_taxes": municipal}, result=net_rent, legal_reference="Sections 22–24"), AuditStep(label="House-property income", formula="net annual value − 30% standard deduction − interest", inputs={"net_annual_value": net_rent, "standard_deduction": standard, "interest": interest}, result=value, legal_reference="Section 24, Income-tax Act, 1961")]
    return value, steps, warnings

def other_normal_income(profile: UserProfile) -> D:
    i = profile.income_sources
    return i.savings_interest + i.fd_interest + i.dividends + i.other_income + i.business_income
