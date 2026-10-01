"""Deterministic, core-backed action plans with optional friendly wording."""
from __future__ import annotations

import re
from decimal import Decimal
from typing import Any, Mapping

from pydantic import BaseModel, ConfigDict

from .gemma import OllamaError, chat_json
from .prompts import TIP_TONE

try:
    from core.simulator import simulate
except Exception:  # pragma: no cover - allows isolated AI tests
    simulate = None  # type: ignore

D80C = Decimal("150000")
DNPS = Decimal("50000")
_AMOUNT = re.compile(r"(?:₹|Rs\.?\s*)[\d,]+(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\b")

class TipRewrite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: str
    detail: str


def _d(value: Any) -> Decimal:
    try:
        return Decimal(str(value or 0).replace(",", ""))
    except Exception:
        return Decimal("0")


def _amounts(text: str) -> list[str]:
    return [x.replace(" ", "") for x in _AMOUNT.findall(text)]


def _rewrite(title: str, detail: str) -> tuple[str, str]:
    try:
        result = chat_json([{"role": "system", "content": TIP_TONE}, {"role": "user", "content": f"Title: {title}\nDetail: {detail}"}], TipRewrite, temperature=0.4)
        if all(amount in _amounts(result.title + " " + result.detail) for amount in _amounts(title + " " + detail)):
            return result.title, result.detail
    except (OllamaError, Exception):
        pass
    return title, detail


def _saving(salary: Mapping[str, Any], change: Mapping[str, Any]) -> Decimal:
    if simulate is None:
        return Decimal("0")
    try:
        return max(Decimal("0"), _d(simulate(salary, regime="old", changes=change)["tax_saving"]))
    except Exception:
        return Decimal("0")


def get_action_plan(comparison: Mapping[str, Any], salary: Mapping[str, Any], deductions: Mapping[str, Any] | None) -> dict[str, Any]:
    """Suggest deductions without doing tax arithmetic outside core.simulator."""
    deductions = deductions or {}
    recommended = str(comparison.get("lower_tax_regime", comparison.get("recommended_regime", "old"))).lower()
    if recommended not in {"old", "new"}:
        recommended = "old"
    used_80c = min(D80C, _d(salary.get("employee_pf")) + _d(deductions.get("80c", salary.get("80c"))))
    used_nps = min(DNPS, _d(deductions.get("nps", salary.get("nps"))))
    tips: list[dict[str, Any]] = []
    if recommended == "new":
        tips.append({"impact": "low", "title": "Stick with the simpler regime", "detail": "Deductions do not apply in the New Regime, so you can focus on keeping your records tidy.", "saving": "0"})
    else:
        candidates: list[tuple[str, str, str, Decimal, Mapping[str, Any]]] = []
        headroom = D80C - used_80c
        if headroom > 0:
            saving = _saving(salary, {"additional_80c": headroom})
            candidates.append(("Grow your 80C cushion", f"You have ₹{headroom:f} of 80C room left. An eligible investment could save up to ₹{saving:f} based on your numbers.", "80C", saving, {"additional_80c": headroom}))
        nps_room = DNPS - used_nps
        if nps_room > 0:
            saving = _saving(salary, {"additional_nps": nps_room})
            candidates.append(("Explore your NPS headroom", f"An NPS contribution of up to ₹{nps_room:f} could save ₹{saving:f} based on your numbers.", "NPS", saving, {"additional_nps": nps_room}))
        claimed_80d = _d(deductions.get("80d"))
        premium = _d(deductions.get("health_insurance_premium", deductions.get("health_insurance", 0)))
        if claimed_80d == 0 and premium > 0:
            saving = _saving(salary, {"80d": premium})
            candidates.append(("Claim your health cover", f"Your ₹{premium:f} health premium may qualify for 80D and could save ₹{saving:f} based on your numbers.", "80D", saving, {"80d": premium}))
        if deductions.get("rent") and deductions.get("city"):
            candidates.append(("Keep your rent proof ready", "With rent and city details, check whether an HRA claim fits your case. The exact saving needs the core's HRA inputs.", "HRA", Decimal("0"), {}))
        candidates.sort(key=lambda item: item[3], reverse=True)
        for title, detail, _, saving, _ in candidates[:5]:
            impact = "high" if saving > 5000 else "medium" if saving >= 1000 else "low"
            title, detail = _rewrite(title, detail)
            tips.append({"impact": impact, "title": title, "detail": detail, "saving": format(saving, "f")})
    return {"tips": tips[:5], "usage_80c": {"used": format(used_80c, "f"), "limit": format(D80C, "f")}}
