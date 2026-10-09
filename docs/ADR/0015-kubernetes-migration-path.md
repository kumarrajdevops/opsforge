# ADR-0015: Kubernetes migration path and the limits of the modular monolith

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0002](0002-engineering-standards.md), [ADR-0003](0003-monorepo-and-modular-monolith.md), [ARCHITECTURE.md](../ARCHITECTURE.md) section 14, NFR-OPS-01

## Context

The spec names Kubernetes as the eventual deployment platform (NFR-OPS-01). The system is a modular monolith run with Docker Compose, which suits a local-first product and a single developer. Moving to Kubernetes early adds operational weight (manifests, ingress, secrets, storage classes, upgrades) with no benefit until there is more than one machine or a hosted audience. Splitting into microservices early adds distributed-system failure modes without a scaling reason.

The decision is to keep both options cheap, and to define when each is justified.

## Decision

### 1. No Kubernetes now

Compose remains the deployment target until there is a hosted deployment with more than one user population, or a need for more than one replica of a component. Kubernetes is entered by a decision with a measured reason, not by schedule.

### 2. Properties kept now so the move is mechanical

| Property | Kubernetes mapping |
| --- | --- |
| API and worker are stateless; state lives in PostgreSQL, Redis, object storage | Deployments with N replicas |
| Configuration only from environment variables | ConfigMap and Secret |
| One image, two commands (API, worker) | Two Deployments from one build |
| `/live` and `/ready` endpoints | Liveness and readiness probes |
| Migrations are one command; the image runs it at API start today (one replica only) | Move to a Job or init step |
| Non-root container, no local writable state | Restricted pod security standard |
| Logs to stdout, metrics on an internal port | Standard log collection and a ServiceMonitor |
| Object storage, not volumes, for files | No shared `ReadWriteMany` volume |
| Graceful shutdown on SIGTERM; tasks idempotent | Safe rolling updates |
| Rate limits and sessions not held in process memory | **Required before a second replica**; see gate below |

### 3. Gate before a second replica of anything

Login lockout and registration limits currently live in process memory ([SECURITY.md](../SECURITY.md)). They move to Redis first. The WebSocket fan-out uses Redis from the start ([ADR-0014](0014-realtime-channel.md)).

### 4. Kubernetes shape when the trigger fires

- Packaging: Helm chart or Kustomize base in `infrastructure/kubernetes/`, one overlay per environment.
- Workloads: `api` and `worker` Deployments, a `beat` single-replica Deployment, a `migrate` Job, `web` as static files behind an ingress or a small nginx Deployment.
- Data: PostgreSQL and Redis as managed services where available. Running them in the cluster is a separate decision that needs backup and restore proof. The object store is an S3 service.
- Autoscaling: the worker pool scales on queue depth, the API on CPU or latency.
- Network: a default-deny network policy; the API reaches data services and the model provider egress only; the execution plane, if ever built, is in its own namespace with no route to anything else.

### 5. Microservices: not now, and what would justify extraction

A context stays a package. It may become its own deployable only if **all** are true: a measured need that cannot be met inside the monolith, a stable interface already in use between it and its callers (the service interface it exposes today), its own data (no shared tables), and an owner. Valid needs:

| Need | Likely first extraction |
| --- | --- |
| Different scaling profile (embedding or evaluation throughput) | The worker pool, already a separate process |
| Different security domain (running user commands) | The execution plane |
| Independent release cadence for a heavy dependency | Document parsing |

The API contexts (knowledge, cards, questions, interview and so on) are not candidates. Their coupling is high and their load is small.

### 6. How extraction would be done

1. The context already exposes a service interface and owns its tables (an import-linter contract enforces both).
2. Replace in-process calls with a client implementing the same interface.
3. Move the tables with a migration; no cross-context foreign keys exist to untangle, only `user_id`.
4. Use the outbox ([ADR-0013](0013-evidence-store-and-domain-events.md)) as the event source for a bus if one becomes necessary.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Kubernetes from the start | Cost without a benefit at one machine; slows the local loop |
| Microservices from the start | Distributed transactions, versioned network APIs, tracing and deployment multiplication for no scaling need. The spec itself requires a modular monolith first (ADR-0003) |
| Serverless functions | Poor fit for long jobs, local-first and stateful sessions |
| Docker Swarm or Nomad | Non-standard to the spec; Kubernetes is the named target |

## Consequences

- A small amount of discipline now (stateless processes, environment-only config) keeps the move cheap.
- The "second replica" gate is a concrete, testable condition.
- Extraction is allowed but never routine, and the first candidates are processes that already exist separately.
- Adopting Kubernetes later needs a follow-up ADR that records the trigger, the data-service decision and the rollout plan.
