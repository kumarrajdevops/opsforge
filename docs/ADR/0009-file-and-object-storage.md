# ADR-0009: File and object storage

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0008](0008-background-processing.md), [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) section 6, NFR-OPS-01, NFR-OPS-04, NFR-SEC-08, DOC-11

## Context

Documents (PDF, Markdown, DOCX, runbooks, resumes) are uploaded by users and parsed into chunks. Generated artifacts (exports, reports) also need a home. The spec names object storage for uploaded documents and generated artifacts (NFR-OPS-01) and a one-command local environment with S3-compatible storage (NFR-OPS-04).

Files are personal data and untrusted input. Storing them in PostgreSQL blobs bloats backups and slows the database; storing them on the API container's disk breaks statelessness and the later move to multiple replicas or Kubernetes.

## Decision

1. **File bytes live in an S3-compatible object store.** MinIO runs in the local Compose stack as `opsforge-minio` under `--profile storage`. Any S3 service works through the same client.
2. **PostgreSQL holds metadata** in `stored_objects`: owner, key, size, content type, SHA-256, original name (as data only), state (`pending`, `ready`, `quarantined`, `deleted`).
3. **One private bucket.** Keys are `u/<user_id>/<object_id>` for user files and `sys/<kind>/<id>` for system artifacts. The filename never forms part of a key.
4. **Upload goes through the API**, which checks size and type, streams to the store while computing the SHA-256, and enqueues ingestion. Direct presigned upload is a later optimisation, because it removes the chance to validate before storing.
5. **Download** goes through the API after an authorization check, or via a presigned URL valid for minutes. No public bucket and no public listing.
6. **Accepted types** are an allowlist (PDF, DOCX, Markdown, plain text). Executables, archives and HTML are refused.
7. **Parsing is in a worker** with resource limits and never executes content. A malware scan hook sits between `pending` and `ready`; until it exists, files are parsed but not served back to other users.
8. **Deletion** removes the object, its chunks and vectors, and is recorded in the audit log. Account erasure removes all of a user's objects.
9. **Backups:** the bucket is versioned when hosted; PostgreSQL metadata and bucket are restored together.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| PostgreSQL `bytea` or large objects | Bloats backups and replicas, awkward streaming |
| Local filesystem volume | Not shareable between API and worker replicas, blocks the Kubernetes path, no versioning |
| Cloud-only storage (S3, GCS) | Violates local-first |
| MinIO only, with its own API | Ties code to one product. The S3 API keeps the choice open |
| Presigned direct uploads from day one | Skips server-side validation before storage |

## Consequences

- One more container locally, optional until phase 07.
- Metadata and bytes can diverge (an orphaned object, a row without bytes). A reconciliation job lists both sides and reports or repairs.
- Upload size limits at the edge and in the API must be raised above the current 2 MiB request body limit **for the upload route only**; the global limit stays.
- Retention defaults (open item D-04) apply to files as personal data.
