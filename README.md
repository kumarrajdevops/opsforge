# OPSFORGE

Evidence-based interview-readiness platform for Senior DevOps / SRE engineers. Product scope: [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md). Decisions: [docs/ADR](docs/ADR/README.md).

**Status:** repository scaffold, design system, application shell and the Command Center UI. The Command Center renders labelled sample data because the readiness engine and API are not built yet; ForgeArchitect (Architecture Studio) is implemented on a React Flow canvas with deterministic checks across 12 dimensions, versioning and failure simulation; its AI review is an interface only, with no provider registered and no AI scoring. Studio scenarios are sample content and designs are saved in the browser until the API exists. ForgeOps (Incident Simulator) is an operations console with two scripted scenarios (a payment-API outage and a leaked cloud credential): evidence is revealed progressively by telemetry, terminal and remediation actions, and a deterministic evaluator scores investigation order, evidence, hypotheses, mitigation, RCA, prevention and communication. Metrics and command output are scripted fixtures, sessions are saved in the browser until the API exists, and its AI review is an interface only. Every other module page is a placeholder.

## Layout

```
apps/web         React + Vite client (shell, routing, API status)
apps/api         FastAPI modular monolith (health endpoints only)
packages/ui      @opsforge/ui     design system on MUI
packages/types   @opsforge/types  API contract types
packages/config  @opsforge/config shared TypeScript and ESLint config
infrastructure   Dockerfiles, PostgreSQL init scripts
docs             PRD, ADRs, architecture notes, spec and prototype
tests            cross-cutting tests (empty for now)
```

## Prerequisites

Node 22+, npm 10+, Python 3.12+, Docker with Compose.

## Setup

```bash
cp .env.example .env            # local-development defaults; never commit .env
npm install                     # installs all JS workspaces

cd apps/api
python -m venv .venv
.venv/Scripts/python -m pip install -e ".[dev]"   # Windows; use .venv/bin/python on macOS/Linux
```

## Run (local development)

```bash
docker compose up -d postgres redis                     # PostgreSQL (pgvector) and Redis
cd apps/api && .venv/Scripts/python -m uvicorn app.main:app --reload   # http://localhost:8000
npm run dev                                             # http://localhost:5173
```

The Vite dev server proxies `/api` to the API. The top bar shows the API state from `/api/health/ready`. In development the sidebar has a **Design System** page showing every component, with a light/dark toggle.

### Docker naming

Images and containers use the `opsforge-<service>` pattern: `opsforge-api`, `opsforge-web`, and later `opsforge-celery` (worker), `opsforge-beat` (scheduler). Built images are tagged `opsforge-<service>:${OPSFORGE_TAG:-dev}`. Third-party images (Postgres, Redis) keep their upstream image names, but their containers are named `opsforge-postgres` and `opsforge-redis`.

### Full stack in containers

```bash
docker compose --profile app up --build                 # web on :8080, api on :8000
```

## Health endpoints

- `GET /api/health/live`: process is up.
- `GET /api/health/ready`: checks PostgreSQL and Redis; `503` if one is down.
- `GET /api/docs`: OpenAPI UI (disabled when `API_ENV=production`).

## Quality checks

```bash
npm run typecheck && npm run lint && npm test && npm run format:check

cd apps/api
.venv/Scripts/python -m ruff check .
.venv/Scripts/python -m mypy
.venv/Scripts/python -m pytest
```

## Database migrations

```bash
cd apps/api && .venv/Scripts/python -m alembic revision --autogenerate -m "message"
.venv/Scripts/python -m alembic upgrade head
```

## Configuration

All configuration comes from environment variables (see `.env.example`). No secrets are stored in the repository.
