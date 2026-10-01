"""Deductions and exemptions available in the new regime."""
from decimal import Decimal
from .models import AuditStep, UserProfile
D = Decimal

def new_deductions(profile: UserProfile, pack: dict) -> tuple[D, list[AuditStep], dict[str, D]]:
    d = profile.deductions
    employer_nps = profile.income_sources.employer_nps
    basic_da = profile.income_sources.basic + profile.income_sources.da
    statutory_cap = basic_da * D(str(pack["employer_nps_percent"]["new"]))
    claimed = d.section_80ccd2 or employer_nps
    eligible = min(claimed, statutory_cap)
    disallowed = {"80CCD(2)": claimed - eligible} if claimed > eligible else {}
    audit = [AuditStep(label="80CCD(2) new-regime deduction", formula="min(employer NPS, percentage of salary)", inputs={"claimed": claimed, "salary_base": basic_da, "rate": pack["employer_nps_percent"]["new"]}, result=eligible, legal_reference="Section 80CCD(2)")]
    return eligible, audit, disallowed
