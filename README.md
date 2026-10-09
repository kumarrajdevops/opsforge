# OPSFORGE

Evidence-based interview-readiness platform for Senior DevOps / SRE engineers. Product scope: [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md). Decisions: [docs/ADR](docs/ADR/README.md).

**Status:** repository scaffold, design system, application shell and the Command Center UI. The Command Center renders labelled sample data because the readiness engine and API are not built yet; ForgeArchitect (Architecture Studio) is implemented on a React Flow canvas with deterministic checks across 12 dimensions, versioning and failure simulation; its AI review is an interface only, with no provider registered and no AI scoring. Studio scenarios are sample content and designs are saved in the browser until the API exists. ForgeOps (Incident Simulator) is an operations console with two scripted scenarios (a payment-API outage and a leaked cloud credential): evidence is revealed progressively by telemetry, terminal and remediation actions, and a deterministic evaluator scores investigation order, evidence, hypotheses, mitigation, RCA, prevention and communication. Metrics and command output are scripted fixtures, sessions are saved in the browser until the API exists, and its AI review is an interface only. ForgeInterview (AI Interviewer) runs timed rounds (screening, technical, troubleshooting, architecture, behavioral, final) from a 36-question bank plus resume- and JD-grounded questions, asks deterministic follow-ups based on what was and was not said, and hides all scoring until the interview ends, then shows a debrief and a replay of every question, answer and evaluation. It talks to language models only through a vendor-neutral `LlmProvider` interface; no provider is registered and none ships, so answers are analysed by keyword and pattern rules, which the debrief discloses along with a capped confidence. Sessions are saved in the browser until the API exists. ForgeResume (Resume Interrogation) imports a .docx, .txt or .md resume (PDF is not read yet; paste instead), extracts each achievement and skill as a claim with weak-wording flags, and generates eight questions per claim (architecture, networking, security, observability, troubleshooting, trade-offs, incidents, leadership) that are scored by fixed rules; a claim counts as defensible only after several angles are defended. ForgeJD (JD Analyzer) extracts technologies, responsibilities, seniority signals and required versus preferred skills from a pasted posting, groups "at least one of" alternatives (such as AWS / Azure / GCP) into a single requirement judged by the closest option, compares requirements with evidence (only scored interview answers and resume drills count; resume lines alone are "claimed", and incident or architecture sessions carry no technology tags yet), lists the consolidated tools in the posting (cloud services fold into AWS, Azure or GCP, suites such as the Elastic Stack count once, distinct products stay separate, concepts are excluded) as a numbered table with a readiness bar for each and a final count; the tool vocabulary is a curated core plus the shared tools workbook (about 650 tools across 24 disciplines), converted with `node scripts/inventory-to-json.mjs <path-to.xlsx>` into `apps/web/src/features/technologies/inventory.json`, and turns the gaps into a phased learning path and a day-by-day preparation plan linking to existing modules. Both save in the browser and prefill the AI Interviewer setup. Every other module page is a placeholder.

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
