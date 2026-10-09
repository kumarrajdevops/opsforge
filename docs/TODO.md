# OPSFORGE: Open decisions and requirement TODOs

This file holds the decisions and open questions that the Phase-1 documents refer to by ID (for example "TODO A-03"). It is not a work queue. Sequencing of build work is in [TODO-PRIORITY.md](TODO-PRIORITY.md). The root `TODO.md` is a separate item (tools inventory rework, parked as P3).

ID prefixes: **A** = product and navigation, **C** = content and non-functional targets, **D** = documentation. Status is *Resolved*, *Open* or *Proposed* (the architect has a recommendation and needs a yes or no).

## A. Product and navigation

| ID | Question | Status | Recommendation |
| --- | --- | --- | --- |
| A-03 | The spec has two phase numberings: product phases `P0` to `P20`, and an implementation roadmap `RP0` to `RP9`. How do documents cite them? | Resolved | `§P4` is the product phase, `RP4` is the roadmap phase. Written down in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §0. The 50-phase build sequence in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) is a third scheme and is always written as "phase NN". |
| A-06 | Observability Studio (M14), CI/CD & DevSecOps Studio (M15) and Behavioral & Communication (M16) are specified in the spec but have no entry in the §P15 navigation and no roadmap phase of their own. Where do they live? | Open | Keep all three in full. Add them to the navigation as: Observability and CI/CD under PRACTICE, Behavioral under INTERVIEW. The 50-phase plan already schedules them (29 to 32, 36, 37). Needs a yes before those phases start. |
| A-09 | The prototype shows a "12 day streak" badge. The spec forbids gaming XP mechanics (UX-03). Keep it? | Open | Show a plain consistency metric ("days practised this week") and no streak, flame or reward. See PRD §7 and NG-03. |

## C. Content and non-functional targets

| ID | Question | Status | Recommendation |
| --- | --- | --- | --- |
| C-04 | Sign off the proposed numeric targets: WCAG 2.2 AA (NFR-UX-01), route change under 200 ms and shell under 250 kB gzip (NFR-PERF-01), engine under 100 ms p95 and architecture rules under 500 ms for 100 nodes (NFR-PERF-02). | Open | Accept as proposed. They cannot be measured before phase 49, so they act as design budgets until then. |
| C-08 | Two undefined prototype items: the format of "Export report" on the readiness page (RDY-10), and what "Interview-ready" means as a document status (DOC-10). | Open | Export: Markdown first (diff-friendly, no dependency), JSON for the evidence, PDF later. "Interview-ready": a document that is indexed, has a source type, and has at least one generated question set. Needs your decision. |

## D. Documentation

| ID | Item | Status | Notes |
| --- | --- | --- | --- |
| D-01 | Approve the PRD. [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) is marked "Proposed — awaiting approval". | Open | Review the veto list in PRD §9. Items there stay in as written unless you object. |
| D-02 | Approve the architect-derived sections: target users, user problems, goals, non-goals (PRD §1.3 to §1.6). | Open | The spec has no such sections. They were derived from its wording and add no feature. Strike or edit anything that is wrong. |
| D-03 | Confirm the AI-03 authority table visually in the PDF. | Open | The spec table is misaligned in the PDF text layer. The reading in the PRD matches the three-to-one count of "Deterministic engine" cells and the §P2 sentence. |
| D-04 | NFRs the spec does not cover: availability target for OPSFORGE itself, data retention, backup and restore objectives, privacy policy for uploaded resumes and runbooks. | Open | Needed before real users. Not added to the NFR file as requirements because the spec is silent. See [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md) §7. |
| D-05 | Write the architecture documents: ARCHITECTURE, DOMAIN_MODEL, DATA_ARCHITECTURE, SECURITY_ARCHITECTURE, AI_ARCHITECTURE revision, ADR-0008..0015. | Proposed | Written 2026-10-09 and awaiting approval. Frontend and backend boundaries are ARCHITECTURE sections 3 and 4. A stand-alone READINESS_ENGINE document is not written; the PRD points to DOMAIN_MODEL section 5 and the readiness types. |
| D-06 | Approve ADR-0008..0015 (they are marked Proposed), and the open choices inside them: Celery on Redis (0008), MinIO locally (0009), roles `user` and `admin` (0010), the embedding model spike (0011), the two-engine position (0013). | Open | Each ADR lists alternatives and consequences. Nothing is built from them until approved. |

## Resolved

- **Phase-1 document set.** [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), [MODULE_CATALOG.md](MODULE_CATALOG.md) (with the dependency map), [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md), [PRODUCT_PRINCIPLES.md](PRODUCT_PRINCIPLES.md) and this file all exist. Spec coverage is checked page by page in [SPEC_COVERAGE.md](SPEC_COVERAGE.md).
