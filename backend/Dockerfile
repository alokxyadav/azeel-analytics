FROM python:3.15-slim

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

# Run as an unprivileged user; /data holds the database and uploads (mount a volume there).
RUN useradd --system --uid 10001 --no-create-home azeel \
    && mkdir -p /data && chown azeel /data
USER azeel

ENV ENV=production UPLOAD_DIR=/data/uploads DATABASE_URL=sqlite:////data/azeel.db
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/ready')" || exit 1

# One worker by default. To use several (WEB_CONCURRENCY=2), set REDIS_URL so rate limits are shared;
# the database schema is migrated on startup under a lock, so concurrent workers are safe.
# FORWARDED_ALLOW_IPS lets uvicorn trust the proxy's X-Forwarded-For so rate limits see real client IPs.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--no-server-header"]
