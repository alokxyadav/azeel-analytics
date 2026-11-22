import re

import pytest

from app.core.config import settings
from app.services import email_service
from tests.conftest import CSV, PASSWORD, new_client, signup, upload


@pytest.fixture()
def verification_on(monkeypatch):
    monkeypatch.setattr(settings, "REQUIRE_EMAIL_VERIFICATION", "true")
    sent = []
    monkeypatch.setattr(email_service, "send_email", lambda to, subject, body, reply_to=None: sent.append((to, subject, body)) or True)
    return sent


def _token(sent):
    return re.search(r"token=([\w.\-]+)", sent[-1][2]).group(1)


def test_verification_is_off_by_default_without_email_configured():
    assert settings.REQUIRE_EMAIL_VERIFICATION == "auto" and not settings.SMTP_HOST
    with new_client() as c:
        signup(c)
        assert c.get("/api/auth/me").json()["email_verified"] is True
        assert upload(c, CSV).status_code == 201


def test_unverified_user_cannot_upload_until_the_emailed_link_is_used(verification_on):
    with new_client() as c:
        email = signup(c)
        assert verification_on[-1][0] == email and "Confirm your email" in verification_on[-1][1]
        assert c.get("/api/auth/me").json()["email_verified"] is False
        blocked = upload(c, CSV)
        assert blocked.status_code == 403 and "Verify your email" in blocked.json()["detail"]
        assert c.post("/api/auth/verify-email", json={"token": _token(verification_on)}).status_code == 204
        assert c.get("/api/auth/me").json()["email_verified"] is True
        assert upload(c, CSV).status_code == 201


def test_verification_link_is_idempotent_and_rejects_forgeries(verification_on):
    with new_client() as c:
        signup(c)
        token = _token(verification_on)
        assert c.post("/api/auth/verify-email", json={"token": token}).status_code == 204
        assert c.post("/api/auth/verify-email", json={"token": token}).status_code == 204
        assert c.post("/api/auth/verify-email", json={"token": "garbage"}).status_code == 400
        assert c.post("/api/auth/verify-email", json={"token": token[:-3] + "abc"}).status_code == 400


def test_other_token_types_cannot_verify_an_email(verification_on):
    from app.core.database import SessionLocal
    from app.core.security import create_reset_token, fingerprint
    from app.models.models import User
    with new_client() as c:
        email = signup(c)
        with SessionLocal() as db:
            u = db.query(User).filter(User.email == email).one()
            reset = create_reset_token(u.id, fingerprint(u.hashed_password))
        assert c.post("/api/auth/verify-email", json={"token": reset}).status_code == 400


def test_resend_sends_a_fresh_link_and_is_rate_limited(verification_on):
    with new_client() as c:
        signup(c)
        before = len(verification_on)
        assert c.post("/api/auth/resend-verification").status_code == 204
        assert len(verification_on) == before + 1
        codes = [c.post("/api/auth/resend-verification").status_code for _ in range(6)]
        assert 429 in codes


def test_resend_requires_login_and_is_a_noop_when_verified(verification_on):
    with new_client() as anon:
        assert anon.post("/api/auth/resend-verification").status_code == 401
    with new_client() as c:
        signup(c)
        c.post("/api/auth/verify-email", json={"token": _token(verification_on)})
        before = len(verification_on)
        assert c.post("/api/auth/resend-verification").status_code == 204
        assert len(verification_on) == before


def test_login_still_works_while_unverified(verification_on):
    with new_client() as c:
        email = signup(c)
        c.post("/api/auth/logout")
        assert c.post("/api/auth/login", json={"email": email, "password": PASSWORD}).status_code == 200
