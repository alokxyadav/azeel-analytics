import logging
import os
import shutil

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import client_ip, limiter, rate_limit, too_many
from app.core.security import (
    create_reset_token,
    create_session_token,
    create_verify_token,
    decode_token,
    fingerprint,
    hash_password,
    verify_password,
)
from app.models.models import User, now_utc
from app.schemas.schemas import (
    DeleteAccount,
    ForgotPassword,
    PasswordChange,
    ProfileUpdate,
    ResetPassword,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyEmail,
)
from app.services import data_service, email_service

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
log = logging.getLogger("azeel.auth")

_AVATAR_PREFIXES = ("data:image/png;base64,", "data:image/jpeg;base64,", "data:image/webp;base64,")


def _set_session(response: Response, user: User, remember: bool) -> None:
    token, max_age = create_session_token(user.id, fingerprint(user.hashed_password), remember)
    response.set_cookie(
        settings.COOKIE_NAME, token, max_age=max_age, httponly=True, secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE, path="/", domain=settings.COOKIE_DOMAIN,
    )


def _clear_session(response: Response) -> None:
    response.delete_cookie(settings.COOKIE_NAME, path="/", domain=settings.COOKIE_DOMAIN,
                           secure=settings.COOKIE_SECURE, httponly=True, samesite=settings.COOKIE_SAMESITE)


def _queue_verification(background: BackgroundTasks, user: User) -> None:
    link = f"{settings.FRONTEND_URL}/verify-email?token={create_verify_token(user.id, user.email)}"
    background.add_task(email_service.send_verification_email, user.email, user.name, link)


@router.post("/signup", response_model=UserOut, status_code=201, dependencies=[Depends(rate_limit("signup", 10, 3600))])
def signup(payload: UserCreate, response: Response, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = payload.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user = User(name=payload.name, email=email, hashed_password=hash_password(payload.password),
                # When email cannot be sent, verification cannot be required, so such accounts start verified.
                email_verified_at=None if settings.verification_required else now_utc())
    db.add(user)
    db.commit()
    db.refresh(user)
    if settings.verification_required:
        _queue_verification(background, user)
    _set_session(response, user, remember=True)
    return user


@router.post("/login", response_model=UserOut, dependencies=[Depends(rate_limit("login", 10, 60))])
def login(payload: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    email = payload.email.lower()
    # Per-account limit as well, so spreading guesses across many IPs does not help an attacker.
    retry = limiter.check(f"login-email:{email}", 10, 900)
    if retry:
        raise too_many(retry)
    user = db.query(User).filter(User.email == email).first()
    if not verify_password(payload.password, user.hashed_password if user else None) or not user:
        log.info("Failed login for %s from %s", email, client_ip(request))
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    _set_session(response, user, remember=payload.remember)
    return user


@router.post("/logout", status_code=204)
def logout():
    response = Response(status_code=204)
    _clear_session(response)
    return response


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_profile(payload: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.name is not None:
        name = payload.name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=422, detail="Name must be at least 2 characters.")
        current_user.name = name
    if payload.theme is not None:
        if payload.theme not in ("light", "dark"):
            raise HTTPException(status_code=422, detail="Theme must be 'light' or 'dark'.")
        current_user.theme = payload.theme
    if payload.profile_picture is not None:
        pic = payload.profile_picture
        if pic and not pic.startswith(_AVATAR_PREFIXES):
            raise HTTPException(status_code=422, detail="Profile picture must be a PNG, JPEG or WebP image.")
        current_user.profile_picture = pic or None
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204, dependencies=[Depends(rate_limit("change-password", 10, 900))])
def change_password(payload: PasswordChange, request: Request, current_user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Your current password is incorrect.")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    # Every other device is signed out (the session fingerprint changed); keep this one signed in.
    response = Response(status_code=204)
    _set_session(response, current_user, remember=getattr(request.state, "session_remember", True))
    return response


@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot", 5, 900))])
def forgot_password(payload: ForgotPassword, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        token = create_reset_token(user.id, fingerprint(user.hashed_password))
        link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        background.add_task(email_service.send_password_reset, user.email, user.name, link)
    # Identical response whether or not the account exists.
    return {"message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password", status_code=204, dependencies=[Depends(rate_limit("reset", 10, 900))])
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)):
    data = decode_token(payload.token, "reset")
    user = db.get(User, data["sub"]) if data else None
    if not user or data.get("fp") != fingerprint(user.hashed_password):
        raise HTTPException(status_code=400, detail="This reset link is invalid, expired or already used.")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return Response(status_code=204)


@router.post("/delete-account", status_code=204, dependencies=[Depends(rate_limit("delete-account", 5, 900))])
def delete_account(payload: DeleteAccount, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Your password is incorrect.")
    user_dir = os.path.join(settings.UPLOAD_DIR, current_user.id)
    for f in current_user.files:
        data_service.evict(os.path.join(user_dir, f.stored_filename))
    db.delete(current_user)
    db.commit()
    shutil.rmtree(user_dir, ignore_errors=True)
    response = Response(status_code=204)
    _clear_session(response)
    return response


@router.post("/verify-email", status_code=204, dependencies=[Depends(rate_limit("verify", 20, 900))])
def verify_email(payload: VerifyEmail, db: Session = Depends(get_db)):
    data = decode_token(payload.token, "verify")
    user = db.get(User, data["sub"]) if data else None
    if not user or user.email != data.get("email"):
        raise HTTPException(status_code=400, detail="This verification link is invalid or has expired.")
    if not user.email_verified_at:
        user.email_verified_at = now_utc()
        db.commit()
    return Response(status_code=204)


@router.post("/resend-verification", status_code=204, dependencies=[Depends(rate_limit("resend", 5, 3600))])
def resend_verification(background: BackgroundTasks, current_user: User = Depends(get_current_user)):
    if not current_user.email_verified:
        _queue_verification(background, current_user)
    return Response(status_code=204)
