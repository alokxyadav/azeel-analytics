from app.core.database import SessionLocal
from app.models.models import ContactMessage, Subscriber
from tests.conftest import new_client


def test_contact_stores_message_and_honeypot_is_silent():
    with new_client() as c:
        ok = c.post("/api/public/contact", json={"name": "Jo Bloggs", "email": "jo@example.com", "message": "Hello there, a question."})
        assert ok.status_code == 201
        bot = c.post("/api/public/contact", json={"name": "Bot Bot", "email": "bot@example.com", "message": "buy cheap pills now", "website": "http://spam"})
        assert bot.status_code == 201
        with SessionLocal() as db:
            emails = [m.email for m in db.query(ContactMessage).all()]
        assert "jo@example.com" in emails and "bot@example.com" not in emails


def test_subscribe_is_idempotent_and_validates():
    with new_client() as c:
        assert c.post("/api/public/subscribe", json={"email": "s@example.com"}).status_code == 201
        assert c.post("/api/public/subscribe", json={"email": "s@example.com"}).status_code == 201
        assert c.post("/api/public/subscribe", json={"email": "not-an-email"}).status_code == 422
        with SessionLocal() as db:
            assert db.query(Subscriber).filter(Subscriber.email == "s@example.com").count() == 1


def test_public_forms_are_rate_limited():
    with new_client() as c:
        codes = [c.post("/api/public/contact", json={"name": "Jo Bloggs", "email": "jo@example.com", "message": "Hello there, a question."}).status_code for _ in range(7)]
        assert codes.count(429) >= 1


def test_health_and_ready():
    with new_client() as c:
        assert c.get("/api/health").json() == {"status": "ok"}
        assert c.get("/api/ready").json() == {"status": "ready"}
