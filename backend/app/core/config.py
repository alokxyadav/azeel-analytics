import logging
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
_log = logging.getLogger("azeel.config")


def _bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    return default if raw is None else raw.strip().lower() in ("1", "true", "yes", "on")


def _int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    return default if not raw else int(raw)


class Settings:
    def __init__(self) -> None:
        self.APP_NAME = "Azeel Analytics AI"
        self.ENV = os.environ.get("ENV", "development").lower()
        self.IS_PROD = self.ENV == "production"

        secret = os.environ.get("SECRET_KEY", "")
        if self.IS_PROD and (len(secret) < 32 or secret.lower().startswith("change-this")):
            raise RuntimeError(
                "SECRET_KEY must be a random string of at least 32 characters when ENV=production. "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
            )
        if not secret:
            _log.warning("SECRET_KEY is not set; using an insecure development key.")
        self.SECRET_KEY = secret or "dev-only-insecure-secret-key-do-not-use-in-production"
        self.JWT_ALGORITHM = "HS256"

        # Sessions
        self.COOKIE_NAME = "azeel_session"
        self.COOKIE_SECURE = _bool("COOKIE_SECURE", self.IS_PROD)
        self.COOKIE_SAMESITE = os.environ.get("COOKIE_SAMESITE", "lax").lower()
        self.COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN") or None
        self.SESSION_MINUTES = _int("SESSION_MINUTES", 60 * 12)
        self.REMEMBER_MINUTES = _int("REMEMBER_MINUTES", 60 * 24 * 30)

        # Storage
        self.DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{BASE_DIR}/azeel.db")
        self.UPLOAD_DIR = os.environ.get("UPLOAD_DIR", str(BASE_DIR / "uploads"))
        self.MAX_UPLOAD_SIZE_MB = _int("MAX_UPLOAD_SIZE_MB", 100)
        self.MAX_ROWS = _int("MAX_ROWS", 2_000_000)
        self.MAX_COLUMNS = _int("MAX_COLUMNS", 500)
        self.MAX_FILES_PER_USER = _int("MAX_FILES_PER_USER", 50)
        self.MAX_STORAGE_PER_USER_MB = _int("MAX_STORAGE_PER_USER_MB", 1000)
        self.MAX_UNZIPPED_MB = _int("MAX_UNZIPPED_MB", 600)
        self.ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
        self.DF_CACHE_ITEMS = _int("DF_CACHE_ITEMS", 4)
        self.DF_CACHE_MB = _int("DF_CACHE_MB", 512)

        # Web
        self.FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        origins = os.environ.get("CORS_ORIGINS", self.FRONTEND_URL)
        self.CORS_ORIGINS = [o.strip().rstrip("/") for o in origins.split(",") if o.strip()]
        self.ENABLE_DOCS = _bool("ENABLE_DOCS", not self.IS_PROD)
        self.LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
        self.RATE_LIMIT_ENABLED = _bool("RATE_LIMIT_ENABLED", True)
        self.REDIS_URL = os.environ.get("REDIS_URL", "")
        self.LOG_FORMAT = os.environ.get("LOG_FORMAT", "json" if self.IS_PROD else "text").lower()
        self.GLOBAL_RATE_PER_MINUTE = _int("GLOBAL_RATE_PER_MINUTE", 300)

        # Email (optional). Without SMTP_HOST no email is sent.
        self.SMTP_HOST = os.environ.get("SMTP_HOST", "")
        self.SMTP_PORT = _int("SMTP_PORT", 587)
        self.SMTP_USER = os.environ.get("SMTP_USER", "")
        self.SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
        self.SMTP_SSL = _bool("SMTP_SSL", False)  # True = implicit TLS (port 465)
        self.MAIL_FROM = os.environ.get("MAIL_FROM", "Azeel Analytics <no-reply@localhost>")
        self.CONTACT_RECIPIENT = os.environ.get("CONTACT_RECIPIENT", "")
        # "auto": verification is enforced only when email can actually be sent (SMTP_HOST set).
        self.REQUIRE_EMAIL_VERIFICATION = os.environ.get("REQUIRE_EMAIL_VERIFICATION", "auto").lower()

    @property
    def verification_required(self) -> bool:
        mode = self.REQUIRE_EMAIL_VERIFICATION
        return mode in ("1", "true", "yes", "on") or (mode == "auto" and bool(self.SMTP_HOST))

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
