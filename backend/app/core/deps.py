from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyCookie
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token, fingerprint
from app.models.models import User

cookie_scheme = APIKeyCookie(name=settings.COOKIE_NAME, auto_error=False)


def get_current_user(
    request: Request,
    _cookie: str | None = Depends(cookie_scheme),
    db: Session = Depends(get_db),
) -> User:
    unauthenticated = HTTPException(status_code=401, detail="You need to log in to continue.")
    token = request.cookies.get(settings.COOKIE_NAME)
    if not token:
        raise unauthenticated
    payload = decode_token(token, "access")
    if not payload:
        raise unauthenticated
    user = db.get(User, payload.get("sub"))
    # The fingerprint ties a session to the current password: changing it signs out every device.
    if not user or payload.get("fp") != fingerprint(user.hashed_password):
        raise unauthenticated
    request.state.session_remember = bool(payload.get("rem"))
    return user
