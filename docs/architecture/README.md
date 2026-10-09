# Architecture documentation

Decisions are recorded in [../ADR](../ADR/README.md). Product scope is in [../PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md).

| Document | Covers |
| --- | --- |
| [../ARCHITECTURE.md](../ARCHITECTURE.md) | System shape, frontend and backend boundaries, persistence, background processing, file storage, sandbox, authentication and authorization, observability, deployment and the Kubernetes path |
| [../DOMAIN_MODEL.md](../DOMAIN_MODEL.md) | Bounded contexts, the 33 core entities, evidence versus evaluation versus snapshot, provenance |
| [../DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) | PostgreSQL strategy, append-only rules, pgvector and retrieval, Redis, object storage, retention, browser-to-API migration |
| [../AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md) | The model rule, AI boundaries, provider abstraction, RAG, embeddings, the evaluation pipeline, guardrails |
| [../SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md) | Trust boundaries, authentication, authorization, secrets, AI threats, audit logging, execution-plane requirements, known gaps |
| [../SECURITY.md](../SECURITY.md) | The security baseline that exists today |

Each document marks what is built and what is only designed. The frontend and backend boundaries are sections 3 and 4 of ARCHITECTURE; they are not separate documents.
