import smtplib

import pandas as pd

from app.core.config import settings
from app.services import data_service as ds
from app.services import email_service


class FakeSMTP:
    instances: list = []

    def __init__(self, host, port, timeout=None, context=None):
        self.host, self.port, self.started_tls, self.logged_in, self.sent = host, port, False, None, None
        FakeSMTP.instances.append(self)

    def __enter__(self): return self
    def __exit__(self, *a): return False
    def starttls(self, context=None): self.started_tls = True
    def login(self, user, pw): self.logged_in = (user, pw)
    def send_message(self, msg): self.sent = msg


def test_email_uses_starttls_and_credentials(monkeypatch):
    FakeSMTP.instances.clear()
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    for k, v in {"SMTP_HOST": "smtp.example.com", "SMTP_USER": "u", "SMTP_PASSWORD": "p", "SMTP_SSL": False}.items():
        monkeypatch.setattr(settings, k, v)
    assert email_service.send_email("a@example.com", "Hi", "Body", reply_to="r@example.com") is True
    s = FakeSMTP.instances[0]
    assert s.started_tls and s.logged_in == ("u", "p")
    assert s.sent["To"] == "a@example.com" and s.sent["Reply-To"] == "r@example.com"


def test_email_failure_and_unconfigured_return_false(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    assert email_service.send_email("a@example.com", "Hi", "Body") is False
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")

    class Boom(FakeSMTP):
        def starttls(self, context=None): raise OSError("refused")
    monkeypatch.setattr(smtplib, "SMTP", Boom)
    assert email_service.send_email("a@example.com", "Hi", "Body") is False


def test_header_injection_in_email_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    assert email_service.send_email("a@example.com\r\nBcc: evil@example.com", "Hi", "Body") is False


def test_dataframe_cache_hits_and_evicts(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "DF_CACHE_ITEMS", 2)
    ds.clear_cache()
    paths = []
    for i in range(3):
        p = tmp_path / f"f{i}.csv"
        p.write_text("a,b\n1,2\n3,4\n")
        paths.append(str(p))
    first = ds.load_dataframe(paths[0], "csv")
    assert ds.load_dataframe(paths[0], "csv") is first          # served from cache
    ds.load_dataframe(paths[1], "csv"); ds.load_dataframe(paths[2], "csv")
    assert ds.load_dataframe(paths[0], "csv") is not first      # oldest entry was evicted
    ds.evict(paths[2])
    assert all(k[0] != paths[2] for k in ds._cache)


def test_cache_notices_changed_files(tmp_path):
    ds.clear_cache()
    p = tmp_path / "x.csv"
    p.write_text("a\n1\n")
    assert len(ds.load_dataframe(str(p), "csv")) == 1
    p.write_text("a\n1\n2\n3\n")
    assert len(ds.load_dataframe(str(p), "csv")) == 3


def test_mixed_type_column_sorts_without_error():
    df = pd.DataFrame({"m": [3, "a", 1, "b"]})
    assert len(ds.sort_dataframe(df, "m", True)) == 4
    assert len(ds.sort_dataframe(df, "m", False)) == 4
