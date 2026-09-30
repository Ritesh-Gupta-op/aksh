"""Deterministic AY 2026-27 tax calculations for Aksh."""
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Mapping
from .deductions import DeductionBreakdown, eligible_deductions, money
from .tax_config import CESS_RATE, REGIME_CONFIGS, SUPPORTED_TAX_YEAR, RegimeConfig

_CENT = Decimal("0.01")
_ZERO = Decimal("0")

def _round(value: Decimal) -> Decimal:
    return value.quantize(_CENT, rounding=ROUND_HALF_UP)

def _gross_income(salary: Mapping[str, Any]) -> Decimal:
    component_keys = ("basic", "da", "hra", "special_allowance", "other_allowances", "bonus", "other_taxable_allowances")
    present = [key for key in component_keys if salary.get(key) not in (None, "")]
    if present:
        return sum((money(salary.get(key, 0), key) for key in component_keys), _ZERO) + money(salary.get("other_income", 0), "other_income")
    return money(salary.get("gross_salary", salary.get("gross", 0)), "gross_salary") + money(salary.get("other_income", 0), "other_income")

def calculate_slab_tax(taxable_income: Decimal, config: RegimeConfig) -> Decimal:
    """Calculate progressive slab tax, not marginal rate times total income."""
    remaining, lower, tax = taxable_income, _ZERO, _ZERO
    for upper, rate in config.slabs:
        portion = remaining if upper is None else min(remaining, upper - lower)
        if portion > _ZERO:
            tax += portion * rate
            remaining -= portion
        if remaining <= _ZERO:
            break
        if upper is not None:
            lower = upper
    return _round(tax)

def calculate_rebate(taxable_income: Decimal, tax_before_rebate: Decimal, regime: str, config: RegimeConfig) -> Decimal:
    if taxable_income <= config.rebate_threshold:
        return _round(min(tax_before_rebate, config.rebate_maximum))
    return _ZERO

def calculate_surcharge(taxable_income: Decimal, tax_after_rebate: Decimal, config: RegimeConfig) -> Decimal:
    rate = _ZERO
    for threshold, candidate in config.surcharge:
        if taxable_income > threshold:
            rate = candidate
    return _round(tax_after_rebate * rate)

@dataclass(frozen=True)
class TaxResult:
    tax_year: str
    regime: str
    gross_income: Decimal
    standard_deduction: Decimal
    deductions: DeductionBreakdown
    taxable_income: Decimal
    tax_before_rebate: Decimal
    rebate: Decimal
    tax_after_rebate: Decimal
    surcharge: Decimal
    cess: Decimal
    total_tax: Decimal
    tds: Decimal
    balance_tax_payable: Decimal

    def to_dict(self) -> dict[str, Any]:
        result = {"tax_year": self.tax_year, "regime": self.regime, "gross_income": self.gross_income, "standard_deduction": self.standard_deduction, "deductions": self.deductions.to_dict(), "taxable_income": self.taxable_income, "tax_before_rebate": self.tax_before_rebate, "rebate": self.rebate, "tax_after_rebate": self.tax_after_rebate, "surcharge": self.surcharge, "cess": self.cess, "total_tax": self.total_tax, "tds": self.tds, "balance_tax_payable": self.balance_tax_payable}
        return result

def calculate_tax(salary_data: Mapping[str, Any], regime: str = "new", tax_year: str = SUPPORTED_TAX_YEAR) -> TaxResult:
    """Calculate one regime's liability from structured salary data."""
    if tax_year != SUPPORTED_TAX_YEAR:
        raise ValueError("Unsupported tax year")
    if regime not in REGIME_CONFIGS:
        raise ValueError("Unsupported tax regime")
    if not isinstance(salary_data, Mapping):
        raise TypeError("salary_data must be a mapping")
    config = REGIME_CONFIGS[regime]
    gross = _gross_income(salary_data)
    deductions = eligible_deductions(salary_data, regime)
    standard = min(gross, config.standard_deduction)
    taxable = max(_ZERO, gross - standard - deductions.total_eligible)
    before = calculate_slab_tax(taxable, config)
    rebate = calculate_rebate(taxable, before, regime, config)
    after = _round(max(_ZERO, before - rebate))
    surcharge = calculate_surcharge(taxable, after, config)
    cess = _round((after + surcharge) * CESS_RATE)
    total = _round(after + surcharge + cess)
    tds = money(salary_data.get("tds", 0), "tds")
    balance = _round(total - tds)
    return TaxResult(tax_year, regime, _round(gross), _round(standard), deductions, _round(taxable), before, rebate, after, surcharge, cess, total, _round(tds), balance)

def compare_regimes(salary_data: Mapping[str, Any], tax_year: str = SUPPORTED_TAX_YEAR) -> dict[str, Any]:
    """Return both authoritative results and the numerical difference."""
    old = calculate_tax(salary_data, "old", tax_year)
    new = calculate_tax(salary_data, "new", tax_year)
    difference = _round(old.total_tax - new.total_tax)
    lower = "same" if difference == _ZERO else ("old" if difference < _ZERO else "new")
    return {"old_regime": old, "new_regime": new, "tax_difference": difference, "lower_tax_regime": lower}
