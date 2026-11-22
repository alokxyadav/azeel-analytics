import logging
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app.core.config import settings

log = logging.getLogger("azeel.ratelimit")


class MemoryBackend:
    """Sliding window held in process memory. Correct for a single process."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._last_prune = time.monotonic()

    def hit(self, key: str, limit: int, window: int) -> int:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > window:
                hits.popleft()
            if len(hits) >= limit:
                return int(window - (now - hits[0])) + 1
            hits.append(now)
            if now - self._last_prune > 300:
                self._last_prune = now
                for k in [k for k, v in self._hits.items() if not v or now - v[-1] > 3600]:
                    del self._hits[k]
        return 0

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class RedisBackend:
    """Fixed-window counters in Redis, shared by every worker and replica.

    If Redis is unreachable the limiter fails open (and logs) rather than taking the site down.
    """

    def __init__(self, client) -> None:
        self.client = client

    def hit(self, key: str, limit: int, window: int) -> int:
        bucket = int(time.time() // window)
        redis_key = f"azeel:rl:{key}:{bucket}"
        try:
            pipe = self.client.pipeline()
            pipe.incr(redis_key)
            pipe.expire(redis_key, window + 1)
            count, _ = pipe.execute()
        except Exception:
            log.exception("Redis rate limiter unavailable; allowing the request")
            return 0
        if count > limit:
            return window - int(time.time() % window) + 1
        return 0

    def reset(self) -> None:
        for k in self.client.scan_iter("azeel:rl:*"):
            self.client.delete(k)


def _make_backend():
    if settings.REDIS_URL:
        import redis

        client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=1, socket_connect_timeout=1)
        log.info("Rate limiting is shared through Redis.")
        return RedisBackend(client)
    return MemoryBackend()


class RateLimiter:
    def __init__(self) -> None:
        self.backend = _make_backend()

    def check(self, key: str, limit: int, window: int) -> int:
        """Record a hit. Returns 0 if allowed, otherwise seconds until the caller may retry."""
        if not settings.RATE_LIMIT_ENABLED:
            return 0
        return self.backend.hit(key, limit, window)

    def reset(self) -> None:
        self.backend.reset()


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def too_many(retry: int) -> HTTPException:
    return HTTPException(status_code=429, detail=f"Too many attempts. Try again in {retry} seconds.",
                         headers={"Retry-After": str(retry)})


def rate_limit(name: str, limit: int, window: int):
    """Dependency: limit `limit` requests per `window` seconds per client IP."""

    def dependency(request: Request) -> None:
        retry = limiter.check(f"{name}:{client_ip(request)}", limit, window)
        if retry:
            raise too_many(retry)

    return dependency
