import logging

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limit import client_ip, rate_limit
from app.models.models import ContactMessage, Subscriber
from app.schemas.schemas import ContactIn, SubscribeIn
from app.services import email_service

router = APIRouter(prefix="/api/public", tags=["Public"])
log = logging.getLogger("azeel.public")


@router.post("/contact", status_code=201, dependencies=[Depends(rate_limit("contact", 5, 3600))])
def contact(payload: ContactIn, request: Request, background: BackgroundTasks, db: Session = Depends(get_db)):
    if payload.website:  # honeypot filled: pretend success, store nothing
        return {"message": "Thanks, we will be in touch."}
    db.add(ContactMessage(name=payload.name.strip(), email=payload.email.lower(), message=payload.message.strip(), ip=client_ip(request)))
    db.commit()
    if settings.CONTACT_RECIPIENT:
        background.add_task(
            email_service.send_email, settings.CONTACT_RECIPIENT, f"New contact message from {payload.name.strip()[:60]}",
            f"From: {payload.name} <{payload.email}>\n\n{payload.message}", payload.email,
        )
    return {"message": "Thanks, we will be in touch."}


@router.post("/subscribe", status_code=201, dependencies=[Depends(rate_limit("subscribe", 10, 3600))])
def subscribe(payload: SubscribeIn, db: Session = Depends(get_db)):
    if not payload.website:
        try:
            db.add(Subscriber(email=payload.email.lower()))
            db.commit()
        except IntegrityError:  # already subscribed: same response, so addresses cannot be probed
            db.rollback()
    return {"message": "You are subscribed."}
