"""Scenario orchestration; all tax arithmetic remains in tax_engine."""
from copy import deepcopy
from decimal import Decimal
from typing import Any, Mapping
from .deductions import money
from .tax_engine import TaxResult, calculate_tax
from .tax_config import SUPPORTED_TAX_YEAR

def simulate(salary_data: Mapping[str, Any], regime: str = "old", changes: Mapping[str, Any] | None = None, tax_year: str = SUPPORTED_TAX_YEAR, **kwargs: Any) -> dict[str, Any]:
    """Compare baseline tax with a scenario using changed supported inputs.

    Changes are additive for ``80c``, ``nps`` and ``pf``; ``80d`` and other
    supported salary fields are replaced. Values are validated by the engine.
    """
    if changes is None:
        changes = {}
    if kwargs:
        changes = {**changes, **kwargs}
    baseline = calculate_tax(salary_data, regime, tax_year)
    scenario_data = deepcopy(dict(salary_data))
    applied: dict[str, Decimal] = {}
    for key, raw in changes.items():
        if key in {"80c", "additional_80c"}:
            amount = money(raw, key)
            scenario_data["80c"] = money(salary_data.get("80c", salary_data.get("deduction_80c", 0)), "80c") + amount
            applied["80c"] = amount
        elif key in {"nps", "additional_nps"}:
            amount = money(raw, key)
            scenario_data["nps"] = money(salary_data.get("nps", 0), "nps") + amount
            applied["nps"] = amount
        elif key in {"pf", "additional_pf"}:
            amount = money(raw, key)
            scenario_data["employee_pf"] = money(salary_data.get("employee_pf", salary_data.get("pf", 0)), "employee_pf") + amount
            applied["pf"] = amount
        elif key == "80d":
            scenario_data["80d"] = money(raw, key)
            applied[key] = money(raw, key)
        else:
            raise ValueError(f"Unsupported simulator change: {key}")
    scenario = calculate_tax(scenario_data, regime, tax_year)
    saving = baseline.total_tax - scenario.total_tax
    return {"baseline_tax": baseline.total_tax, "scenario_tax": scenario.total_tax, "tax_saving": saving, "baseline_taxable_income": baseline.taxable_income, "scenario_taxable_income": scenario.taxable_income, "changes": applied, "baseline": baseline, "scenario": scenario}
