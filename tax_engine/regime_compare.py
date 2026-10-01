"""The public TaxEngine orchestration layer."""
from __future__ import annotations
from decimal import Decimal
from typing import Callable
from .cess import health_education_cess
from .deductions_new import new_deductions
from .deductions_old import old_deductions
from .hra import calculate_hra_exemption
from .income import house_property, other_normal_income, salary_total
from .models import AuditStep, Comparison, RegimeResult, ScenarioResult, UserProfile, WarningItem
from .rebate import rebate_and_relief
from .rules.loader import RulePack, load_rule_pack
from .slabs import age_bracket, round_rupees, round_ten, slab_tax
from .special_rates import special_rate_tax
from .surcharge import surcharge_tax
from .validators import validate_profile

D = Decimal
ENGINE_VERSION = "2.0.0"

class TaxEngine:
    """Pure calculation facade; rule loading is the only filesystem operation."""
    def __init__(self, financial_year: str = "FY 2025-26") -> None:
        self.pack: RulePack = load_rule_pack(financial_year)
        self.rules = self.pack.model_dump(mode="python")

    def calculate(self, profile: UserProfile | dict, regime: str) -> RegimeResult:
        return _calculate(UserProfile.model_validate(profile), regime.upper(), self.rules)

    def compare(self, profile: UserProfile | dict) -> Comparison:
        return compare_profile(UserProfile.model_validate(profile), self.rules)

def _calculate(profile: UserProfile, regime: str, pack: dict, extra_old_deduction: D = D("0")) -> RegimeResult:
    old = regime == "OLD"
    warnings: list[WarningItem] = []
    errors, validation_warnings, missing = validate_profile(profile)
    if errors:
        raise ValueError("; ".join(item.message for item in errors))
    warnings.extend(validation_warnings)
    if not pack.get("verified", False):
        warnings.append(WarningItem(code="UNVERIFIED_RULE_PACK", message=f"Some {pack['financial_year']} rule values are not yet verified against the current Finance Act."))
    salary_gross, audit = salary_total(profile)
    hra, hra_step, hra_warnings = calculate_hra_exemption(profile, old)
    if hra_step:
        audit.append(hra_step)
    warnings.extend(WarningItem(code="HRA_MISSING", message=text) for text in hra_warnings)
    lta = profile.deductions.lta_exemption_claimed if old and profile.lta_eligible else D("0")
    if profile.income_sources.lta_received and not profile.lta_eligible:
        warnings.append(WarningItem(code="LTA_UNVERIFIED", message="LTA was treated as taxable because eligible travel details were not provided."))
    salary_income = salary_gross - hra - lta
    property_income, property_audit, property_warnings = house_property(profile, old)
    audit.extend(property_audit)
    warnings.extend(property_warnings)
    other_income = other_normal_income(profile)
    special_income, special_tax, special_audit = special_rate_tax(profile, pack)
    audit.extend(special_audit)
    gross_total = max(D("0"), salary_income + property_income + other_income + special_income)
    audit.append(AuditStep(label="Gross total income", formula="salary + house property + other normal income + special-rate income", inputs={"salary": salary_income, "house_property": property_income, "other_normal": other_income, "special_rate": special_income}, result=gross_total, legal_reference="Heads of income, Income-tax Act"))
    standard = D(str(pack["standard_deduction"]["old" if old else "new"]))
    standard = min(standard, max(D("0"), salary_income))
    audit.append(AuditStep(label="Standard deduction", formula="min(statutory standard deduction, salary income)", inputs={"salary_income": salary_income, "statutory": standard}, result=standard, legal_reference="Section 16(ia)"))
    if old:
        working_profile = profile
        if extra_old_deduction:
            working_profile = profile.model_copy(deep=True)
            working_profile.deductions = profile.deductions.model_copy(update={"other_old_deductions": profile.deductions.other_old_deductions + extra_old_deduction})
        deductions, deduction_audit, disallowed = old_deductions(working_profile, pack, profile.income_sources.employer_pf, hra, property_income)
    else:
        deductions, deduction_audit, disallowed = new_deductions(profile, pack)
    audit.extend(deduction_audit)
    normal_before_deductions = salary_income + property_income + other_income
    normal_income = max(D("0"), normal_before_deductions - standard)
    taxable_normal = max(D("0"), normal_income - deductions)
    audit.append(AuditStep(label="Taxable normal-rate income", formula="max(0, normal income − standard deduction − eligible deductions)", inputs={"normal_income": normal_income, "standard": standard, "deductions": deductions}, result=taxable_normal, legal_reference="Income-tax computation provisions"))
    if old:
        slabs = pack["old_slabs"][age_bracket(profile.age)]
    else:
        slabs = pack["new_slabs"]
    slab, slab_audit, marginal_rate = slab_tax(taxable_normal, slabs, f"{regime} regime")
    audit.extend(slab_audit)
    rebate, rebate_audit = rebate_and_relief(taxable_normal, slab, profile, regime, pack)
    audit.extend(rebate_audit)
    after_rebate = max(D("0"), slab - rebate)
    surcharge, surcharge_audit = surcharge_tax(after_rebate + special_tax, gross_total, regime, special_income, pack)
    audit.extend(surcharge_audit)
    cess_base = after_rebate + special_tax + surcharge
    cess, cess_step = health_education_cess(cess_base, pack)
    audit.append(cess_step)
    total = round_ten(cess_base + cess)
    audit.append(AuditStep(label="Tax rounded under the Act", formula="round(total tax to nearest ₹10)", inputs={"unrounded_tax": cess_base + cess}, result=total, legal_reference="Section 288B"))
    paid = profile.tds + profile.advance_tax
    payable = total - paid
    audit.append(AuditStep(label="Taxes already paid", formula="TDS + advance tax", inputs={"tds": profile.tds, "advance_tax": profile.advance_tax}, result=paid, legal_reference="Tax credit provisions"))
    audit.append(AuditStep(label="Net payable or refund", formula="final tax − taxes already paid", inputs={"final_tax": total, "paid": paid}, result=payable, legal_reference="Return computation"))
    effective = (total / gross_total * D("100")) if gross_total else D("0")
    marginal = max(marginal_rate, D(str(pack["special_rates"]["lottery"])) if profile.income_sources.lottery else D("0")) * D("100")
    audit.append(AuditStep(label="Effective tax rate", formula="final tax ÷ gross total income × 100", inputs={"final_tax": total, "gross_total_income": gross_total}, result=effective, legal_reference="Informational metric"))
    return RegimeResult(regime=regime, gross_total_income=round_rupees(gross_total), salary_income=round_rupees(salary_income), house_property_income=round_rupees(property_income), normal_income=round_rupees(taxable_normal), special_rate_income=round_rupees(special_income), standard_deduction=round_rupees(standard), hra_exemption=round_rupees(hra), old_regime_deductions=round_rupees(deductions), taxable_income=round_rupees(taxable_normal + special_income), normal_slab_tax=round_rupees(slab), special_rate_tax=round_rupees(special_tax), rebate=round_rupees(rebate), surcharge=round_rupees(surcharge), cess=round_rupees(cess), total_tax=total, tds=round_rupees(profile.tds), advance_tax=round_rupees(profile.advance_tax), net_payable_or_refund=round_ten(payable), effective_tax_rate=effective, marginal_tax_rate=marginal, disallowed_deductions=disallowed, audit=audit, warnings=warnings)

def _scenario(profile: UserProfile, pack: dict, name: str, transform: Callable[[UserProfile], UserProfile]) -> ScenarioResult:
    base_old = _calculate(profile, "OLD", pack).total_tax
    base_new = _calculate(profile, "NEW", pack).total_tax
    changed = transform(profile)
    old = _calculate(changed, "OLD", pack).total_tax
    new = _calculate(changed, "NEW", pack).total_tax
    return ScenarioResult(scenario=name, old_tax=old, new_tax=new, delta_tax=(old - base_old) - (new - base_new), details={"old_delta": old - base_old, "new_delta": new - base_new})

def _scale_income(profile: UserProfile, factor: D) -> UserProfile:
    values = {name: value * factor for name, value in profile.income_sources.model_dump().items() if isinstance(value, D)}
    return profile.model_copy(update={"income_sources": profile.income_sources.model_copy(update=values)})

def _extra_deduction(profile: UserProfile, amount: D) -> UserProfile:
    return profile.model_copy(deep=True, update={"deductions": profile.deductions.model_copy(update={"other_old_deductions": profile.deductions.other_old_deductions + amount})})

def _without_hra(profile: UserProfile) -> UserProfile:
    return profile.model_copy(update={"rent_paid": D("0"), "city_type": None, "income_sources": profile.income_sources.model_copy(update={"hra_received": D("0")})})

def _break_even(profile: UserProfile, pack: dict, new_tax: D, current_old_deductions: D) -> tuple[D | None, D | None, dict[str, object] | None]:
    current_old = _calculate(profile, "OLD", pack).total_tax
    if current_old <= new_tax + D("10"):
        return current_old_deductions, D("0"), None
    high = D("10000000")
    if _calculate(_extra_deduction(profile, high), "OLD", pack).total_tax > new_tax + D("10"):
        return None, None, None
    low = D("0")
    for _ in range(32):
        mid = (low + high) / D("2")
        tax = _calculate(_extra_deduction(profile, mid), "OLD", pack).total_tax
        if tax > new_tax + D("10"):
            low = mid
        else:
            high = mid
    additional = high.quantize(D("1"))
    return current_old_deductions + additional, additional, {"action": "Increase eligible old-regime deductions", "amount_needed": additional, "deduction": "other eligible old-regime deduction"}

def compare_profile(profile: UserProfile, pack: dict | None = None) -> Comparison:
    if pack is None:
        pack = load_rule_pack(profile.financial_year).model_dump(mode="python")
    old = _calculate(profile, "OLD", pack)
    new = _calculate(profile, "NEW", pack)
    difference = old.total_tax - new.total_tax
    recommended = "OLD" if difference < -D("10") else "NEW" if difference > D("10") else "SAME"
    savings = abs(difference)
    denominator = max(old.total_tax, new.total_tax, D("1"))
    savings_pct = savings / denominator * D("100")
    confidence = "needs_data" if old.warnings or new.warnings else "marginal" if savings <= D("5000") else "clear"
    break_even, extra, flip = _break_even(profile, pack, new.total_tax, old.old_regime_deductions)
    candidates: list[dict[str, object]] = []
    candidate_specs = [
        ("80C", D("150000"), lambda p, amount: p.model_copy(deep=True, update={"deductions": p.deductions.model_copy(update={"section_80c": p.deductions.section_80c + amount})})),
        ("80CCD(1B)", D("50000"), lambda p, amount: p.model_copy(deep=True, update={"deductions": p.deductions.model_copy(update={"section_80ccd1b": p.deductions.section_80ccd1b + amount})})),
        ("80D", D("25000"), lambda p, amount: p.model_copy(deep=True, update={"deductions": p.deductions.model_copy(update={"health_self": p.deductions.health_self + amount})})),
    ]
    if old.total_tax > new.total_tax:
        for name, limit, transform in candidate_specs:
            if _calculate(transform(profile, limit), "OLD", pack).total_tax <= new.total_tax + D("10"):
                low, high = D("0"), limit
                for _ in range(28):
                    mid = (low + high) / D("2")
                    if _calculate(transform(profile, mid), "OLD", pack).total_tax <= new.total_tax + D("10"):
                        high = mid
                    else:
                        low = mid
                candidates.append({"deduction": name, "amount_needed": high.quantize(D("1"))})
    if candidates:
        flip = min(candidates, key=lambda item: D(str(item["amount_needed"])))
    reasons = []
    if new.rebate > 0: reasons.append({"code": "REBATE_87A_NEW", "detail": "The new regime result includes a Section 87A rebate."})
    if old.old_regime_deductions > 0: reasons.append({"code": "OLD_DEDUCTIONS_USED", "detail": "Eligible old-regime deductions reduced taxable income."})
    if profile.income_sources.hra_received and old.hra_exemption > 0: reasons.append({"code": "HRA_EXEMPTION", "detail": "Verified HRA inputs reduced old-regime salary income."})
    _, validation_warnings, missing_fields = validate_profile(profile)
    warnings = old.warnings + new.warnings
    warnings.extend(item for item in validation_warnings if item not in warnings)
    return Comparison(financial_year=pack["financial_year"], engine_version=ENGINE_VERSION, old=old, new=new, recommended_regime=recommended, savings=round_ten(savings), savings_percent=savings_pct, confidence="needs_data" if missing_fields else confidence, current_old_deductions=old.old_regime_deductions, break_even_deduction=break_even, break_even_additional=extra, flip_deduction=flip, sensitivity=[_scenario(profile, pack, "income −10%", lambda p: _scale_income(p, D("0.90"))), _scenario(profile, pack, "income +10%", lambda p: _scale_income(p, D("1.10"))), _scenario(profile, pack, "old deductions +₹50,000", lambda p: _extra_deduction(p, D("50000"))), _scenario(profile, pack, "old deductions −₹50,000", lambda p: _extra_deduction(p, D("-50000"))), _scenario(profile, pack, "HRA off", _without_hra), _scenario(profile, pack, "NPS +₹50,000", lambda p: p.model_copy(deep=True, update={"deductions": p.deductions.model_copy(update={"section_80ccd1b": p.deductions.section_80ccd1b + D("50000")})}))], warnings=warnings, missing_fields=missing_fields, assumptions=["All supplied monetary inputs are annual amounts.", "Unprovided deductions and income sources are treated as zero.", "Tax is rounded to nearest ₹10 only at final total and payable/refund."], reasons=reasons)
