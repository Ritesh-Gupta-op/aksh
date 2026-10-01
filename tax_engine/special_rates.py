"""Special-rate income kept separate from normal slab income."""
from decimal import Decimal
from .models import AuditStep, UserProfile
D = Decimal

def special_rate_tax(profile: UserProfile, pack: dict) -> tuple[D, D, list[AuditStep]]:
    i = profile.income_sources
    rates = pack["special_rates"]
    total = D("0")
    special_income = D("0")
    audit: list[AuditStep] = []
    for field, rate_key in (("stcg_111a", "stcg_111a"), ("other_ltcg", "other_ltcg"), ("lottery", "lottery")):
        amount = getattr(i, field)
        if amount <= 0:
            continue
        rate = D(str(rates[rate_key]))
        taxable = amount
        if field == "other_ltcg":
            taxable = amount
        tax = taxable * rate
        special_income += taxable
        total += tax
        audit.append(AuditStep(label=f"Special-rate tax: {field}", formula=f"{taxable} × {rate}", inputs={"income": amount, "rate": rate}, result=tax, legal_reference=f"Section 111A/112/115BB as applicable"))
    ltcg = i.ltcg_112a
    if ltcg > 0:
        exemption = D(str(rates["ltcg_112a_exemption"]))
        taxable = max(D("0"), ltcg - exemption)
        rate = D(str(rates["ltcg_112a"]))
        tax = taxable * rate
        special_income += ltcg
        total += tax
        audit.append(AuditStep(label="Special-rate tax: LTCG 112A", formula="max(0, LTCG − annual exemption) × rate", inputs={"income": ltcg, "exemption": exemption, "rate": rate}, result=tax, legal_reference="Section 112A, Income-tax Act, 1961"))
    return special_income, total, audit
