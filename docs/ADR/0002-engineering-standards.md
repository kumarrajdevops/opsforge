# ADR-0002: Engineering standards and technology stack

- Status: Accepted
- Date: 2026-10-09

## Context

OPSFORGE is an evidence-based interview-readiness platform. Its core promise is that a readiness score is **explainable and reproducible**. That promise drives most of the decisions below: scoring must be deterministic, AI output must be traceable to sources, and the system must be easy to test and to run locally.

## Decision

### Principles

1. **Type safety.** TypeScript in `strict` mode (plus `noUncheckedIndexedAccess`, `verbatimModuleSyntax`). Python is type-annotated and checked with `mypy --strict`. API contracts are typed on both sides (Pydantic models; mirrored in `@opsforge/types`).
2. **Strong domain boundaries.** Each business context (knowledge, flashcards, labs, incidents, architecture, interviewer, resume, JD, readiness, documents) owns its models, services and schemas. Contexts talk through service interfaces, never through each other's tables or internals.
3. **Testability.** Business rules are pure functions in a no-I/O domain layer. I/O sits behind small interfaces that tests replace.
4. **Accessibility.** WCAG 2.2 AA is the baseline: contrast-checked tokens, visible focus, keyboard operation, semantic landmarks, state never conveyed by colour alone, reduced-motion respected.
5. **Responsive design.** Every screen works from 360 px upward. Layout is mobile-first and uses MUI breakpoints.
6. **Secure defaults.** CORS is an explicit allow-list; docs endpoints are off in production; errors never leak connection strings or stack traces; containers run as non-root; dependencies are minimal.
7. **No hardcoded secrets.** All configuration comes from the environment (`pydantic-settings`). `.env` is git-ignored; `.env.example` holds local-development values only. Secrets have no defaults in code.
8. **No business logic in UI components.** Components render and emit events. Thresholds, scoring, weights and eligibility live in the backend domain layer (readiness engine) or in feature-level modules that components receive as props.
9. **No LLM-only scoring.** The deterministic engine is authoritative. LLMs may only produce *evidence dimensions* (for example semantic correctness, completeness, depth) that are stored with provenance and fed into deterministic formulas. An LLM never emits the final score.
10. **No premature Kubernetes.** Local Docker Compose is the deployment target until there is a concrete scaling need.
11. **No unnecessary microservices.** The system starts as a **modular monolith** (see ADR-0003). A module is extracted only when it has an independent scaling, security or release need.

### Frontend

| Concern            | Choice                                        | Status                    |
| ------------------ | --------------------------------------------- | ------------------------- |
| Framework          | React, TypeScript, Vite                       | In use                    |
| UI foundation      | MUI, MUI Icons                                | In use                    |
| Data grid          | MUI X Data Grid                               | In use (DataTable)        |
| Motion             | Framer Motion                                 | In use (Reveal)           |
| Charts             | MUI X Charts                                  | Approved, add with first chart |
| Graph / diagrams   | React Flow                                    | Approved, add with Architecture Studio / mind maps |
| 3D                 | React Three Fiber, Drei                       | Approved, add only if a feature needs it |
| Timeline animation | GSAP                                          | Approved, only where timeline animation is justified |
| Extra icons        | Lucide                                        | Approved, only where MUI Icons lacks a glyph |
| Fonts              | Manrope (UI), Roboto Mono (code, commands, metrics) | In use |

"Approved, not yet installed" means the library is the sanctioned choice but is not a dependency until a feature needs it. Adding it then is a normal change and needs no new ADR.

### Backend

Python, FastAPI, PostgreSQL with pgvector, SQLAlchemy, Alembic, Redis, and Celery (or an equivalent background worker) for asynchronous work.

- Installed now: FastAPI, uvicorn, pydantic-settings, SQLAlchemy, psycopg, Alembic, Redis client.
- Deferred until a feature needs them: Celery (first background job: document ingestion or answer evaluation), pgvector Python bindings (first embedding table). The pgvector **extension** is already enabled in the database image.
- Schema changes go through Alembic migrations only.

### AI

- **Provider abstraction.** One internal interface for chat, structured output and embeddings. Ollama is the local default; OpenAI and Anthropic are optional providers selected by configuration. Callers never import a vendor SDK directly.
- **RAG** over ingested documents, with every chunk retaining its **source provenance** (document, location, version, trust level).
- **Deterministic scoring + LLM semantic evaluation.** LLM output is a structured evidence record; the readiness engine turns evidence into scores.
- **Prompt and version tracking.** Every LLM call records prompt template id and version, model, provider, parameters and inputs' provenance, so any score can be replayed and audited.

## Alternatives considered

- **Microservices from day one.** Rejected: operational cost with no scaling requirement, and domain boundaries are not yet proven.
- **LLM-judged scores.** Rejected: non-reproducible, hard to audit, drifts with model changes.
- **Kubernetes now.** Rejected: Docker Compose covers local and single-host needs.
- **Another UI kit (Tailwind, Chakra).** Rejected: MUI is the mandated foundation and fits the data-heavy screens.

## Consequences

- Backend layers must keep rules out of route handlers and out of ORM models.
- Frontend features need a typed API client layer; components do not call `fetch` directly (the health hook is the current pattern: `apiHealth.ts` plus a hook).
- CI (when added) must run lint, type-check and tests for both stacks.
