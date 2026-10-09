# ADR-0011: Retrieval and vector storage

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0006](0006-llm-providers-and-secrets.md), [AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md), [DATA_ARCHITECTURE.md](../DATA_ARCHITECTURE.md) section 5, AI-05, PR-03, NFR-SEC-09

## Context

Documents and notes are the grounding for retrieval-based answers (RAG) and for question generation. The spec requires provenance on all content (PR-03, DOC-05) and defences against prompt injection from retrieved text (NFR-SEC-09). The stack names PostgreSQL with pgvector, and the `vector` extension is already enabled in `opsforge-postgres`.

Scale is small: one user's documents number in the hundreds, system content in the low thousands of chunks. Retrieval quality, tenancy and re-indexing matter more than raw throughput.

## Decision

1. **pgvector in the main PostgreSQL database.** No separate vector database.
2. **Chunks are first-class rows** (`doc_chunks`) with text, heading path, ordinal, token count, provenance type, embedding, embedding model and version, and a `tsvector` for full-text.
3. **Hybrid retrieval:** cosine similarity over an HNSW index, combined with full-text rank by reciprocal rank fusion. Technical strings (flags, error text) need keyword match.
4. **Tenancy in SQL.** One function, `search(actor, query, filters, k)`, is the only retrieval path. It filters by owner and provenance before ranking.
5. **Index versions.** `(chunker version, embedding model, model version, dimension)` identifies an index. Changing any part creates a new version, built in the background, activated in one transaction, with the old one retired later. Retrieval reads only the active version.
6. **Embeddings come from the P1 gateway** (an `embed` capability on providers), local by default. The model and dimension are chosen in the phase 07 spike by measuring recall at k on a fixed golden retrieval set.
7. **Cite or refuse.** Answers must cite returned chunk ids; uncited or unreturned ids are rejected. Retrieved text is untrusted data in delimited blocks.
8. **Provenance is carried** from document to chunk to answer, and shown to the user.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| A dedicated vector database (Qdrant, Weaviate, Milvus) | A second datastore to run, back up and secure for a corpus that fits easily in PostgreSQL. Tenancy filters and transactional consistency with documents are simpler in one database. Revisit only on measured scale limits |
| Vector-only search | Poor at exact technical terms |
| Embeddings in Redis | Not a source of truth; rebuild cost on loss |
| In-process FAISS | State outside the database; harder to filter by owner, back up and version |
| Re-embed in place when the model changes | Mixed vector spaces give wrong results and no rollback |

## Consequences

- Vector dimension is part of the table definition, so the model choice has a migration attached; the index-version design keeps this to adding a column or a table, not rewriting data.
- Re-indexing doubles chunk storage briefly. Acceptable at this scale.
- pgvector HNSW build time and memory are watched; the choice of HNSW versus IVFFlat is confirmed in the spike.
- Retrieval quality has a measurable gate in CI against a local model, skipped, not faked, when none is available.
- A future extraction of retrieval into its own service is possible because access is through one function.
