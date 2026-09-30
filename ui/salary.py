"""Salary results presentation with no tax formulas."""
import json
from typing import Any, Mapping
from core.tax_engine import TaxResult, compare_regimes

def _parse_salary(value: Mapping[str, Any] | str) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise ValueError("Enter salary data as a JSON object or mapping") from exc
        if not isinstance(parsed, dict):
            raise ValueError("Salary JSON must be an object")
        return parsed
    raise TypeError("salary data must be a mapping or JSON object")

def salary_results(value: Mapping[str, Any] | str) -> dict[str, Any]:
    """Return structured old/new results for UI or an AI explanation layer."""
    return compare_regimes(_parse_salary(value))

def _display(result: TaxResult) -> str:
    return "\n".join((f"Regime: {result.regime}", f"Gross income: ₹{result.gross_income:,.2f}", f"Standard deduction: ₹{result.standard_deduction:,.2f}", f"Eligible deductions: ₹{result.deductions.total_eligible:,.2f}", f"Taxable income: ₹{result.taxable_income:,.2f}", f"Tax before rebate: ₹{result.tax_before_rebate:,.2f}", f"Rebate: ₹{result.rebate:,.2f}", f"Cess: ₹{result.cess:,.2f}", f"Total tax: ₹{result.total_tax:,.2f}", f"TDS: ₹{result.tds:,.2f}", f"Balance tax payable: ₹{result.balance_tax_payable:,.2f}"))

def format_salary_results(value: Mapping[str, Any] | str) -> tuple[str, str, str]:
    comparison = salary_results(value)
    return _display(comparison["old_regime"]), _display(comparison["new_regime"]), f"Lower calculated tax: {comparison['lower_tax_regime']} (difference: ₹{comparison['tax_difference']:,.2f})"

def build_salary_ui():
    """Build the optional Gradio salary panel; raises a clear error if absent."""
    try:
        import gradio as gr
    except ImportError as exc:
        raise RuntimeError("Gradio is not installed; use salary_results() or install the UI dependency") from exc
    with gr.Blocks() as demo:
        gr.Markdown("## Salary tax comparison\nEnter structured salary data as a JSON object.")
        input_data = gr.Textbox(label="Salary data (JSON)", lines=8, placeholder='{"basic": 480000, "hra": 240000, "bonus": 60000, "employee_pf": 57600}')
        button = gr.Button("Calculate")
        old = gr.Textbox(label="Old regime", lines=10)
        new = gr.Textbox(label="New regime", lines=10)
        comparison = gr.Textbox(label="Comparison")
        button.click(format_salary_results, inputs=input_data, outputs=[old, new, comparison])
    return demo
