.PHONY: test lint backend-test frontend-test up prod backup

test: backend-test frontend-test

backend-test:
	cd backend && pytest -q --cov=app --cov-fail-under=85

frontend-test:
	cd frontend && npm run typecheck && npm run lint && npm test

lint:
	cd backend && ruff check .

up:        ## local stack over HTTP
	docker compose up --build

prod:      ## public stack with HTTPS
	docker compose -f docker-compose.prod.yml up -d --build

backup:    ## consistent snapshot of database + uploads into the data volume
	docker compose exec backend python -m app.scripts.backup
