# ADR-0008: Background processing

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0003](0003-monorepo-and-modular-monolith.md), [ARCHITECTURE.md](../ARCHITECTURE.md) section 8, NFR-OPS-02, NFR-PERF-03

## Context

Several planned features cannot run inside an HTTP request: parsing and chunking uploaded documents, computing embeddings, model calls that take many seconds, evaluation batches, readiness recompute over history, scheduled maintenance (purging sessions, retention) and, later, lab orchestration. The spec names background workers for ingestion, embedding, generation, evaluation and lab orchestration (NFR-OPS-02), and the stack names Celery and Redis. Redis already runs in `opsforge-redis`; nothing uses it yet.

The system must stay a modular monolith. A worker is the same code in a second process, not a second service.

## Decision

1. **Celery with Redis as the broker**, running the **same application image** as the API with a different command. The Celery app lives in `apps/api/app/workers`. Tasks call the service layer; they contain no business logic of their own.
2. **PostgreSQL owns job state.** A `jobs` table records each unit of work: type, subject, user, status, attempts, progress, error code and timestamps. Redis carries only the message (the job id). Losing Redis delays work; it loses none.
3. **Tasks take identifiers, not payloads**, load their inputs from the database, and are **idempotent**: running one twice produces the same result. Progress is written to `jobs`.
4. **A sweeper** (a scheduled task) re-enqueues jobs stuck in `queued` or `running` past a timeout, up to a retry limit.
5. **Retries** use bounded exponential backoff for transient errors only. A permanent error (invalid file, schema failure) ends in `failed` with a stable error code the user can see. There is no endless retry.
6. **Separate queues by cost and risk:** `ingest` (parsing untrusted files, resource-limited), `ai` (model calls, concurrency-limited, budget-aware) and `default`. A slow model queue must not delay a status update.
7. **Model calls from workers go through the P1 gateway** like any other caller (ADR-0006).
8. **Untrusted file parsing runs only in workers**, with time, memory and output limits.
9. **Progress reaches the browser** over the WebSocket channel ([ADR-0014](0014-realtime-channel.md)), with `GET /api/jobs/{id}` polling as the fallback. Nothing in the UI depends on the channel being up.
10. **Scheduling** uses Celery beat for a small set of maintenance tasks. Beat runs as a single instance.
11. **Local development:** `opsforge-worker` in Compose under `--profile app`, plus `opsforge-redis` as today. The worker is not required to run the web app or the readiness features.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| FastAPI `BackgroundTasks` | Runs in the API process, dies with it, has no retry, status or concurrency control |
| A queue inside PostgreSQL (`SKIP LOCKED`) | Viable and fewer moving parts, but the stack already names Celery and Redis, the worker ecosystem (retries, beat, routing) is mature, and Redis is already required for pub/sub and shared rate limits. Revisit if Redis ever becomes optional |
| RQ or Dramatiq | Lighter than Celery, but the spec names Celery and the team gains nothing by diverging |
| Separate microservice for ingestion | Premature. The module boundary already isolates it; extraction is possible later (ADR-0015) |
| Cloud queue service | Violates local-first (NFR-OPS-04) |

## Consequences

- One more process to run, monitor and secure. Mitigated by a shared image and the optional Compose profile.
- Every long operation needs a `jobs` row and an idempotent task. This is a design cost, paid once per task type, and gives retries, status and auditing for free.
- Redis loss is a delay, not a data loss; the broker needs no durable guarantees from Redis.
- Celery's serialisation and result backend are configured to avoid pickle (JSON only), since a broker message is untrusted input if Redis is ever exposed.
- Task code is tested by calling the service function directly and by one integration test per task type that runs through the broker.
