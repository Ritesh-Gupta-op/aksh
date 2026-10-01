"""Old-regime HRA exemption calculation."""
from decimal import Decimal
from .models import AuditStep, UserProfile
D = Decimal

def calculate_hra_exemption(profile: UserProfile, old_regime: bool = True) -> tuple[D, AuditStep | None, list[str]]:
    income = profile.income_sources
    rent = profile.rent_paid or profile.deductions.rent_paid
    hra = income.hra_received
    if not old_regime or hra <= 0:
        return D("0"), None, []
    if rent <= 0 or not profile.city_type:
        return D("0"), None, ["HRA exemption needs rent paid and metro/non-metro city details."]
    salary = income.basic + (income.da if profile.da_for_retirement else D("0"))
    if salary <= 0:
        return D("0"), None, ["HRA exemption needs Basic salary (and eligible DA) to be present."]
    excess_rent = max(D("0"), rent - salary * D("0.10"))
    city_fraction = D("0.50") if profile.city_type == "metro" else D("0.40")
    exemption = min(hra, excess_rent, salary * city_fraction)
    step = AuditStep(label="HRA exemption", formula="min(HRA received, rent − 10% of salary, 50%/40% of salary)", inputs={"hra_received": hra, "rent_paid": rent, "salary_for_hra": salary, "city_type": profile.city_type, "city_fraction": city_fraction}, result=exemption, legal_reference="Section 10(13A), Income-tax Act, 1961")
    return exemption, step, []
