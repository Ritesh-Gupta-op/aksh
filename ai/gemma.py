"""Local Ollama adapter and deterministic salary-slip normalization."""
from __future__ import annotations

import json
import os
import re
from decimal import Decimal, InvalidOperation
from typing import Any, Literal, TypeVar

import requests
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from .prompts import EXTRACT_FEW_SHOT, EXTRACT_SYSTEM, GLOSSARY, CHAT_SYSTEM, ENGINE_SYSTEM

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e2b")
T = TypeVar("T", bound=BaseModel)
_MONEY = re.compile(r"^\d+(?:\.\d+)?$")

class OllamaError(RuntimeError):
    """A user-safe error from the local model service."""

class SlipFields(BaseModel):
    model_config = ConfigDict(extra="ignore")
    period: Literal["monthly", "annual"]
    gross_salary: str | None = None
    basic: str | None = None
    hra: str | None = None
    da: str | None = None
    special_allowance: str | None = None
    bonus: str | None = None
    employee_pf: str | None = None
    professional_tax: str | None = None
    tds: str | None = None

    @field_validator("gross_salary", "basic", "hra", "da", "special_allowance", "bonus", "employee_pf", "professional_tax", "tds", mode="before")
    @classmethod
    def clean_money(cls, value: Any) -> str | None:
        if value is None or value == "":
            return None
        raw = str(value).strip().replace(",", "")
        raw = re.sub(r"^(?:₹|Rs\.?|INR)\s*", "", raw, flags=re.I).strip()
        if not _MONEY.fullmatch(raw):
            raise ValueError("amount must be a non-negative number")
        try:
            amount = Decimal(raw)
        except InvalidOperation as exc:
            raise ValueError("amount must be a number") from exc
        if amount < 0 or not amount.is_finite():
            raise ValueError("amount must not be negative")
        return format(amount, "f")

class ChatReply(BaseModel):
    response: str


def _jsonable(value: Any) -> Any:
    if isinstance(value, Decimal):
        return format(value, "f")
    if hasattr(value, "to_dict"):
        return _jsonable(value.to_dict())
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


def _friendly_http_error(exc: Exception) -> OllamaError:
    if isinstance(exc, requests.exceptions.ConnectionError):
        return OllamaError("Ollama isn't running yet. Please run `ollama serve` and try again.")
    if isinstance(exc, requests.exceptions.Timeout):
        return OllamaError("Ollama took too long to reply. Please try again.")
    return OllamaError(f"I couldn't reach Ollama: {exc}")


def _call(messages: list[dict[str, str]], schema: dict[str, Any] | None = None, temperature: float = 0.0) -> str:
    payload: dict[str, Any] = {"model": OLLAMA_MODEL, "messages": messages, "stream": False, "options": {"temperature": temperature}, "think": False}
    if schema is not None:
        payload["format"] = schema
    try:
        response = requests.post(f"{OLLAMA_URL.rstrip('/')}/api/chat", json=payload, timeout=120)
        if response.status_code == 404:
            raise OllamaError("That Ollama model was not found. Please check `ollama list`.")
        response.raise_for_status()
        body = response.json()
        content = body.get("message", {}).get("content")
        if not isinstance(content, str):
            raise OllamaError("Ollama returned an empty reply. Please try again.")
        return content
    except OllamaError:
        raise
    except requests.RequestException as exc:
        raise _friendly_http_error(exc) from exc
    except (ValueError, TypeError) as exc:
        raise OllamaError("Ollama returned an unreadable reply. Please try again.") from exc


def chat_json(messages: list[dict[str, str]], model_cls: type[T], retries: int = 1, temperature: float = 0.0) -> T:
    """Ask Ollama for schema-constrained JSON, retrying validation once."""
    conversation = [dict(message) for message in messages]
    for attempt in range(retries + 1):
        raw = _call(conversation, model_cls.model_json_schema(), temperature)
        try:
            parsed = json.loads(raw)
            return model_cls.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as exc:
            if attempt >= retries:
                raise OllamaError("I couldn't read the model's answer as valid JSON after one retry.") from exc
            conversation.append({"role": "assistant", "content": raw})
            conversation.append({"role": "user", "content": f"Please return valid JSON matching the schema. Validation error: {exc}"})
    raise AssertionError("unreachable")


def _annual(value: str | None, period: str) -> str | None:
    if value is None:
        return None
    amount = Decimal(value) * (12 if period == "monthly" else 1)
    return format(amount, "f")


def parse_slip(text: str) -> dict[str, Any]:
    """Extract and annualize a slip; all arithmetic is local Decimal arithmetic."""
    fields = chat_json([{"role": "system", "content": EXTRACT_SYSTEM + "\n\n" + EXTRACT_FEW_SHOT}, {"role": "user", "content": text}], SlipFields, temperature=0.0)
    keys = ("gross_salary", "basic", "hra", "da", "special_allowance", "bonus", "employee_pf", "professional_tax", "tds")
    salary = {key: _annual(getattr(fields, key), fields.period) for key in keys}
    warnings: list[str] = []
    if salary["gross_salary"] is None:
        earning_keys = ("basic", "hra", "da", "special_allowance", "bonus")
        total = sum((Decimal(salary[key] or "0") for key in earning_keys), Decimal("0"))
        salary["gross_salary"] = format(total, "f")
        warnings.append("I couldn't find gross earnings, so I added the earning lines shown on the slip.")
    components = [{"name": GLOSSARY[key][0], "amount": salary[key], "explanation": GLOSSARY[key][1]} for key in keys if key != "gross_salary" and salary[key] is not None]
    return {"salary": salary, "components": components, "warnings": warnings}


def _rupee_numbers(value: Any) -> set[str]:
    if isinstance(value, dict):
        result: set[str] = set()
        for item in value.values():
            result.update(_rupee_numbers(item))
        return result
    if isinstance(value, (list, tuple)):
        result: set[str] = set()
        for item in value:
            result.update(_rupee_numbers(item))
        return result
    if isinstance(value, (Decimal, int, float)):
        return {str(value).replace(",", "")}
    if isinstance(value, str):
        return {re.sub(r"^(?:₹|Rs\.?\s*)", "", token).replace(",", "") for token in re.findall(r"(?:₹|Rs\.?\s*)?\d[\d,]*(?:\.\d+)?", value)}
    return set()


def guard_reply(reply: str, context: Any) -> tuple[str, list[str]]:
    """Return the reply and any rupee figures not present in engine context."""
    allowed = _rupee_numbers(_jsonable(context))
    found = {re.sub(r"^(?:₹|Rs\.?\s*)", "", token).replace(",", "") for token in re.findall(r"(?:₹|Rs\.?\s*)[\d,]+(?:\.\d+)?", reply)}
    unexpected = sorted(found - allowed)
    if unexpected:
        return reply + "\n\nI have left that figure out because it was not in the verified engine result.", unexpected
    return reply, []


def engine_chat(message: str, history: list[dict[str, str]] | None, context: Any) -> tuple[str, list[str]]:
    """Explain a verified engine context and guard all rupee figures."""
    context_text = json.dumps(_jsonable(context), ensure_ascii=False, sort_keys=True)
    messages = [{"role": "system", "content": ENGINE_SYSTEM.format(context=context_text)}]
    messages.extend((history or [])[-6:])
    messages.append({"role": "user", "content": message})
    return guard_reply(_call(messages, temperature=0.4), context)


def chat(message: str, history: list[dict[str, str]] | None = None, context: Any = None) -> str:
    """Have a short friendly conversation without allowing local arithmetic."""
    context_text = "(empty)" if not context else json.dumps(_jsonable(context), ensure_ascii=False, sort_keys=True)
    messages = [{"role": "system", "content": CHAT_SYSTEM.format(context=context_text)}]
    messages.extend((history or [])[-6:])
    messages.append({"role": "user", "content": message})
    return _call(messages, temperature=0.4)


if __name__ == "__main__":
    print(json.dumps(parse_slip("Monthly salary slip\nBasic ₹50,000\nHRA ₹25,000\nSpecial Allowance ₹20,000\nGross Earnings ₹95,000\nEmployee PF ₹6,000\nProf Tax ₹200\nTDS ₹4,500"), indent=2))
