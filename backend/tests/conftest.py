import os
import tempfile
import uuid

_tmp = tempfile.mkdtemp()
os.environ.update({
    "ENV": "test",
    "DATABASE_URL": f"sqlite:///{_tmp}/test.db",
    "UPLOAD_DIR": f"{_tmp}/uploads",
    "SECRET_KEY": "x" * 48,
    "CORS_ORIGINS": "http://localhost:3000",
    "FRONTEND_URL": "http://localhost:3000",
})

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.core.rate_limit import limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.services import data_service  # noqa: E402

PASSWORD = "correct-horse-9"


@pytest.fixture(autouse=True)
def _clean():
    limiter.reset()
    data_service.clear_cache()
    yield


def new_client() -> TestClient:
    return TestClient(app, base_url="http://testserver")


def signup(client: TestClient, email: str | None = None, password: str = PASSWORD):
    email = email or f"{uuid.uuid4().hex[:10]}@example.com"
    r = client.post("/api/auth/signup", json={"name": "Test User", "email": email, "password": password})
    assert r.status_code == 201, r.text
    return email


@pytest.fixture()
def client():
    with new_client() as c:
        signup(c)
        yield c


def upload(client, content: bytes, name="data.csv"):
    return client.post("/api/files/upload", files={"file": (name, content, "application/octet-stream")})


CSV = b"id,region,sales\n1,north,10\n2,south,20\n3,north,30\n4,south,40\n5,east,50\n6,east,60\n"
