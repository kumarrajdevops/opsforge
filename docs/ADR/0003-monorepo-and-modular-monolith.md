# ADR-0003: Monorepo layout and modular monolith

- Status: Accepted
- Date: 2026-10-09

## Context

The product has ten business contexts, one web client and one API. A single team owns them. We want strong boundaries without distributed-system cost.

## Decision

One repository, one deployable API, one deployable web app.

```
opsforge/
├── apps/
│   ├── web/            React + Vite client
│   └── api/            FastAPI modular monolith
├── packages/
│   ├── ui/             @opsforge/ui     design system (no business logic)
│   ├── types/          @opsforge/types  API contract types
│   └── config/         @opsforge/config shared TS and ESLint config
├── docs/{ADR,architecture}
├── infrastructure/{docker,postgres}
├── scripts/
├── tests/              cross-cutting end-to-end and contract tests
├── docker-compose.yml
└── README.md
```

### JavaScript workspaces

npm workspaces. Workspace packages are **source-only**: their `exports` point at `src/index.ts`, consumed directly by Vite and `tsc` (bundler resolution). No build step per package.

### API layers

```
app/
├── api/        HTTP only: routers, request/response mapping, dependencies
├── services/   application use-cases, orchestrate domain + persistence
├── domain/     (to come) pure, deterministic rules and scoring engines, no I/O
├── models/     SQLAlchemy models
├── schemas/    Pydantic request/response models
├── db/         engine, session, declarative base
├── ai/         provider abstraction, prompts, RAG (to come)
├── workers/    background tasks (to come)
└── core/       settings, logging, cross-cutting config
```

Rules:

- Dependencies point inward: `api → services → domain`. `domain` imports nothing from `api`, `db`, `ai` or any framework.
- Business contexts are subpackages inside layers (for example `services/readiness`, `models/readiness`). A context may call another through its service interface, never its models.
- Route handlers contain no business rules.
- The app is created by `create_app()`; importing it never opens a database connection.

### Health

`GET /api/health/live` reports the process is up. `GET /api/health/ready` checks configured dependencies (PostgreSQL, Redis) and returns `503` when any is down, without leaking connection details.

## Alternatives considered

- **Polyrepo / separate services.** Rejected for the reasons in ADR-0002.
- **Nx / Turborepo.** Not needed at three small packages. Revisit if build times hurt.
- **Built (compiled) workspace packages.** More tooling for no current benefit.

## Consequences

- Extracting a context into a service later is feasible because its boundary is already an interface.
- The source-only package approach means non-Vite consumers (for example a Node script) need a transpiler.
