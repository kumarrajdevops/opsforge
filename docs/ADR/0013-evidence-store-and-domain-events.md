# ADR-0013: Evidence store and domain events

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0005](0005-identity-and-persistence.md), [DOMAIN_MODEL.md](../DOMAIN_MODEL.md) section 5, [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) sections 3 and 4, DAT-03 to DAT-08, PR-17, PR-18, RDY-08, RDY-11

## Context

Every module must contribute evidence to readiness (PR-17), history must be kept for replay (PR-18, DAT-07, DAT-08), evaluation is separate from evidence (DAT-04) and AI reasoning from deterministic calculation (DAT-05). Today evidence is computed in the browser and only readiness snapshots are stored server-side, append-only. The module dependency graph requires M13 to have no hard dependency on any producing module, so producers and the reader need a shared, neutral store.

Two questions follow: how evidence is stored and written, and how other contexts learn that something happened without a hard dependency or a message bus.

## Decision

1. **A shared evidence store (P2)** owns `ev_evidence` and `ev_evaluations`. Producing contexts write through the evidence service. M13 reads from it. Neither calls the other.
2. **Attempt, evaluation, evidence and snapshot are four separate records** ([DOMAIN_MODEL.md](../DOMAIN_MODEL.md) section 5). Attempts are immutable once finished. An evaluation records the evaluator id and version and the basis. Evidence is one row per (attempt, factor).
3. **Append-only by trigger.** UPDATE is rejected in the database for evidence, evaluations, finished attempts, `ai_usage` and `audit_log`, as it already is for readiness snapshots. A correction is a new row that supersedes the old one by reference.
4. **Deterministic mapping.** Evidence scores come from a pure, versioned function over an evaluation. A model contributes dimensions only (ADR-0006).
5. **Domain events through a transactional outbox.** A change other contexts care about writes an `outbox` row in the same database transaction. A worker delivers it to in-process handlers (for example "recompute the snapshot", "update the daily plan"). Delivery is at least once, so handlers are idempotent.
6. **No message bus.** No Kafka, no RabbitMQ topics, no event sourcing as the system of record. The evidence table is the history; the outbox is delivery plumbing. The handler registry is plain Python.
7. **Where the engines run.** The TypeScript engines remain the reference implementation while evidence is browser-side. When a feature needs server-side recompute (replay, background plan generation), a Python implementation is added and **both are held to shared fixtures** with identical expected results, or the TypeScript engine is called through a defined build artifact. The choice is made by the phase that first needs it, with this ADR amended. It is not made now.
8. **Replay.** A recompute selects evidence up to a time, runs the engine at the stored config version, and inserts a new snapshot. Nothing is edited.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Producers call the readiness service directly | Hard dependency from every module on M13; breaks the acyclic layers |
| Full event sourcing | A large cost in tooling and rebuilds for a product whose history requirement is already met by append-only evidence |
| A message bus now | A new system to run, with no consumer that needs it. The outbox can feed a bus later if a context is extracted |
| Mutable evidence with an edit history | Weakens the guarantee and the explanation of past scores |
| Only the browser holds evidence | Cannot replay on the server or serve a second device |
| Rewrite the engines in Python immediately | Duplicate logic and a drift risk before there is a need |

## Consequences

- The evidence service becomes the only writer of evidence. Producers get a small, stable API: `record(attempt, factor, score, basis, evaluation)`.
- Evidence tables grow without bound and are never edited. Partitioning by time is possible later without changing the model.
- Outbox delivery needs idempotent handlers and a sweeper. Both are cheap and covered by the worker design (ADR-0008).
- The two-engine question stays open and visible, so duplicate engines are not created by accident. The parity-fixtures approach is the default when it is needed.
