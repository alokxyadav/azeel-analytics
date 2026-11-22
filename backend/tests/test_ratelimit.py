import fakeredis

from app.core.rate_limit import MemoryBackend, RedisBackend


def test_memory_backend_limits_and_reports_retry():
    b = MemoryBackend()
    assert [b.hit("k", 3, 60) for _ in range(3)] == [0, 0, 0]
    retry = b.hit("k", 3, 60)
    assert 1 <= retry <= 61
    assert b.hit("other", 3, 60) == 0  # keys are independent


def test_redis_backend_is_shared_between_workers():
    server = fakeredis.FakeServer()
    worker_a = RedisBackend(fakeredis.FakeRedis(server=server))
    worker_b = RedisBackend(fakeredis.FakeRedis(server=server))
    assert [worker_a.hit("login:1.2.3.4", 2, 60), worker_b.hit("login:1.2.3.4", 2, 60)] == [0, 0]
    assert worker_a.hit("login:1.2.3.4", 2, 60) > 0   # the count is global, not per worker
    assert worker_b.hit("login:1.2.3.4", 2, 60) > 0


def test_redis_backend_fails_open_when_redis_is_down():
    class Broken:
        def pipeline(self):
            raise ConnectionError("down")
    assert RedisBackend(Broken()).hit("k", 1, 60) == 0
