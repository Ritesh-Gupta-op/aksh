"""Small local-only HTTP application for the Aksh tax coach."""
from __future__ import annotations

import json
import mimetypes
import os
import tempfile
from decimal import Decimal
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from ai.advisor import get_action_plan
from ai.gemma import OllamaError, chat, engine_chat, parse_slip
from ai.upi_analyzer import analyze_upi
from core.simulator import simulate
from core.tax_engine import compare_regimes
from tax_engine import TaxEngine, UserProfile, build_engine_context

ROOT = Path(__file__).parent
WEB_ROOT = ROOT / "web"
HOST = os.getenv("AKSH_HOST", "127.0.0.1")
PORT = int(os.getenv("AKSH_PORT", "8000"))


def json_safe(value: Any) -> Any:
    if hasattr(value, "to_dict"):
        return json_safe(value.to_dict())
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [json_safe(item) for item in value]
    if hasattr(value, "as_tuple"):
        return format(value, "f")
    return value


def salary_with_deductions(salary: dict[str, Any], deductions: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(salary)
    for key in ("80c", "80d", "nps"):
        if deductions and deductions.get(key) not in (None, ""):
            merged[key] = deductions[key]
    return merged


def profile_analysis_payload(payload: dict[str, Any]) -> dict[str, Any]:
    profile = UserProfile.model_validate(payload.get("profile", payload))
    comparison = TaxEngine(profile.financial_year).compare(profile)
    context = build_engine_context(profile, comparison)
    return {"comparison": comparison.model_dump(mode="json"), "context": context}


def _profile_from_parsed_salary(salary: dict[str, Any], deductions: dict[str, Any]) -> UserProfile:
    def amount(value: Any) -> Decimal:
        return Decimal(str(value or 0).replace(",", ""))
    income = {"basic": amount(salary.get("basic")), "da": amount(salary.get("da")), "hra_received": amount(salary.get("hra")), "special_allowance": amount(salary.get("special_allowance")), "bonus": amount(salary.get("bonus")), "other_salary": amount(salary.get("gross_salary")) if not any(salary.get(key) for key in ("basic", "da", "hra", "special_allowance", "bonus")) else Decimal("0")}
    old_deductions = {"80c": amount(salary.get("employee_pf")) + amount(deductions.get("80c")), "80d": amount(deductions.get("80d")), "nps": amount(deductions.get("nps")), "professional_tax": amount(salary.get("professional_tax"))}
    return UserProfile.model_validate({"financial_year": "FY 2025-26", "income_sources": income, "deductions": old_deductions, "tds": amount(salary.get("tds")), "rent_paid": amount(deductions.get("rent")), "city_type": deductions.get("city")})


def analyze_payload(payload: dict[str, Any]) -> dict[str, Any]:
    parsed = parse_slip(str(payload.get("text", "")).strip())
    salary = parsed["salary"]
    deductions = payload.get("deductions") or {}
    authoritative_salary = salary_with_deductions(salary, deductions)
    comparison = compare_regimes(authoritative_salary)
    plan = get_action_plan(comparison, authoritative_salary, deductions)
    profile = _profile_from_parsed_salary(salary, deductions)
    engine_comparison = TaxEngine(profile.financial_year).compare(profile)
    engine_context = build_engine_context(profile, engine_comparison)
    return {"salary": salary, "components": parsed["components"], "warnings": parsed["warnings"], "comparison": json_safe(comparison), "engine_comparison": engine_comparison.model_dump(mode="json"), "engine_context": engine_context, "action_plan": json_safe(plan)}


class AkshHandler(BaseHTTPRequestHandler):
    server_version = "AkshLocal/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        # Never log salary slips, chat messages, or transaction descriptions.
        return

    def _send_json(self, data: Any, status: int = HTTPStatus.OK) -> None:
        body = json.dumps(json_safe(data), ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message: str, status: int = HTTPStatus.BAD_REQUEST) -> None:
        self._send_json({"error": message}, status)

    def _read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2_000_000:
            raise ValueError("That request is too large for a local salary analysis.")
        raw = self.rfile.read(length)
        value = json.loads(raw.decode("utf-8"))
        if not isinstance(value, dict):
            raise ValueError("Please send a JSON object.")
        return value

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send_json({"ok": True, "service": "aksh", "model": os.getenv("OLLAMA_MODEL", "gemma4:e2b")})
            return
        relative = self.path.split("?", 1)[0].lstrip("/") or "index.html"
        requested = (WEB_ROOT / relative).resolve()
        if WEB_ROOT not in requested.parents and requested != WEB_ROOT:
            self._send_error("Not found.", HTTPStatus.NOT_FOUND)
            return
        if not requested.is_file():
            self._send_error("Not found.", HTTPStatus.NOT_FOUND)
            return
        content = requested.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mimetypes.guess_type(str(requested))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        try:
            payload = self._read_json()
            if self.path == "/api/analyze":
                self._send_json(analyze_payload(payload))
            elif self.path == "/api/profile-analysis":
                self._send_json(profile_analysis_payload(payload))
            elif self.path == "/api/chat":
                message = str(payload.get("message", "")).strip()
                if not message:
                    self._send_error("Tell Aksh what you would like help with.")
                    return
                context = payload.get("context")
                if isinstance(context, dict) and "meta" in context and "result" in context:
                    reply, flags = engine_chat(message, payload.get("history") or [], context)
                    self._send_json({"reply": reply, "guard_flags": flags})
                else:
                    self._send_json({"reply": chat(message, payload.get("history") or [], context)})
            elif self.path == "/api/simulate":
                salary = payload.get("salary")
                if not isinstance(salary, dict):
                    self._send_error("Salary data is required.")
                    return
                result = simulate(salary, str(payload.get("regime", "old")), payload.get("changes") or {})
                self._send_json(result)
            elif self.path == "/api/upi":
                csv_text = str(payload.get("csv", ""))
                if not csv_text.strip():
                    self._send_error("Choose a UPI CSV file first.")
                    return
                with tempfile.NamedTemporaryFile("w", suffix=".csv", encoding="utf-8", delete=True) as handle:
                    handle.write(csv_text)
                    handle.flush()
                    result = analyze_upi(handle.name, payload.get("salary") or {}, payload.get("deductions") or {})
                self._send_json(result)
            else:
                self._send_error("Not found.", HTTPStatus.NOT_FOUND)
        except OllamaError as exc:
            self._send_error(str(exc), HTTPStatus.SERVICE_UNAVAILABLE)
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
            self._send_error(str(exc) or "Please check the information and try again.")
        except Exception:
            self._send_error("Aksh hit a local error. Please try again.", HTTPStatus.INTERNAL_SERVER_ERROR)


def run() -> None:
    server = ThreadingHTTPServer((HOST, PORT), AkshHandler)
    print(f"Aksh is running at http://{HOST}:{PORT}")
    print("Local only: salary slips and chats stay in this machine.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAksh stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
