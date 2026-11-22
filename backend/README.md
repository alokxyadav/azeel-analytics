# Azeel Analytics AI: backend

FastAPI service. See the repository README for setup, deployment and the security model.

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
pytest -q --cov=app                # 46 tests, 91% coverage
ruff check .
alembic revision --autogenerate -m "change"   # after editing models
uvicorn app.main:app --reload      # http://localhost:8000/docs (development only)
```

## API

All routes except those marked public need the session cookie set by signup/login.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup`, `/login`, `/logout` | Create account / sign in (`remember`) / sign out |
| GET, PUT | `/api/auth/me` | Profile (name, theme, picture) |
| POST | `/api/auth/change-password` | Change password (signs out other devices) |
| POST | `/api/auth/forgot-password`, `/reset-password` | Emailed single-use 30-minute link |
| POST | `/api/auth/delete-account` | Delete account and files (needs password) |
| POST | `/api/files/upload` | Upload `.csv` / `.xlsx` (multipart field `file`) |
| GET, DELETE | `/api/files`, `/api/files/{id}` | List / delete files |
| GET | `/api/analytics/{id}/preview` | Page of rows; `search`, `sort_by`, `sort_dir`, `page`, `page_size` |
| GET | `/api/analytics/{id}/summary`, `/charts` | Statistics / chart datasets |
| GET | `/api/reports/{id}/csv`, `/excel`, `/pdf` | Downloads |
| POST | `/api/public/contact`, `/subscribe` | Public forms (public, rate limited) |
| GET | `/api/health`, `/api/ready` | Liveness / readiness (public) |

Contact messages and subscribers are stored in the `contact_messages` and `subscribers` tables.

## Configuration

Environment variables are documented in `../.env.example`; limits (`MAX_UPLOAD_SIZE_MB`, `MAX_ROWS`,
`MAX_FILES_PER_USER`, `MAX_STORAGE_PER_USER_MB`, `DF_CACHE_MB`, ...) are in `app/core/config.py`.
