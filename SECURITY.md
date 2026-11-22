# Security policy

## Reporting a vulnerability

Please email **security@your-domain.example** (replace with your address) with details and steps to
reproduce. Do not open a public issue. We aim to acknowledge reports within 2 business days.

## Operating the deployment safely

- Keep `SECRET_KEY` private and unique per environment. Rotating it signs every user out.
- Serve only over HTTPS (`docker-compose.prod.yml` does this through Caddy).
- Do not publish the backend port in production; only the proxy should reach it.
- Rebuild regularly to pick up base-image and dependency updates (Dependabot opens the PRs).
- Take and **test restoring** backups: `docker compose exec backend python -m app.scripts.backup`.
- Rate limiting trusts `X-Forwarded-For` only because the backend is reachable solely through the proxy.
