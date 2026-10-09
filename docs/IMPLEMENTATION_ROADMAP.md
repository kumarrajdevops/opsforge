# OPSFORGE — Implementation Roadmap

Fifty phases from product specification to final validation. This is the schedule for the requirements in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), organised by the modules in [MODULE_CATALOG.md](MODULE_CATALOG.md). The spec's own roadmap (RP0–RP9) is traced in [SPEC_COVERAGE.md](SPEC_COVERAGE.md#3-spec-roadmap-rp0rp9-traceability).

Status was assessed from the repository on the date of this document, not from memory.

## How to read this

- **Status**: Done (exit criteria met), Partial (some exit criteria met, the rest listed), Not started, Unverified (exists but not confirmed to work).
- **Owner**: the module in the catalog that the phase delivers or extends. `Platform` means cross-cutting work with no single module (repo, deployment, security).
- **Depends on**: phases that must be complete. `Gx` is a gate from [TODO-PRIORITY.md](TODO-PRIORITY.md). Dependencies follow the hard dependency map in the catalog, not the numeric order.
- **Exit criteria**: what must be true to call the phase done. Every phase also needs: lint, typecheck and tests green; the module's evidence reaches the Readiness Engine where it produces evidence (PR-17); accessibility and reduced motion honoured (PR-15).

## Summary

| Status | Count | Phases |
| --- | --- | --- |
| Done | 10 | 01, 03, 04, 15, 26, 27, 34, 35, 38, 43 |
| Partial | 11 | 02, 05, 16, 18, 19, 21, 25, 33, 39, 40, 45 |
| Not started | 28 | 06–14, 17, 20, 22–24, 28–32, 36, 37, 41, 42, 44, 47–50 |
| Unverified | 1 | 46 |

Order warning: the product was built by feature, so phases 26–27, 34–35, 38–40 and 43 exist while 06–14 do not. Those built phases run on pasted text, fixed scenarios and deterministic stand-ins and must be re-pointed at the real modules when those arrive (see the end of the catalog's dependency map).

## Foundation (01–05)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 01 | Product Specification & Source of Truth | Done | Platform | none | PRD with IDs for every spec item; page-by-page coverage table; module catalog with dependency map; this roadmap. Awaiting your approval of the PRD (status header still reads "Proposed"). |
| 02 | Architecture & ADRs | Partial | Platform | 01 | ADR-0001..0004 exist. Missing: ARCHITECTURE, DOMAIN_MODEL, AI_ARCHITECTURE (G6), FRONTEND_ARCHITECTURE, BACKEND_ARCHITECTURE, READINESS_ENGINE docs; ADRs for LLM provider and secrets (G5), terminal sandbox (G8), persistence and auth (G4). |
| 03 | Repository & Engineering Foundation | Done | Platform | 01 | Monorepo, TypeScript strict, ESLint, tests, build, commit conventions, Docker scaffolding in place. CI pipeline still missing (S9). |
| 04 | Design System | Done | P3 | 03 | Light default and dark theme, tokens, shared components, icons, container/presentational rule (ADR-0004). |
| 05 | Shell & Command Center | Partial | M01 | 04, 15 | Shell, navigation, responsive layout exist. Command Center must read the Readiness Engine report with no sample data (G7) and show plan, continue-training and recent evidence from real sources. |

## Knowledge and learning (06–14)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 06 | Knowledge Domain | Not started | M02, P2 | 03, 04, G1–G3 | Technology, topic and skill entities seeded for the 25 technologies in LRN-08; a hub per technology rendering the 13 facets; content authored as schema-validated files (NFR-MNT-01); progress facet reads P2; emits Knowledge and Confidence evidence. |
| 07 | Documents & RAG | Not started | M03 | 06, G4, G5 | Upload and paste for official, personal, runbook and JD material; chunking and indexing as background jobs; provenance type on every document and chunk (DOC-04, DOC-05, DAT-09); retrieval returns cited chunks; access control and secret redaction; prompt-injection tests pass. |
| 08 | Reading Mode & AI Assistant | Not started | M03, P1 | 07, G5, G6 | Full-document reading; select text and run explain, simplify, example, architecture, question, flashcard, note, connect-topics (DOC-08) grounded in the selection; provider abstraction with Ollama and one optional cloud provider; offline fallback; evaluation output limited to evidence dimensions. |
| 09 | Mind Maps & Infographics | Not started | M02 | 06 | Mind maps and infographics for the LRN-09 and LRN-10 sets, as a per-technology facet (LRN-13), accessible without relying on colour or motion. |
| 10 | Flashcards & Spaced Repetition | Not started | M04 | 06, G4 | Five card types; review history, correct/incorrect, confidence; deterministic scheduler with tests; weak-card list; cards created from selections and wrong answers; each review emits evidence. |
| 11 | Commands & Troubleshooting Knowledge | Not started | M02 | 06 | Command references and guided diagnostic workflows per technology (LRN-04, LRN-05), linked to questions and labs. |
| 12 | Question Engine | Not started | M05 | 06, 08 | Question bank with nine types, L1–L4, technology and topic tags; attempts persisted; deterministic scoring across the QST-11 dimensions, with model output used only as evidence; wrong-answer analytics and the six-step remediation sequence (QST-12, QST-13); clarifying-question reward. |
| 13 | Scenario Engine | Not started | M05 | 12 | Scenario graph (problem to follow-ups) as a shared engine; ten scenario types; the candidate's path controls revealed evidence; the library in QST-10 seeded in stages. ForgeOps (26, 27) re-pointed at it. |
| 14 | Adaptive Learning | Not started | M05, M13 | 10, 12, 15 | Adaptive difficulty and question selection are deterministic and explainable; weakness-to-next-action mapping for every major weakness (PR-06); knowledge-vs-confidence interpretation (RDY-02) shown. |

## Readiness engine (15)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 15 | Evidence & Readiness Engine | Done | M13, P2 | 03 | Pure deterministic engine; nine dimensions; six levels with evidence thresholds; explainable report; snapshots; reproducible (NFR-DATA-04). Follow-ups: knowledge, question, flashcard and lab evidence are empty until 06, 10, 12, 29 land; persistence moves off browser storage (G4). |

## Architecture (16–25)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 16 | Architecture Requirements Engine | Partial | M08 | 03, 04 | Scenario with the 13 requirement inputs exists. Missing: requirements are evaluated by explicit rules against the design (PR-10), with coverage per requirement shown. |
| 17 | Architecture Component Library | Not started | M08 | 16 | A standalone, versioned library of generic, AWS and Azure components with inspector schemas (ARC-03, ARC-04). A basic catalog exists inside the Studio today. |
| 18 | Architecture Studio | Partial | M08 | 16, 17 | Canvas, palette, inspector, connections, minimap and 3D views exist. Missing: findings pinned on nodes and edges for every rule (ARC-08), keyboard-complete editing. |
| 19 | Evaluation & Scorecard | Partial | M08 | 18 | Twelve-dimension deterministic scorecard exists. Missing: semantic AI review separated from violations (ARC-07, needs 08), evidence emitted to the engine per version. |
| 20 | Patterns Library | Not started | M09 | 12, 18 | 14 patterns with all eight documented fields (PAT-02); links to questions and Studio components. |
| 21 | Versioning & Improvement | Partial | M08 | 19 | Version history and compare exist. Missing: guided improvement flow from findings to a new version, with score history V1..Vn. |
| 22 | Trade-off Simulator | Not started | M08 | 19 | The eight trade-offs of ARC-11 simulated against the current design with deterministic outcomes. |
| 23 | Cost Estimator | Not started | M08 | 17 | Cost model per component, cost-reduction exercise that checks the availability requirement still holds (ARC-12). |
| 24 | Security Review | Not started | M08 | 19 | The 13 review areas of ARC-13 as rules; findings feed the Security dimension. |
| 25 | Failure Injection / Chaos | Partial | M06, M08 | 18, 26 | Failure simulation and replay exist for the main failures. Missing: the full list in ARC-10, the chaos timeline of OPS-06 as a candidate-response exercise, hand-off to ForgeOps (ARC-14). |

## Incidents and hands-on (26–33)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 26 | Production Incident Simulator | Done | M06 | 04, 15 | Operations console, progressive evidence, terminal, telemetry, hypotheses, mitigation, RCA, prevention, scoring against the 11 troubleshooting criteria, replay. |
| 27 | Incident Scenario Graph & Evidence Engine | Done | M06 | 26 | Scenario graph with evidence revealed by the candidate's path; raw evidence kept and replayable (OPS-11). Re-point at the shared engine in 13. |
| 28 | Interactive Terminal / Hands-on Foundation | Not started | M07 | G8, 03 | Terminal engine supporting the LAB-01 command set; sandbox isolation per the G8 ADR; safe command execution and credential isolation (PR-19, NFR-SEC-05..07); reset and observe. |
| 29 | Hands-on Labs | Not started | M07 | 28 | The seven example labs of LAB-02 across Docker, Kubernetes, Terraform, Linux, CI/CD and cloud; attempts recorded as Hands-on evidence separate from theory (PR-08). |
| 30 | Observability Studio | Not started | M14 | 26, 27 | Coverage designer for logs, metrics, traces and the OBS-01 tools; troubleshooting from simulated telemetry; symptom-to-root-cause relationship taught and scored. |
| 31 | CI/CD Studio | Not started | M15 | 26 | Pipeline designer for the 13-stage flow; scoring of scan placement, approvals, secrets, rollback, progressive delivery, branch protection, artifact promotion (CIC-02). |
| 32 | DevSecOps Studio | Not started | M15 | 31 | The CIC-03 topics covered and linked into other modules, not isolated; Security evidence produced. |
| 33 | Security Incident Simulator | Partial | M06, M15 | 26, 32 | One leaked-credential scenario exists. Missing: Kubernetes secret exposed, vulnerable image, suspicious CloudTrail; the detect, contain, investigate, eradicate, recover, prevent sequence scored. |

## Interview intelligence (34–42)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 34 | Resume Interrogation | Done | M11 | 15 | Claims and tools extracted, per-claim question paths, defensibility, readiness per tool. Re-point at documents in 07. |
| 35 | JD Analyzer | Done | M12 | 34, 15 | Technologies, responsibilities, priorities, weighted view, comparison to resume and readiness, learning path. Re-point at documents in 07. |
| 36 | Behavioral & STAR | Not started | M16 | 08, 12 | Behavioral topics (BEH-01), answer frameworks (BEH-02), STAR database with all ten fields (BEH-05), questions generated from the user's own experience (BEH-06). |
| 37 | Communication Coach | Not started | M16 | 36 | Evaluation of the nine communication criteria (BEH-03) as evidence; voice analysis deferred (BEH-04). |
| 38 | AI Interviewer | Done | M10 | 34, 35 | Dynamic follow-ups, resume and JD grounding, scores hidden until the end, interview-room UI. |
| 39 | Full Interview Simulation | Partial | M10 | 38, 36 | Timed rounds and debrief exist. Missing: the six-round Interview Day (INT-05) run end to end with no hints and scores hidden until the end. |
| 40 | Interview Replay & Analytics | Partial | M10, M13 | 39 | Per-session replay timeline exists. Missing: cross-session trends and weak-topic retest (INT-07, FUT-12). |
| 41 | Emergency Interview Mode | Not started | M10 | 15, 35, 39 | Time-boxed plan covering the eight INT-06 areas, driven by weak areas and the JD. |
| 42 | Daily Adaptive Training | Not started | M13 | 10, 12, 14, 15 | Daily plan (RDY-06) built from evidence, with tomorrow's allocation changing with performance; deep links to the closing module. |

## Experience (43)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 43 | Advanced Motion & 3D | Done | P3 | 04 | Neural Core, topology, depth, health and incident propagation views; Framer Motion primitives; GSAP only for timelines; reduced motion honoured. Unchecked in a browser: debrief spread replay, interview timeline replay, Table toggle, reduced motion (S10). |

## Quality, security and operations (44–50)

| Phase | Name | Status | Owner | Depends on | Exit criteria |
| --- | --- | --- | --- | --- | --- |
| 44 | Security Hardening | Not started | Platform | G4, G10 | Secrets handling, input validation at API boundaries, dependency audit, headers policy, audit logging, tenant isolation tested (NFR-SEC-01..10). |
| 45 | Testing & Quality | Partial | Platform | 03 | 324 unit tests pass. Missing: Playwright end-to-end flows, axe accessibility checks (NFR-UX-01), golden-set prompt regression (NFR-AI-02), CI on every push (S9). |
| 46 | Docker & Local Deployment | Unverified | Platform | 03, G4 | Compose and Dockerfiles exist but are unconfirmed. `docker compose up` starts web, api, database, Redis and object storage; health check passes; containers named `opsforge-<service>` (G9, NFR-OPS-04). |
| 47 | Kubernetes Platform | Not started | Platform | 46, 44 | Manifests or Helm chart, secrets, ingress, probes, resource limits; deployable on a local cluster. |
| 48 | Production Deployment & Observability | Not started | Platform | 47 | Prometheus and Grafana dashboards, structured logs, traces and LLM-call metrics (NFR-OPS-03); backup and restore tested. |
| 49 | Performance, Reliability, Cost | Not started | Platform | 45, 48 | Targets in NFR-PERF-01..03 measured and met; load test on the API; per-provider cost caps verified (NFR-AI-04). |
| 50 | Final Product Validation | Not started | Platform | all | Every requirement ID traced to a test or an explicit deferral; the north-star question (RDY-09) answered with evidence for a real run; PRD status moved from Proposed to Accepted. |

## Gates and the phases they unblock

| Gate | Unblocks |
| --- | --- |
| G1, G2, G3 (this change) | 06 |
| G4 persistence and auth | 07, 10, 44, 46 |
| G5 provider and secrets ADR | 07, 08 |
| G6 AI architecture doc | 08 |
| G7 Command Center on the engine | 05, and real readiness with 06, 10, 12 |
| G8 terminal sandbox ADR | 28 and everything after it in 29–33 |
| G9 Docker verified | 46 |
| G10 security baseline | 44, 47 |

## Suggested build order from here

The catalog's layers give the order that avoids rework. Within the open phases:

1. G4, G5, G6, G7 (small, unblock everything).
2. 06, then 07 and 08 (M02, M03, P1).
3. 10 and 12 (M04, M05); then 13 and 14. This is the first point at which Knowledge, Practice and Confidence evidence become real.
4. 36, 37, then finish 39, 40, 41, 42.
5. 17 to 25 for the rest of Architecture; 28 to 33 for labs and studios.
6. 44 to 50 last, except G9 and G10 which must come before anything is deployed beyond this machine.
