# OPSFORGE

Evidence-based interview-readiness platform for Senior DevOps / SRE engineers. Product scope: [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md). Decisions: [docs/ADR](docs/ADR/README.md).

**Status:** repository scaffold, design system, application shell and the Command Center UI. The Command Center reads the same report as the Readiness page (no sample data), with unscored areas shown as unscored; ForgeArchitect (Architecture Studio) is implemented on a React Flow canvas with deterministic checks across 12 dimensions, versioning and failure simulation; its AI review is an interface only, with no provider registered and no AI scoring. Studio scenarios are sample content and designs are saved in the browser until the API exists. ForgeOps (Incident Simulator) is an operations console with two scripted scenarios (a payment-API outage and a leaked cloud credential): evidence is revealed progressively by telemetry, terminal and remediation actions, and a deterministic evaluator scores investigation order, evidence, hypotheses, mitigation, RCA, prevention and communication. Metrics and command output are scripted fixtures, sessions are saved in the browser until the API exists, and its AI review is an interface only. ForgeInterview (AI Interviewer) runs timed rounds (screening, technical, troubleshooting, architecture, behavioral, final) from a 36-question bank plus resume- and JD-grounded questions, asks deterministic follow-ups based on what was and was not said, and hides all scoring until the interview ends, then shows a debrief and a replay of every question, answer and evaluation. It talks to language models only through a vendor-neutral `LlmProvider` interface; no provider is registered and none ships, so answers are analysed by keyword and pattern rules, which the debrief discloses along with a capped confidence. Sessions are saved in the browser until the API exists. ForgeResume (Resume Interrogation) imports a .docx, .txt or .md resume (PDF is not read yet; paste instead), extracts each achievement and skill as a claim with weak-wording flags, and generates eight questions per claim (architecture, networking, security, observability, troubleshooting, trade-offs, incidents, leadership) that are scored by fixed rules; a claim counts as defensible only after several angles are defended. ForgeJD (JD Analyzer) extracts technologies, responsibilities, seniority signals and required versus preferred skills from a pasted posting, groups "at least one of" alternatives (such as AWS / Azure / GCP) into a single requirement judged by the closest option, compares requirements with evidence (only scored interview answers and resume drills count; resume lines alone are "claimed", and incident or architecture sessions carry no technology tags yet), lists the consolidated tools in the posting (cloud services fold into AWS, Azure or GCP, suites such as the Elastic Stack count once, distinct products stay separate, concepts are excluded) as a numbered table with a readiness bar for each and a final count; the tool vocabulary is a curated core plus the shared tools workbook (about 650 tools across 24 disciplines), converted with `node scripts/inventory-to-json.mjs <path-to.xlsx>` into `apps/web/src/features/technologies/inventory.json`, and turns the gaps into a phased learning path and a day-by-day preparation plan linking to existing modules. Both save in the browser and prefill the AI Interviewer setup. ForgeReady (Readiness Engine) aggregates scored evidence from interviews, resume drills, incident runs and architecture reviews into 11 factors (knowledge, questions, flashcards, labs, troubleshooting, incidents, architecture, security, communication, interviews, confidence) rather than one quiz percentage. Knowledge and confidence are scored from separate signals and compared, never blended. Level 1 (Learner) to 6 (Architect) is decided only by deterministic gates on evidence volume, days, modules, coverage, evidence confidence and a score floor, so one strong result cannot raise it, and no language model sets a score or level. Each score shows its contributing evidence, weaknesses, evidence confidence, recent trend and next action. Snapshots are append-only and saved in the browser; knowledge, question, flashcard and lab evidence is empty until those modules exist. Every other module page is a placeholder.

## Layout

```
apps/web         React + Vite client (shell, routing, API status)
apps/api         FastAPI modular monolith (health, accounts, readiness snapshots)
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
docker compose up -d opsforge-postgres opsforge-redis                     # PostgreSQL (pgvector) and Redis
cd apps/api && .venv/Scripts/python -m uvicorn app.main:app --reload   # http://localhost:8000
npm run dev                                             # http://localhost:5173
```

The Vite dev server proxies `/api` to the API. The top bar shows the API state from `/api/health/ready`. In development the sidebar has a **Design System** page showing the tokens and every component, with a light/dark toggle. The rules and token reference are in [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

### Docker naming

Images and containers use the `opsforge-<service>` pattern: `opsforge-api`, `opsforge-web`, and later `opsforge-celery` (worker), `opsforge-beat` (scheduler). Built images are tagged `opsforge-<service>:${OPSFORGE_TAG:-dev}`. Postgres and Redis are built `FROM` their upstream images (`pgvector/pgvector:pg17`, `redis:7-alpine`) and re-tagged `opsforge-postgres` and `opsforge-redis`, so every image, container and compose service in the stack carries the `opsforge-` prefix (for example `docker compose logs opsforge-api`). Containers reach each other by those names, such as `opsforge-postgres:5432`.

### Full stack in containers

```bash
docker compose --profile app up --build                 # web on :8080, api on :8000
```

Plain `docker compose up` starts only PostgreSQL and Redis, so the local dev servers can use them without a port clash on :8000. The `app` profile adds `opsforge-api` and `opsforge-web`. Verified end to end (Docker 29, Compose): both images build, the API runs `alembic upgrade head` before it serves (a fresh database gets all tables), `opsforge-api` and `opsforge-web` report healthy, `GET /api/health/ready` returns 200 with PostgreSQL and Redis both ok directly and through the web container's `/api` proxy, and registration followed by `GET /api/auth/me` works through the web container with the session cookie. If :8000 is taken, set `API_PORT=8001`; the web container reaches the API on the compose network, so it is unaffected. `docker compose --profile app down` also removes the Postgres and Redis containers (their data stays in the named volumes); run `docker compose up -d opsforge-postgres opsforge-redis` to bring them back. Ollama is not part of the stack: from a container, point the provider at the host (`host.docker.internal`).

## Health endpoints

- `GET /api/health/live`: process is up.
- `GET /api/health/ready`: checks PostgreSQL and Redis; `503` if one is down.
- `GET /api/docs`: OpenAPI UI (disabled when `API_ENV=production`).

## Accounts and saved history

Sign in from the top bar (needs PostgreSQL and `alembic upgrade head`). Signed in, readiness history is saved to your account; signed out, it stays in the browser, and the browser copy is moved to the account on first sign-in. Other modules still save in the browser. Set `AUTH_ALLOW_REGISTRATION=false` to close sign-up. See [ADR-0005](docs/ADR/0005-identity-and-persistence.md).

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET` and `POST /api/readiness/snapshots`, `POST /api/readiness/snapshots/import`

## Security

Baseline in [docs/SECURITY.md](docs/SECURITY.md): secrets from the environment only (production refuses unsafe settings), bounded request bodies, login lockout and registration throttling, security headers and a CSP on the API and web container, and `npm run audit` plus `pip-audit` for dependencies. Known gaps are listed there.

## Quality checks

One command runs every gate that CI runs (format, lint, typecheck, tests and build for the web workspaces; ruff, ruff format, mypy and pytest for the API):

```bash
npm run check                       # everything
npm run check:fast                  # skip tests and the production build
node scripts/check.mjs --web        # JavaScript and TypeScript only
node scripts/check.mjs --api        # Python only
node scripts/check.mjs --keep-going # do not stop at the first failure
```

The script uses `apps/api/.venv` when it exists, otherwise `python` on the path, or the interpreter in the `PYTHON` environment variable. It exits non-zero if any step fails.

The same steps one by one:

```bash
npm run typecheck && npm run lint && npm test && npm run format:check

cd apps/api
.venv/Scripts/python -m ruff check .
.venv/Scripts/python -m ruff format --check .
.venv/Scripts/python -m mypy
.venv/Scripts/python -m pytest
```

### Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`, as four parallel jobs: **web**, **api**, **migrations** (Alembic upgrade, downgrade and re-upgrade, then `alembic check`, against real PostgreSQL with pgvector) and **compose** (validates the Compose files and builds the `app` profile images). `.github/workflows/audit.yml` runs `npm audit` and `pip-audit` weekly and on demand, kept separate so a new upstream advisory does not block an unrelated change.

## Commit conventions

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <short description>`. Commit feature by feature, one logical change per commit, and keep the subject in the imperative or as a short noun phrase.

| Type       | Use for                                                        |
| ---------- | -------------------------------------------------------------- |
| `feat`     | a new feature or capability                                    |
| `fix`      | a bug fix                                                      |
| `hotfix`   | an urgent fix to something already released                    |
| `refactor` | restructuring with no behaviour change                         |
| `perf`     | a performance improvement                                      |
| `test`     | adding or correcting tests                                     |
| `docs`     | documentation only, including ADRs and this README             |
| `style`    | formatting only, no code change                                |
| `build`    | build system, dependencies, Docker                             |
| `ci`       | CI configuration                                               |
| `chore`    | maintenance that fits none of the above                        |

The scope is the module or area, hyphenated, for example `incident-simulator`, `architecture-studio`, `command-center`, `ui`, `api`, `docker`. Examples:

```
feat(incident-simulator): leaked cloud credential scenario
fix(architecture-studio): keep edges attached when a node is deleted
hotfix(api): return 503 when Redis is unreachable
docs: update README status for Architecture Studio
```

Append `!` after the scope for a breaking change (`feat(api)!: ...`). Update the README Status paragraph in the same feature series whenever a module becomes user-visible.

## Database migrations

```bash
cd apps/api && .venv/Scripts/python -m alembic revision --autogenerate -m "message"
.venv/Scripts/python -m alembic upgrade head
```

## Configuration

All configuration comes from environment variables (see `.env.example`). No secrets are stored in the repository.
