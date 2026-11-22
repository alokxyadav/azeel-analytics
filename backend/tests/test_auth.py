import re

from app.services import email_service
from tests.conftest import PASSWORD, new_client, signup


def test_signup_sets_httponly_cookie_and_never_returns_token():
    with new_client() as c:
        r = c.post("/api/auth/signup", json={"name": "Ann Lee", "email": "a1@example.com", "password": PASSWORD})
        assert r.status_code == 201
        assert "access_token" not in r.text and "hashed_password" not in r.text
        cookie = r.headers["set-cookie"].lower()
        assert "httponly" in cookie and "samesite=lax" in cookie
        assert c.get("/api/auth/me").json()["email"] == "a1@example.com"


def test_created_at_is_marked_utc():
    with new_client() as c:
        signup(c)
        assert c.get("/api/auth/me").json()["created_at"].endswith(("Z", "+00:00"))


def test_unauthenticated_is_rejected():
    with new_client() as c:
        assert c.get("/api/auth/me").status_code == 401
        assert c.get("/api/files").status_code == 401


def test_duplicate_email_and_weak_passwords():
    with new_client() as c:
        email = signup(c)
        dup = c.post("/api/auth/signup", json={"name": "Ann Lee", "email": email.upper(), "password": PASSWORD})
        assert dup.status_code == 400
        for bad in ("short", "password123", " " * 10, "x" * 80):
            r = c.post("/api/auth/signup", json={"name": "Ann Lee", "email": "n@example.com", "password": bad})
            assert r.status_code == 422, bad
            assert isinstance(r.json()["detail"], str)


def test_login_logout_and_generic_error():
    with new_client() as c:
        email = signup(c)
        c.post("/api/auth/logout")
        assert c.get("/api/auth/me").status_code == 401
        wrong = c.post("/api/auth/login", json={"email": email, "password": "wrong-password"})
        ghost = c.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"})
        assert wrong.status_code == ghost.status_code == 401
        assert wrong.json() == ghost.json()
        ok = c.post("/api/auth/login", json={"email": email, "password": PASSWORD, "remember": False})
        assert ok.status_code == 200
        assert "max-age" not in ok.headers["set-cookie"].lower()  # session cookie when not remembered


def test_login_is_rate_limited():
    with new_client() as c:
        email = signup(c)
        codes = [c.post("/api/auth/login", json={"email": email, "password": "nope-nope-1"}).status_code for _ in range(12)]
        assert 429 in codes
        assert c.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 429


def test_change_password_signs_out_other_devices():
    a = new_client()
    email = signup(a)
    b = new_client()
    assert b.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
    r = a.post("/api/auth/change-password", json={"current_password": PASSWORD, "new_password": "brand-new-pass-7"})
    assert r.status_code == 204
    assert a.get("/api/auth/me").status_code == 200   # this device stays signed in
    assert b.get("/api/auth/me").status_code == 401   # the other is signed out


def test_password_reset_is_single_use(monkeypatch):
    sent = []
    monkeypatch.setattr(email_service, "send_email", lambda to, subject, body, reply_to=None: sent.append(body) or True)
    with new_client() as c:
        email = signup(c)
        c.post("/api/auth/logout")
        assert c.post("/api/auth/forgot-password", json={"email": email}).status_code == 200
        assert c.post("/api/auth/forgot-password", json={"email": "ghost@example.com"}).status_code == 200
        assert len(sent) == 1  # nothing is sent for unknown accounts
        token = re.search(r"token=([\w.\-]+)", sent[0]).group(1)
        assert c.post("/api/auth/reset-password", json={"token": token, "new_password": "reset-pass-123x"}).status_code == 204
        assert c.post("/api/auth/reset-password", json={"token": token, "new_password": "another-pass-9z"}).status_code == 400
        assert c.post("/api/auth/login", json={"email": email, "password": "reset-pass-123x"}).status_code == 200


def test_reset_token_cannot_be_used_as_session(monkeypatch):
    from app.core.database import SessionLocal
    from app.core.security import create_reset_token, fingerprint
    from app.models.models import User
    with new_client() as c:
        email = signup(c)
        with SessionLocal() as db:
            u = db.query(User).filter(User.email == email).one()
            token = create_reset_token(u.id, fingerprint(u.hashed_password))
        other = new_client()
        other.cookies.set("azeel_session", token)
        assert other.get("/api/auth/me").status_code == 401


def test_cross_origin_write_is_blocked():
    with new_client() as c:
        signup(c)
        r = c.put("/api/auth/me", json={"theme": "dark"}, headers={"Origin": "https://evil.example"})
        assert r.status_code == 403
        ok = c.put("/api/auth/me", json={"theme": "dark"}, headers={"Origin": "http://localhost:3000"})
        assert ok.status_code == 200


def test_profile_picture_validation():
    with new_client() as c:
        signup(c)
        assert c.put("/api/auth/me", json={"profile_picture": "data:text/html;base64,AAAA"}).status_code == 422
        assert c.put("/api/auth/me", json={"profile_picture": "data:image/jpeg;base64,AAAA"}).status_code == 200


def test_delete_account_removes_data():
    with new_client() as c:
        email = signup(c)
        assert c.post("/api/auth/delete-account", json={"password": "wrong"}).status_code == 400
        assert c.post("/api/auth/delete-account", json={"password": PASSWORD}).status_code == 204
        assert c.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 401


def test_security_headers():
    with new_client() as c:
        r = c.get("/api/health")
        assert r.headers["x-content-type-options"] == "nosniff"
        assert r.headers["x-frame-options"] == "DENY"
        assert "x-request-id" in r.headers
