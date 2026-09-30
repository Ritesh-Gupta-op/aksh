"""Simulator presentation helpers; scenario arithmetic is delegated to core."""
import json
from typing import Any, Mapping
from core.simulator import simulate

def _parse(value: Mapping[str, Any] | str) -> Mapping[str, Any]:
    if isinstance(value, Mapping):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        if not isinstance(parsed, dict):
            raise ValueError("Salary JSON must be an object")
        return parsed
    raise TypeError("salary data must be a mapping or JSON object")

def simulator_result(value: Mapping[str, Any] | str, additional_80c: Any = 0, additional_nps: Any = 0, additional_pf: Any = 0, regime: str = "old") -> dict[str, Any]:
    """Run a scenario and return the structured core result."""
    changes = {"additional_80c": additional_80c, "additional_nps": additional_nps, "additional_pf": additional_pf}
    return simulate(_parse(value), regime=regime, changes=changes)

def format_simulator_result(value: Mapping[str, Any] | str, additional_80c: Any = 0, additional_nps: Any = 0, additional_pf: Any = 0, regime: str = "old") -> str:
    result = simulator_result(value, additional_80c, additional_nps, additional_pf, regime)
    monthly = result["tax_saving"] / 12
    return "\n".join((f"Baseline tax: ₹{result['baseline_tax']:,.2f}", f"Scenario tax: ₹{result['scenario_tax']:,.2f}", f"Tax saving: ₹{result['tax_saving']:,.2f}", f"Monthly equivalent: ₹{monthly:,.2f}", f"Baseline taxable income: ₹{result['baseline_taxable_income']:,.2f}", f"Scenario taxable income: ₹{result['scenario_taxable_income']:,.2f}"))

def build_simulator_ui():
    try:
        import gradio as gr
    except ImportError as exc:
        raise RuntimeError("Gradio is not installed; use simulator_result() or install the UI dependency") from exc
    with gr.Blocks() as demo:
        gr.Markdown("## Tax simulator")
        salary = gr.Textbox(label="Salary data (JSON)", lines=8)
        regime = gr.Radio(["old", "new"], value="old", label="Regime")
        c80 = gr.Number(value=0, label="Additional 80C")
        nps = gr.Number(value=0, label="Additional NPS")
        pf = gr.Number(value=0, label="Additional employee PF")
        output = gr.Textbox(label="Scenario result", lines=8)
        gr.Button("Simulate").click(format_simulator_result, [salary, c80, nps, pf, regime], output)
    return demo
