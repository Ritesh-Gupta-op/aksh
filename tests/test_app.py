import json
import threading
from http.client import HTTPConnection

import app


def test_analyze_payload_wires_parser_core_and_advisor(monkeypatch):
    monkeypatch.setattr(app, "parse_slip", lambda text: {"salary": {"gross_salary": "1500000", "basic": None, "hra": None, "da": None, "special_allowance": None, "bonus": None, "employee_pf": "0", "professional_tax": "0", "tds": "0"}, "components": [], "warnings": []})
    result = app.analyze_payload({"text": "salary slip"})
    assert result["salary"]["gross_salary"] == "1500000"
    assert result["comparison"]["old_regime"]["regime"] == "old"
    assert "tips" in result["action_plan"]


def test_profile_analysis_returns_engine_context():
    result = app.profile_analysis_payload({"profile": {"income_sources": {"other_salary": 1500000}}})
    assert result["context"]["meta"]["engine_version"] == "2.0.0"
    assert result["context"]["result"]["tax_old"] == 257400
    assert result["context"]["result"]["tax_new"] == 97500


def test_local_http_health_and_static_server():
    server = app.ThreadingHTTPServer(("127.0.0.1", 0), app.AkshHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        connection = HTTPConnection("127.0.0.1", server.server_port)
        connection.request("GET", "/api/health")
        response = connection.getresponse()
        assert response.status == 200
        assert json.loads(response.read())["ok"] is True
        connection.request("GET", "/")
        response = connection.getresponse()
        assert response.status == 200
        assert b"Tax feels lighter" in response.read()
        connection.close()
    finally:
        server.shutdown()
        server.server_close()
