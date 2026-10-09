# OPSFORGE: Prioritised TODO

Status: G1 to G6 are done. G7 to G10 are not started. Everything else is proposed and not started. The root `TODO.md` (tools inventory rework) stays separate and is listed as P3 below.

How to read this:

- **P0 (gate)**: must be finished before the next build phase starts. Skipping it causes rework.
- **P1 (soon)**: finish within the next two phases. Does not block, but gets expensive if left.
- **P2 (planned)**: schedule when the owning phase starts.
- **P3 (parked)**: nice to have.

Phase numbers refer to the 50-phase sequence (01 Product Specification to 50 Final Validation).

## Gates: what must be true before moving on

| Moving to | Gate (P0 items that must be done first) |
| --- | --- |
| Phase 06 (Knowledge Domain) | G1 spec coverage check, G2 dependency map, G3 roadmap |
| Phase 07 (Documents & RAG) | G4 API persistence and auth, G5 AI provider and secrets decision |
| Phase 08 (Reading Mode, AI assistant) | G5, G6 AI architecture doc |
| Phase 15 follow-up (real readiness) | G7 Command Center wired to the engine, plus Phases 06, 10, 12 producing evidence |
| Phase 29+ (Labs, Studios) | G8 terminal sandbox decision |
| Phase 46+ (Docker, K8s, production) | G9 Docker verified end to end, G10 security hardening baseline |

## P0: gates

| ID | Item | Why it blocks | Done when |
| --- | --- | --- | --- |
| G1 **DONE** | Re-check `PRODUCT_REQUIREMENTS.md` against the spec PDF page by page | Phase 01 is "source of truth". Any spec item missing from the PRD is silently dropped from every later phase. | A coverage table maps each PDF section to requirement IDs, with gaps listed. Result: [SPEC_COVERAGE.md](SPEC_COVERAGE.md); 11 gaps and 2 errors fixed in the PRD, tagged `[G1]`. |
| G2 **DONE** | Module dependency map (`docs/MODULE_CATALOG.md`, last section) | It decides build order. Today the order was chosen by feature, not by dependency (Phases 26-40 and 43 were built before 06-14). | Every module lists what it needs and what needs it, with no cycles. Result: [MODULE_CATALOG.md](MODULE_CATALOG.md), 19 modules, 6 layers, acyclic. |
| G3 **DONE** | `docs/IMPLEMENTATION_ROADMAP.md` | The PRD links to it and it does not exist. Phase order lives only in chat. | The 50 phases are listed with status, owner module, dependencies and exit criteria. Result: [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md). |
| G4 **DONE** | API persistence and auth (`apps/api`) | The API is a health endpoint only. Everything saves in the browser, so documents, RAG, spaced repetition and multi-device use cannot work. | Postgres models, migrations, a user and auth flow, and one module (readiness snapshots) moved off localStorage as the pattern. Result: [ADR-0005](ADR/0005-identity-and-persistence.md); `apps/api` has users, sessions, migration `0001` and `/api/auth` and `/api/readiness/snapshots`; the web app signs in and reads and writes snapshots through the API, falling back to the browser. Rate limiting is left to G10. |
| G5 **DONE** | LLM provider and secrets decision (ADR) | Phases 07, 08, 12, 13, 38 need an AI provider. The `LlmProvider` interface exists but nothing is registered. API keys must never reach the browser. | An ADR chooses the provider(s), key storage, cost caps and a no-provider fallback. Result: [ADR-0006](ADR/0006-llm-providers-and-secrets.md). |
| G6 **DONE** | `docs/AI_ARCHITECTURE.md` | Prompt, evidence and evaluation rules ("LLMs only produce evidence") are only in code and chat. | The document states the rules and lists which module may call a model and for what. Result: [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md). |
| G7 | Wire the Command Center to the Readiness Engine | It still shows labelled sample data while the engine exists. Two sources of truth for readiness is the main trust risk. | The Command Center reads the same report as the Readiness page, with no sample data left. |
| G8 | Terminal and lab sandbox decision (ADR) | Phases 28-33 run user commands. The sandbox model (browser emulation or containers) changes the whole security design. | An ADR picks the approach and its isolation limits. |
| G9 | Verify Docker end to end | Compose and Dockerfiles exist but have not been confirmed to build and run. | `docker compose up` starts web, api and database, and the health check passes. |
| G10 | Security hardening baseline | Needed before any real user data or provider key is stored. | Secrets handling, input validation at API boundaries, dependency audit and a headers policy are in place and documented. |

## P1: do soon

| ID | Item | Notes |
| --- | --- | --- |
| S1 | Add target users, user problems, product goals and non-goals sections to the PRD | Currently implicit in the vision and the out-of-scope list. |
| S2 | Split `NON_FUNCTIONAL_REQUIREMENTS.md` and `PRODUCT_PRINCIPLES.md` out of PRD §5 and §2 | Content exists; this is a move plus links. |
| S3 **DONE** | `MODULE_CATALOG.md` (one entry per module: purpose, requirement IDs, inputs, evidence it produces) | Written as part of G2. |
| S4 | Add a cross-cutting index to the PRD (AI, learning, interview, architecture, incident, lab, readiness, UX, security, infrastructure) | The PRD is organised by module; the prompt asked for these categories. |
| S5 | Reconcile `docs/TODO.md`: the PRD cites items like "TODO A-03" that do not exist | Either create them in this file or rewrite the references. |
| S6 | Write the paused architecture docs: ARCHITECTURE, DOMAIN_MODEL, FRONTEND_ARCHITECTURE, BACKEND_ARCHITECTURE, READINESS_ENGINE; ADR-0010 | Paused until you say go. READINESS_ENGINE is the most useful now because the engine is built. |
| S7 | Phase 06 Knowledge Domain, then 10 Flashcards, then 12 Question Engine | These feed the Readiness Engine factors that are empty today (knowledge, questions, flashcards). Without them readiness stays at low evidence coverage. |
| S8 | End-to-end and accessibility tests (Playwright plus axe) | 324 unit tests pass but no browser-level checks exist. Needed for the 3D views and reduced motion. |
| S9 | CI pipeline (lint, typecheck, test, build on every push) | Currently only run by hand. |
| S10 | Browser-check what was not covered for the visualisations: debrief spread replay, interview timeline replay, Table toggle, reduced motion | Listed as unchecked after the last build. |

## P2: schedule with the owning phase

| ID | Item | Phase |
| --- | --- | --- |
| P2-1 | Architecture: explicit requirements engine, standalone component library, patterns library, trade-off simulator, cost estimator, security review | 16, 17, 20, 22, 23, 24 |
| P2-2 | Architecture: improvement flow after versioning; broader chaos scenarios | 21, 25 |
| P2-3 | Full security incident simulator beyond the one leaked-credential scenario | 33 |
| P2-4 | Hands-on labs, observability studio, CI/CD studio, DevSecOps studio | 29-32 |
| P2-5 | Behavioral/STAR engine and communication coach | 36, 37 |
| P2-6 | Full multi-round interview simulation and cross-session analytics | 39, 40 |
| P2-7 | Emergency interview mode and daily adaptive training | 41, 42 |
| P2-8 | Adaptive learning engine and scenario engine | 13, 14 |
| P2-9 | Mind maps, infographics, reading mode | 08, 09 |
| P2-10 | Commands and troubleshooting knowledge base | 11 |
| P2-11 | Kubernetes platform, production deployment, observability of the platform | 47, 48 |
| P2-12 | Performance, reliability and cost review; final validation | 49, 50 |

## P3: parked

- Rework the tools inventory (root `TODO.md`): spelling and category review, workbook cleanup, official links in tables, JSON-vs-xlsx source of truth, alias compile cost.
- PDF resume import (PDF is not read yet; paste works).
- Incident replay timing is illustrative (derived from dependencies, not measured). Only matters if real telemetry timing is added.

## Answer to "what must be done before moving on"

1. **Before Phase 06:** G1, G2, G3. Done.
2. **Before any AI or document work (Phases 07 and 08):** G4, G5, G6.
3. **Before real readiness is meaningful:** G7 now, then S7 (Knowledge, Flashcards, Questions) so the empty factors get evidence.
4. **Before labs or terminals:** G8.
5. **Before shipping anywhere beyond your machine:** G9, G10.

Everything else can wait for the phase that owns it.
