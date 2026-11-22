import json
import logging

from app.core.logging import JsonFormatter, request_id_var


def test_json_logs_carry_request_id_and_exceptions():
    request_id_var.set("abc123")
    rec = logging.LogRecord("azeel.test", logging.ERROR, __file__, 1, "boom %s", ("now",), None)
    rec.request_id = request_id_var.get()
    try:
        raise ValueError("bad")
    except ValueError:
        import sys
        rec.exc_info = sys.exc_info()
    out = json.loads(JsonFormatter().format(rec))
    assert out["message"] == "boom now" and out["request_id"] == "abc123" and out["level"] == "ERROR"
    assert "ValueError: bad" in out["exception"]


def test_request_id_header_is_echoed_and_sanitised():
    from tests.conftest import new_client
    with new_client() as c:
        assert c.get("/api/health", headers={"X-Request-ID": "trace-42"}).headers["x-request-id"] == "trace-42"
        evil = c.get("/api/health", headers={"X-Request-ID": "x y;<script>"}).headers["x-request-id"]
        assert evil != "x y;<script>" and evil.isalnum()
