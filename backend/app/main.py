import logging
import re
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.logging import request_id_var, setup_logging
from app.core.migrate import run_migrations
from app.core.rate_limit import client_ip, limiter
from app.routers import analytics, auth, files, public, reports

setup_logging()
log = logging.getLogger("azeel")

run_migrations()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.1.0",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.ENABLE_DOCS else None,
)

UNSAFE = {"POST", "PUT", "PATCH", "DELETE"}
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
MAX_REQUEST_BYTES = (settings.MAX_UPLOAD_SIZE_MB + 2) * 1024 * 1024


def _json(status: int, detail: str, headers: dict | None = None) -> JSONResponse:
    return JSONResponse({"detail": detail}, status_code=status, headers=headers)


@app.middleware("http")
async def guard(request: Request, call_next):
    started = time.perf_counter()
    supplied = request.headers.get("x-request-id", "")
    request_id = supplied if _SAFE_REQUEST_ID.match(supplied) else uuid.uuid4().hex[:12]
    request_id_var.set(request_id)
    path = request.url.path
    response = None

    if path.startswith("/api"):
        length = request.headers.get("content-length", "")
        if length.isdigit() and int(length) > MAX_REQUEST_BYTES:
            response = _json(413, "That request is too large.")
        elif request.method in UNSAFE and settings.COOKIE_NAME in request.cookies:
            # CSRF defence in depth (on top of SameSite cookies): browsers always send Origin on
            # cross-site writes, so a foreign origin here is rejected.
            origin = request.headers.get("origin")
            if origin and origin.rstrip("/") not in settings.CORS_ORIGINS:
                response = _json(403, "Cross-origin request blocked.")
        if response is None and path not in ("/api/health", "/api/ready"):
            retry = limiter.check(f"global:{client_ip(request)}", settings.GLOBAL_RATE_PER_MINUTE, 60)
            if retry:
                response = _json(429, f"Too many requests. Try again in {retry} seconds.", {"Retry-After": str(retry)})

    if response is None:
        response = await call_next(request)

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if path.startswith("/api"):
        response.headers.setdefault("Cache-Control", "no-store")
        if not settings.ENABLE_DOCS:
            response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if settings.IS_PROD:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    log.info("%s %s %s %.0fms rid=%s", request.method, path, response.status_code, (time.perf_counter() - started) * 1000, request_id)
    return response


# Added after the middleware above so CORS is outermost and also decorates its error responses.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
    max_age=600,
)


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exc: RequestValidationError):
    err = exc.errors()[0]
    field = str(err["loc"][-1]).replace("_", " ").capitalize() if err["loc"] else "Input"
    msg = str(err["msg"]).removeprefix("Value error, ")
    return _json(422, f"{field}: {msg}")


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return _json(500, "Something went wrong on our side. Please try again.")


for r in (auth.router, files.router, analytics.router, reports.router, public.router):
    app.include_router(r)


@app.get("/api/health", tags=["Health"])
def health():
    return {"status": "ok"}


@app.get("/api/ready", tags=["Health"])
def ready():
    with SessionLocal() as db:
        db.execute(text("SELECT 1"))
    return {"status": "ready"}
