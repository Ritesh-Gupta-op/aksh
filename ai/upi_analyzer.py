"""Private, local UPI classification with deterministic first-pass rules."""
from __future__ import annotations

import csv
import json
from decimal import Decimal
from pathlib import Path
from typing import Any, Mapping, Literal

from pydantic import BaseModel, ConfigDict

from .gemma import OllamaError, chat_json

try:
    from core.simulator import simulate
except Exception:  # pragma: no cover
    simulate = None  # type: ignore

Category = Literal["80D_health", "80C_investment", "HRA_rent", "NPS_80CCD1B", "none"]
class Categorized(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category: Category
class CategorizedRows(BaseModel):
    rows: list[Categorized]

_HEALTH = ("health insurance", "mediclaim", "star health", "hdfc ergo", "niva bupa", "care insurance")
_INVEST = ("sip", "mutual fund", "elss", "ppf")
_NPS = ("nps", "national pension")
_RENT = ("rent", "landlord", "house rent")


def _money(value: Any) -> Decimal:
    try:
        return abs(Decimal(str(value or 0).replace(",", "").replace("₹", "").strip()))
    except Exception:
        return Decimal("0")


def _rule(description: str) -> str | None:
    text = description.lower()
    if any(word in text for word in _HEALTH): return "80D_health"
    if any(word in text for word in _NPS): return "NPS_80CCD1B"
    if any(word in text for word in _INVEST): return "80C_investment"
    if any(word in text for word in _RENT): return "HRA_rent"
    return None


def _saving(salary: Mapping[str, Any], category: str, amount: Decimal) -> Decimal:
    if category == "HRA_rent" or simulate is None:
        return Decimal("0")
    changes = {"80d": amount} if category == "80D_health" else {"additional_nps": amount} if category == "NPS_80CCD1B" else {"additional_80c": amount}
    try:
        return max(Decimal("0"), Decimal(str(simulate(salary, regime="old", changes=changes)["tax_saving"])))
    except Exception:
        return Decimal("0")


def analyze_upi(csv_path: str | Path, salary: Mapping[str, Any], deductions: Mapping[str, Any] | None) -> dict[str, Any]:
    """Read a local CSV, never upload or log its transaction contents."""
    rows: list[dict[str, Any]] = []
    with Path(csv_path).open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for raw in reader:
            normalized = {str(k).strip().lower(): (v or "").strip() for k, v in raw.items() if k is not None}
            date = normalized.get("date", "")
            description = normalized.get("description") or normalized.get("narration") or normalized.get("merchant", "")
            debit_raw = normalized.get("debit")
            amount_raw = debit_raw if debit_raw not in (None, "") else normalized.get("amount", "")
            # Explicit credit columns and negative/credit amounts are not deductions.
            if normalized.get("credit") or str(normalized.get("type", "")).lower() == "credit" or (amount_raw and str(amount_raw).strip().startswith("-")):
                continue
            amount = _money(amount_raw)
            if amount <= 0:
                continue
            rows.append({"date": date, "description": description, "amount": format(amount, "f")})
    categories: list[str | None] = [_rule(row["description"]) for row in rows]
    unknown = [index for index, category in enumerate(categories) if category is None]
    fallback_used = False
    if unknown:
        prompt_rows = [{"index": i, "description": rows[i]["description"], "amount": rows[i]["amount"]} for i in unknown]
        try:
            classified = chat_json([{"role": "system", "content": "Categorize each transaction. Return JSON rows only. Allowed categories: 80D_health, 80C_investment, HRA_rent, NPS_80CCD1B, none."}, {"role": "user", "content": json.dumps(prompt_rows)}], CategorizedRows, temperature=0.0)
            if len(classified.rows) == len(unknown):
                for index, item in zip(unknown, classified.rows): categories[index] = item.category
        except OllamaError:
            fallback_used = True
            for index in unknown: categories[index] = "none"
    result_rows = []
    for row, category in zip(rows, categories):
        category = category or "none"
        saving = _saving(salary, category, Decimal(row["amount"])) if category != "none" else Decimal("0")
        result_rows.append({**row, "category": category, "est_saving": format(saving, "f"), "status": "needs_proof"})
    total = sum((Decimal(row["est_saving"]) for row in result_rows), Decimal("0"))
    notes = ["UPI entries alone do not prove eligibility; keep the relevant bills, certificates, or rent records."]
    if fallback_used:
        notes.append("I couldn't categorize some entries locally, so they were left as none.")
    return {"transactions": result_rows, "total_saving": format(total, "f"), "notes": notes}
