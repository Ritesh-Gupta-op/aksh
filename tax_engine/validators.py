"""Input sanity checks and ranked missing-information suggestions."""
from __future__ import annotations
from decimal import Decimal
from .models import UserProfile, WarningItem
from .hra import calculate_hra_exemption

def validate_profile(profile: UserProfile) -> tuple[list[WarningItem], list[WarningItem], list[dict[str, object]]]:
    errors: list[WarningItem] = []
    warnings: list[WarningItem] = []
    missing: list[dict[str, object]] = []
    if profile.income_sources.business_income > 0 or profile.business_income_flag or profile.employment_type in {"business", "professional", "mixed"}:
        warnings.append(WarningItem(code="BUSINESS_SWITCH_RULE", message="Business or professional income can trigger the one-time regime switch-back rule and Form 10-IEA compliance check."))
    if profile.residential_status == "NRI":
        warnings.append(WarningItem(code="NRI_REBATE", message="NRI profiles are not given the resident individual 87A rebate in this engine."))
    if profile.income_sources.hra_received > 0 and not profile.rent_paid and not profile.deductions.rent_paid:
        missing.append({"field": "rent_paid", "why_it_matters": "HRA exemption can change the old-regime result.", "max_impact": profile.income_sources.hra_received})
    if profile.income_sources.hra_received > 0 and not (profile.city_type or profile.deductions.city_type):
        missing.append({"field": "city_type", "why_it_matters": "Metro and non-metro HRA limits differ.", "max_impact": profile.income_sources.hra_received})
    if profile.income_sources.rental_income > 0 and profile.municipal_taxes == 0:
        missing.append({"field": "municipal_taxes", "why_it_matters": "Municipal taxes affect net annual value of a let-out property.", "max_impact": profile.income_sources.rental_income})
    if profile.income_sources.ltcg_112a > 0:
        warnings.append(WarningItem(code="CAPITAL_GAINS", message="Capital-gains reporting can require transaction-level records; verify these values with a CA."))
    if profile.income_sources.lottery > 0:
        warnings.append(WarningItem(code="SPECIAL_RATE", message="Lottery income is taxed at a special rate and has limited deductions."))
    if profile.income_sources.employer_nps > 0 and profile.income_sources.basic == 0:
        errors.append(WarningItem(code="MISSING_BASIC", message="Basic salary is needed to validate the employer NPS percentage limit.", severity="error"))
    if not profile.income_sources.model_extra and sum(profile.income_sources.model_dump().values(), Decimal("0")) == 0:
        missing.append({"field": "income_sources", "why_it_matters": "At least one income source is needed for a meaningful comparison.", "max_impact": None})
    return errors, warnings, missing
