# ADR-0012: Observability

- Status: Proposed
- Date: 2026-10-09
- Related: [ARCHITECTURE.md](../ARCHITECTURE.md) section 13, NFR-OPS-01, NFR-OPS-03, NFR-SEC-04

## Context

The spec names Prometheus and Grafana for observability (NFR-OPS-01) and asks for structured logs, OpenTelemetry traces and metrics for the API, workers and every model call (NFR-OPS-03). Today the API logs to stdout in a plain-text format at a configurable level, and has health endpoints (`/api/health/live`, `/api/health/ready`). A product that teaches production operations should itself be observable, but a local single-user setup should not need a monitoring stack to run.

## Decision

1. **Logs:** switch from the current plain-text format to structured JSON on stdout. Every request gets a request id (accepted from the edge if present, else generated), included in each log line and passed to jobs and model calls. Prompts, responses, tokens, passwords and secrets are never logged.
2. **Metrics:** Prometheus format at `/metrics` on an internal-only listener, not the public port. A minimum set: request count, latency and errors by route template; job queue depth and age; job outcomes; model calls by provider, model, purpose and outcome with latency, tokens and cost; login lockouts; database pool use.
3. **Traces:** OpenTelemetry instrumentation of the API, Celery tasks and the gateway, exported by OTLP to a collector when one is configured, and a no-op when not. Spans carry the request id and purpose id, never user text.
4. **Health:** liveness answers without touching dependencies; readiness checks PostgreSQL (and Redis once used). These map to Kubernetes probes later.
5. **Audit is separate.** Security-relevant events go to the append-only `audit_log` ([SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md) section 9), not to the logging pipeline.
6. **Stack:** Prometheus and Grafana run in Compose under `--profile observability`, with provisioned dashboards stored in the repository. They are optional locally.
7. **Frontend:** no third-party analytics or session recording. Errors can be reported to the API's own log endpoint (rate-limited, size-limited), nothing else leaves the browser.
8. **Alerts** are defined as code with the dashboards for the metrics that matter (error rate, queue age, model failure rate, budget exhaustion). They are examples for a hosted setup; none are required locally.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| A hosted APM service (Datadog, New Relic) | Violates local-first and sends user-adjacent data to a third party |
| Logs only | No view of queue depth, latency or model cost |
| Metrics through the public API port | Exposes internals; an internal listener is a small cost |
| Third-party browser analytics | Privacy cost for a product that holds career material |
| Wait until production | Cost and queue visibility are needed as soon as workers and model calls exist (phases 07 and 08) |

## Consequences

- Request id propagation needs discipline across the API, jobs and the gateway; it is tested once, in the gateway and task wrappers.
- Metric label cardinality is controlled: route templates and fixed enumerations only, never user ids or free text.
- Two more optional containers locally, and a dashboard directory to maintain.
- Cost tracking relies on the `ai_usage` ledger, which is also exported as a metric.
