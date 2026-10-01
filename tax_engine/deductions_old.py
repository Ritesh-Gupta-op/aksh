"""Old-regime deductions with caps and disallowed-excess reporting."""
from __future__ import annotations
from decimal import Decimal
from typing import Any
from .models import AuditStep, Deductions, UserProfile
D = Decimal

def _cap(name: str, claimed: D, limit: D, audit: list[AuditStep], disallowed: dict[str, D], reference: str) -> D:
    eligible = min(max(D("0"), claimed), limit)
    excess = max(D("0"), claimed - eligible)
    if excess:
        disallowed[name] = excess
    audit.append(AuditStep(label=f"{name} eligible", formula=f"min(claimed, cap {limit})", inputs={"claimed": claimed, "cap": limit}, result=eligible, legal_reference=reference))
    return eligible

def old_deductions(profile: UserProfile, pack: dict, employee_pf: D, hra_exemption: D, home_property_deduction: D) -> tuple[D, list[AuditStep], dict[str, D]]:
    d = profile.deductions
    limits = {key: D(str(value)) for key, value in pack["deduction_limits"].items()}
    audit: list[AuditStep] = []
    disallowed: dict[str, D] = {}
    eighty_c = employee_pf + d.section_80c + d.section_80ccd1
    total = _cap("80C including employee PF and 80CCD(1)", eighty_c, limits["80c"], audit, disallowed, "Sections 80C and 80CCD(1)")
    total += _cap("80CCD(1B)", d.section_80ccd1b, limits["80ccd1b"], audit, disallowed, "Section 80CCD(1B)")
    self_limit = limits["80d_self_senior"] if profile.age >= 60 else limits["80d_self_non_senior"]
    parent_limit = limits["80d_parents_senior"] if bool(profile.model_extra.get("parents_senior")) else limits["80d_parents_non_senior"]
    health = min(d.health_self + d.preventive_checkup, self_limit) + min(d.health_parents, parent_limit)
    claimed_health = d.health_self + d.preventive_checkup + d.health_parents
    if claimed_health > health:
        disallowed["80D"] = claimed_health - health
    audit.append(AuditStep(label="80D eligible", formula="self/family cap + parents cap", inputs={"claimed": claimed_health, "self_cap": self_limit, "parents_cap": parent_limit}, result=health, legal_reference="Section 80D"))
    total += health
    for field, limit_key, section in (("section_80dd", "80u", "80DD"), ("section_80ddb", "80u", "80DDB"), ("section_80e", "80u", "80E"), ("section_80eea", "80u", "80EEA"), ("section_80eeb", "80u", "80EEB")):
        claimed = getattr(d, field)
        if claimed:
            total += _cap(section, claimed, limits[limit_key], audit, disallowed, section)
    interest_cap = limits["80ttb"] if profile.age >= 60 else limits["80tta"]
    interest_claim = d.section_80ttb if profile.age >= 60 else d.section_80tta
    total += _cap("80TTA/80TTB", interest_claim, interest_cap, audit, disallowed, "Section 80TTA/80TTB")
    total += min(d.section_80g, d.section_80g)  # qualifying percentage requires donation metadata; keep claimed amount auditable
    if d.section_80g:
        audit.append(AuditStep(label="80G claimed amount", formula="qualifying percentage requires recipient metadata", inputs={"claimed": d.section_80g}, result=d.section_80g, legal_reference="Section 80G; verify qualifying category"))
    other_claim = max(D("0"), d.other_old_deductions)
    other_total = d.professional_tax + other_claim
    total += other_total
    audit.append(AuditStep(label="Other old-regime deductions", formula="professional tax + verified other claims", inputs={"professional_tax": d.professional_tax, "other": other_claim}, result=other_total, legal_reference="Sections 16(iii) and Chapter VI-A"))
    # Home-loan interest is already reflected in house-property income; avoid double subtraction.
    return total, audit, disallowed
