import csv
import json
from decimal import Decimal
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from ai.gemma import OllamaError, parse_slip
from ai.advisor import get_action_plan
from ai.upi_analyzer import analyze_upi


def reply(payload):
    response = Mock()
    response.status_code = 200
    response.json.return_value = {"message": {"content": json.dumps(payload) if isinstance(payload, dict) else payload}}
    response.raise_for_status.return_value = None
    return response


def extracted(period="monthly", **values):
    base = {"period": period, "gross_salary": None, "basic": None, "hra": None, "da": None, "special_allowance": None, "bonus": None, "employee_pf": None, "professional_tax": None, "tds": None}
    base.update(values)
    return base


def test_monthly_and_rupee_amounts_are_annualized():
    payload = extracted(basic="₹50,000", hra="25,000", special_allowance="20,000", gross_salary="95,000", employee_pf="₹6,000", professional_tax="200", tds="4,500")
    with patch("ai.gemma.requests.post", return_value=reply(payload)):
        result = parse_slip("monthly slip")
    assert result["salary"]["gross_salary"] == "1140000"
    assert result["salary"]["basic"] == "600000"
    assert result["components"][0]["explanation"]


def test_annual_and_missing_gross_warns():
    payload = extracted("annual", basic="500000", hra="200000")
    with patch("ai.gemma.requests.post", return_value=reply(payload)):
        result = parse_slip("annual statement")
    assert result["salary"]["gross_salary"] == "700000"
    assert result["warnings"]


def test_invalid_json_retries_with_validation_error():
    bad = reply("not json")
    good = reply(extracted("annual", basic="100"))
    with patch("ai.gemma.requests.post", side_effect=[bad, good]) as post:
        result = parse_slip("annual")
    assert result["salary"]["basic"] == "100"
    assert post.call_count == 2
    assert "Validation error" in post.call_args_list[1].kwargs["json"]["messages"][-1]["content"]


def test_advisor_ranks_savings_and_new_regime():
    comparison = {"lower_tax_regime": "old"}
    salary = {"gross_salary": "1500000", "employee_pf": "0"}
    with patch("ai.advisor.simulate", side_effect=[{"tax_saving": Decimal("2000")}, {"tax_saving": Decimal("7000")}]), patch("ai.advisor.chat_json", side_effect=OllamaError("offline")):
        plan = get_action_plan(comparison, salary, {})
    assert plan["tips"][0]["saving"] == "7000"
    with patch("ai.advisor.chat_json", side_effect=OllamaError("offline")):
        new_plan = get_action_plan({"lower_tax_regime": "new"}, salary, {})
    assert "do not apply" in new_plan["tips"][0]["detail"]


def test_tip_rewrite_number_change_falls_back(monkeypatch):
    class Bad:
        title = "Save ₹999 now"
        detail = "This could save ₹999."
    monkeypatch.setattr("ai.advisor.chat_json", lambda *args, **kwargs: Bad())
    with patch("ai.advisor.simulate", return_value={"tax_saving": Decimal("2000")}):
        plan = get_action_plan({"lower_tax_regime": "old"}, {"gross_salary": "1500000"}, {})
    assert "150000" in plan["tips"][0]["detail"]


def test_upi_rules_and_one_gemma_fallback(tmp_path):
    path = tmp_path / "upi.csv"
    path.write_text("date,description,amount,type\n2025-04-01,Health Insurance,10000,debit\n2025-04-02,Coffee Shop,500,debit\n2025-04-03,Salary,50000,credit\n")
    fallback = Mock(category="none")
    with patch("ai.upi_analyzer.chat_json", return_value=type("Batch", (), {"rows": [fallback]})()) as classify, patch("ai.upi_analyzer.simulate", return_value={"tax_saving": Decimal("1000")}):
        result = analyze_upi(path, {"gross_salary": "1500000"}, {})
    assert [row["category"] for row in result["transactions"]] == ["80D_health", "none"]
    assert all(row["status"] == "needs_proof" for row in result["transactions"])
    assert classify.call_count == 1
    assert result["notes"]
