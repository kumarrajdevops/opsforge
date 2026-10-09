# OPSFORGE: Non-Functional Requirements

Source: spec §P17 (production architecture, security requirements), §P16 (data), §P13 to §P15 (accessibility and motion), §P2 (AI) and Appendix C. This file was split out of [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §5, and the IDs are unchanged so existing references still resolve.

How to read this:

- **(spec)** means the requirement comes directly from the specification. **`[ADDED]`** means the architect added it; it does not narrow any spec requirement and is open to veto (see PRD §9).
- Numeric targets are **proposed** and need sign-off (decision C-04 in [TODO.md](TODO.md)).
- **Status** is what is true in the repository on 2026-10-09: *Met*, *Partial*, *Not started*, or *Not applicable yet* (the module it protects does not exist). Security detail is in [SECURITY.md](SECURITY.md).

## 1. Security (spec §P17, all mandatory)

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-SEC-01 (spec) | Tenant/user isolation. | Partial. Snapshots are scoped to the signed-in user. There is no organisation model and no isolation test suite (phase 44). |
| NFR-SEC-02 (spec) | Encrypted secrets. | Partial. Secrets come from the environment and never reach the browser or the database. No encrypted secret store yet (ADR-0006). |
| NFR-SEC-03 (spec) | Strict access controls. | Partial. Session auth on user routes, scrypt passwords, login lockout. No roles yet. |
| NFR-SEC-04 (spec) | Audit logging. | Not started. |
| NFR-SEC-05 (spec) | Sandbox isolation for hands-on labs. | Met by design. Labs run in a browser emulator and nothing executes on the server (ADR-0007). Needs a new ADR before any container lab. |
| NFR-SEC-06 (spec) | Safe command execution. | Met by design. A test fails if a route that runs commands is added (`test_no_route_accepts_a_command_to_run`). |
| NFR-SEC-07 (spec) | Cloud credential isolation. | Not applicable yet. No cloud integration exists. |
| NFR-SEC-08 (spec) | Document access controls. | Not applicable yet (phase 07). |
| NFR-SEC-09 (spec) | Prompt-injection defenses for retrieved documents. | Not applicable yet (phase 07). Rules are in [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md). |
| NFR-SEC-10 (spec) | PII and secret redaction where appropriate. | Not applicable yet. Required before the first provider call (ADR-0006). |

## 2. Data integrity and explainability

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-DATA-01 (spec) | Append-only evidence; historical performance never overwritten (DAT-03 to DAT-08). | Met for readiness snapshots. Other modules still save in the browser. |
| NFR-DATA-02 (spec) | Provenance on all knowledge content (PR-03). | Not started (phase 07). |
| NFR-DATA-03 (spec) | Readiness score fully explainable down to contributing evidence (RDY-08). | Met. Every score lists its contributing evidence. |
| NFR-DATA-04 `[ADDED]` | Deterministic reproducibility: given the same evidence set and the same engine and config version, the engine yields the same score. | Met. Covered by engine tests. |

## 3. Usability, accessibility, performance

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-UX-01 (spec) | Accessibility is first-class (PR-15). Proposed target: WCAG 2.2 AA, full keyboard operation of every flow including the architecture canvas, screen-reader-announced state changes in ForgeOps. | Partial. No automated accessibility checks yet (phase 45). |
| NFR-UX-02 (spec) | `prefers-reduced-motion` honored; an in-app motion toggle; minimal motion in interviews. | Partial. Honoured in code; not yet browser-verified end to end (S10). |
| NFR-UX-03 (spec) | Responsive desktop/mobile. | Partial. Shell is responsive; each module page is checked as it is built. |
| NFR-UX-04 `[ADDED]` | 3D routes lazy-loaded; non-3D fallback for low-power/reduced-motion; 3D never blocks primary workflows. | Met for the existing 3D views. |
| NFR-PERF-01 `[ADDED]` | Proposed: interactive route change < 200 ms after code load; initial JS for the shell < 250 kB gzip (3D, flow, charts split into route chunks). | Not measured (phase 49). |
| NFR-PERF-02 `[ADDED]` | Proposed: deterministic engines respond < 100 ms p95 for a single evaluation; architecture rules run < 500 ms for a 100-node graph. | Not measured (phase 49). |
| NFR-PERF-03 `[ADDED]` | LLM calls are asynchronous/streamed; UI shows processing state; no request blocks > 30 s without streaming or a job handle. | Not applicable yet. No provider is registered. |

## 4. Operability

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-OPS-01 (spec) | Docker for development and packaging; Kubernetes as the eventual deployment platform; Prometheus + Grafana for observability; object storage for uploaded documents and generated artifacts. | Partial. Docker verified (G9). Kubernetes, Prometheus, Grafana and object storage not started. |
| NFR-OPS-02 (spec) | Background workers for ingestion, embedding, generation, evaluation and lab orchestration. | Not started. Redis and the worker package exist but no jobs. |
| NFR-OPS-03 `[ADDED]` | Structured logs, OpenTelemetry traces and Prometheus metrics for API, workers and every LLM call (latency, tokens, cost, provider, prompt version). | Partial. Structured logs only. |
| NFR-OPS-04 `[ADDED]` | One-command local environment (`docker compose up`) for Postgres+pgvector, Redis, object storage (S3-compatible), and optionally Ollama. | Partial. Postgres and Redis, and the full app with `--profile app`. No object storage or Ollama service. |

## 5. AI quality and cost

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-AI-01 `[ADDED]` | LLM output used for evaluation must be schema-validated; invalid output is retried then marked unevaluated, never scored by guess. | Rule written (AI_ARCHITECTURE.md). No provider ships, so nothing to validate yet. |
| NFR-AI-02 `[ADDED]` | Golden-set regression tests for prompts and evaluators before any prompt/model change is promoted. | Not started (phase 45). |
| NFR-AI-03 (spec) | Local LLM by default for cost; cloud optional (provider routing is configuration, not code). | Decided in ADR-0006. Not implemented. |
| NFR-AI-04 `[ADDED]` | Per-provider budget caps and an offline mode in which every feature degrades gracefully to deterministic behavior. | Offline mode is the current behaviour. Budget caps not started. |

## 6. Maintainability and extensibility

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-MNT-01 `[ADDED]` | Content (questions, scenarios, labs, patterns, rubrics) is authored as versioned, schema-validated files and seeded, not hand-entered in the DB. | Partial. Question bank and scenarios are typed fixtures. Becomes the rule in phase 06. |
| NFR-MNT-02 `[ADDED]` | Deterministic engines are pure libraries with no I/O (unit-testable in isolation). | Met for the Readiness, interview, resume, JD, incident and architecture evaluators. |
| NFR-MNT-03 (spec) | Evaluators, rubrics and readiness weights are versioned to allow re-evaluation (DAT-07). | Partial. The readiness engine carries a version; other evaluators do not yet. |
| NFR-MNT-04 `[ADDED]` | Every API contract is described by OpenAPI and the web client is generated from it. | Partial. OpenAPI is generated by FastAPI. The client is hand-written; generation is not set up. |

## 7. Open items

- **C-04.** Sign off the proposed numeric targets: WCAG 2.2 AA, NFR-PERF-01 and NFR-PERF-02. They are measurable only from phase 49, but they shape design choices from now.
- **Not covered by the spec and not added here:** availability targets for OPSFORGE itself, data retention periods, backup and restore objectives, and a privacy policy for uploaded personal material (resumes, runbooks). These need a decision before real users, and are listed in [TODO.md](TODO.md).
