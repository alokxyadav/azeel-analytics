import hashlib
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt

from app.core.config import settings

# Verified against when an email is unknown, so login timing does not reveal which accounts exist.
_DUMMY_HASH = bcrypt.hashpw(b"timing-equaliser", bcrypt.gensalt(rounds=12)).decode()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), (hashed or _DUMMY_HASH).encode()) and hashed is not None
    except ValueError:
        return False


def fingerprint(hashed_password: str) -> str:
    """Changes whenever the password changes, so old sessions and reset links stop working."""
    return hashlib.sha256(hashed_password.encode()).hexdigest()[:16]


def _encode(payload: dict, minutes: int) -> str:
    now = datetime.now(UTC)
    payload = {**payload, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_session_token(user_id: str, fp: str, remember: bool) -> tuple[str, int | None]:
    minutes = settings.REMEMBER_MINUTES if remember else settings.SESSION_MINUTES
    token = _encode({"sub": user_id, "fp": fp, "typ": "access", "rem": remember}, minutes)
    return token, (minutes * 60 if remember else None)


def create_reset_token(user_id: str, fp: str) -> str:
    return _encode({"sub": user_id, "fp": fp, "typ": "reset"}, 30)


def create_verify_token(user_id: str, email: str) -> str:
    return _encode({"sub": user_id, "email": email, "typ": "verify"}, 60 * 48)


def decode_token(token: str, expected_type: str) -> dict | None:
    try:
        data = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return data if data.get("typ") == expected_type else None
