"""Typed inputs and outputs for the auditable tax engine."""
from __future__ import annotations

from decimal import Decimal
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

D = Decimal
Money = Decimal

class IncomeSources(BaseModel):
    model_config = ConfigDict(extra="allow")
    basic: Money = D("0")
    da: Money = D("0")
    hra_received: Money = D("0")
    special_allowance: Money = D("0")
    lta_received: Money = D("0")
    bonus: Money = D("0")
    perquisites: Money = D("0")
    employer_nps: Money = D("0")
    employer_pf: Money = D("0")
    other_salary: Money = D("0")
    savings_interest: Money = D("0")
    fd_interest: Money = D("0")
    dividends: Money = D("0")
    lottery: Money = D("0")
    other_income: Money = D("0")
    rental_income: Money = D("0")
    stcg_111a: Money = D("0")
    ltcg_112a: Money = D("0")
    other_stcg: Money = D("0")
    other_ltcg: Money = D("0")
    business_income: Money = D("0")

    @field_validator("basic", "da", "hra_received", "special_allowance", "lta_received", "bonus", "perquisites", "employer_nps", "employer_pf", "other_salary", "savings_interest", "fd_interest", "dividends", "lottery", "other_income", "rental_income", "stcg_111a", "ltcg_112a", "other_stcg", "other_ltcg", "business_income", mode="before")
    @classmethod
    def non_negative(cls, value: Any) -> Decimal:
        result = D(str(value or 0).replace(",", ""))
        if not result.is_finite() or result < 0:
            raise ValueError("income values must be finite and non-negative")
        return result

class Deductions(BaseModel):
    section_80c: Money = Field(D("0"), alias="80c")
    section_80ccd1: Money = Field(D("0"), alias="80ccd1")
    section_80ccd1b: Money = Field(D("0"), alias="80ccd1b")
    section_80ccd2: Money = Field(D("0"), alias="80ccd2")
    health_self: Money = D("0")
    health_parents: Money = D("0")
    preventive_checkup: Money = D("0")
    section_80dd: Money = D("0")
    section_80ddb: Money = D("0")
    section_80e: Money = D("0")
    section_80eea: Money = D("0")
    section_80eeb: Money = D("0")
    section_80g: Money = D("0")
    section_80gg: Money = D("0")
    section_80tta: Money = D("0")
    section_80ttb: Money = D("0")
    section_80u: Money = D("0")
    professional_tax: Money = D("0")
    home_loan_interest: Money = D("0")
    rent_paid: Money = D("0")
    city_type: Literal["metro", "non_metro"] | None = None
    hra_exemption_claimed: Money | None = None
    lta_exemption_claimed: Money = D("0")
    other_old_deductions: Money = D("0")

    @field_validator("section_80c", "section_80ccd1", "section_80ccd1b", "section_80ccd2", "health_self", "health_parents", "preventive_checkup", "section_80dd", "section_80ddb", "section_80e", "section_80eea", "section_80eeb", "section_80g", "section_80gg", "section_80tta", "section_80ttb", "section_80u", "professional_tax", "home_loan_interest", "rent_paid", "lta_exemption_claimed", "other_old_deductions", mode="before")
    @classmethod
    def non_negative(cls, value: Any) -> Decimal:
        result = D(str(value or 0).replace(",", ""))
        if not result.is_finite() or result < 0:
            raise ValueError("deductions must be finite and non-negative")
        return result

    model_config = ConfigDict(populate_by_name=True, extra="allow")

class UserProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")
    financial_year: str = "FY 2025-26"
    age: int = Field(30, ge=0, le=120)
    residential_status: Literal["resident", "NRI", "RNOR"] = "resident"
    employment_type: Literal["salaried", "business", "professional", "mixed"] = "salaried"
    income_sources: IncomeSources = Field(default_factory=IncomeSources)
    deductions: Deductions = Field(default_factory=Deductions)
    tds: Money = D("0")
    advance_tax: Money = D("0")
    rent_paid: Money = D("0")
    city_type: Literal["metro", "non_metro"] | None = None
    home_loan_interest: Money = D("0")
    self_occupied: bool = True
    municipal_taxes: Money = D("0")
    property_interest: Money = D("0")
    business_income_flag: bool = False
    lta_eligible: bool = False
    da_for_retirement: bool = True

    @field_validator("tds", "advance_tax", "rent_paid", "home_loan_interest", "municipal_taxes", "property_interest", mode="before")
    @classmethod
    def money_fields(cls, value: Any) -> Decimal:
        result = D(str(value or 0).replace(",", ""))
        if not result.is_finite() or result < 0:
            raise ValueError("profile money values must be finite and non-negative")
        return result

class AuditStep(BaseModel):
    label: str
    formula: str
    inputs: dict[str, Any] = Field(default_factory=dict)
    result: Any
    legal_reference: str

class WarningItem(BaseModel):
    code: str
    message: str
    severity: Literal["warning", "error"] = "warning"

class RegimeResult(BaseModel):
    regime: Literal["OLD", "NEW"]
    gross_total_income: Money
    salary_income: Money
    house_property_income: Money
    normal_income: Money
    special_rate_income: Money
    standard_deduction: Money
    hra_exemption: Money
    old_regime_deductions: Money
    taxable_income: Money
    normal_slab_tax: Money
    special_rate_tax: Money
    rebate: Money
    surcharge: Money
    cess: Money
    total_tax: Money
    tds: Money
    advance_tax: Money
    net_payable_or_refund: Money
    effective_tax_rate: Money
    marginal_tax_rate: Money
    disallowed_deductions: dict[str, Money] = Field(default_factory=dict)
    audit: list[AuditStep] = Field(default_factory=list)
    warnings: list[WarningItem] = Field(default_factory=list)

class ScenarioResult(BaseModel):
    scenario: str
    old_tax: Money
    new_tax: Money
    delta_tax: Money
    details: dict[str, Any] = Field(default_factory=dict)

class Comparison(BaseModel):
    financial_year: str
    engine_version: str
    old: RegimeResult
    new: RegimeResult
    recommended_regime: Literal["OLD", "NEW", "SAME"]
    savings: Money
    savings_percent: Money
    confidence: Literal["clear", "marginal", "needs_data"]
    current_old_deductions: Money
    break_even_deduction: Money | None = None
    break_even_additional: Money | None = None
    flip_deduction: dict[str, Any] | None = None
    sensitivity: list[ScenarioResult] = Field(default_factory=list)
    warnings: list[WarningItem] = Field(default_factory=list)
    missing_fields: list[dict[str, Any]] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    reasons: list[dict[str, str]] = Field(default_factory=list)

    def model_dump_json_safe(self) -> dict[str, Any]:
        return self.model_dump(mode="json", by_alias=True)
