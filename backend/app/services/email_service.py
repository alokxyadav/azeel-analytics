import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("azeel.email")


def send_email(to: str, subject: str, body: str, reply_to: str | None = None) -> bool:
    """Send a plain-text email. Returns False (and logs) if SMTP is not configured or fails."""
    if not settings.SMTP_HOST:
        log.warning("SMTP_HOST is not configured; email '%s' to %s was not sent.", subject, to)
        return False
    try:
        msg = EmailMessage()  # rejects header values containing line breaks (header injection)
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content(body)
        ctx = ssl.create_default_context()
        if settings.SMTP_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15, context=ctx)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.starttls(context=ctx)
        with server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception:
        log.exception("Failed to send email '%s'", subject)
        return False


def send_password_reset(to: str, name: str, link: str) -> None:
    sent = send_email(
        to,
        "Reset your Azeel Analytics password",
        f"Hi {name},\n\nUse this link to choose a new password. It works once and expires in 30 minutes:\n\n{link}\n\n"
        "If you did not ask for this, you can ignore this email; your password has not changed.\n\nAzeel Analytics",
    )
    if not sent and not settings.IS_PROD:
        log.warning("DEV ONLY - password reset link for %s: %s", to, link)


def send_verification_email(to: str, name: str, link: str) -> None:
    sent = send_email(
        to,
        "Confirm your email for Azeel Analytics",
        f"Hi {name},\n\nConfirm your email address to start uploading files. The link is valid for 48 hours:\n\n{link}\n\n"
        "If you did not create an account, you can ignore this email.\n\nAzeel Analytics",
    )
    if not sent and not settings.IS_PROD:
        log.warning("DEV ONLY - email verification link for %s: %s", to, link)
