# OPSFORGE — Spec Coverage Check (G1)

Purpose: prove that every item in `docs/Neural_Ops_Master_Product_Technical_Specification.pdf` (35 pages) is carried by a requirement in [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md), and list what was missing.

Method: the PDF text layer was extracted page by page (`pdftotext -layout`) and compared with the PRD bullet by bullet. Counts were checked where the spec gives a list (entities, dimensions, rounds, technologies).

Result: **35 of 35 pages covered. 11 gaps and 2 errors were found and fixed in the PRD** (tag `[G1]`). Nothing in the spec is left unmapped.

## 1. Coverage table (by PDF page)

| PDF page | Spec section | PRD requirement IDs | Status |
|---|---|---|---|
| 1 | Cover, document scope | PRD header, §0 | Covered |
| 2 | Master table of contents | PRD §0 conventions (spec refs `§P0`…`§P20`, `§A`–`§C`) | Covered |
| 3 | §P0 Vision, purpose, core question, five flagship capabilities, core learning loop | §1, §1.1, §1.2; PR-01, PR-17; RDY-09 | Covered |
| 4 | §P0 core principle; §P1 Knowledge Hub (13 facets), document ingestion, reading mode | §1; LRN-01..07, LRN-13; DOC-01..09 | Covered (LRN-13 added) |
| 5 | §P1 mind maps, infographics, flashcards and spaced repetition; §P2 hybrid architecture, initial stack, authority split (start) | LRN-09, LRN-10, LRN-13; CRD-01..03; AI-01..03; SYS-01 | Covered (SYS-01 added; AI-03 corrected) |
| 6 | §P2 authority split (end), evaluation model; §P3 question types | AI-03, AI-04; QST-01 | Covered |
| 7 | §P3 dynamic interviewer, scenario engine, scenario graph, difficulty levels | QST-03, QST-05..07, QST-09; INT-01 | Covered |
| 8 | §P3 interview behaviour (rewards clarifying questions); §P4 flow, requirements-first design (start) | QST-08; ARC-01, ARC-02 | Covered |
| 9 | §P4 requirements (end), visual components, component inspector, scorecard (start) | ARC-02..05 | Covered |
| 10 | §P4 scorecard (end), review behaviour, versioning, failure injection, trade-off simulator (start) | ARC-05..11 | Covered |
| 11 | §P4 trade-off simulator (end), cost exercise, security review, pattern library; §P5 production console (start) | ARC-11..13; PAT-01, PAT-02; OPS-01 | Covered |
| 12 | §P5 example incident, candidate workflow, evaluation, chaos timeline; §P6 interactive terminal (start) | OPS-02..06, ARC-14; LAB-01 | Covered |
| 13 | §P6 terminal (end), example labs, future sandbox direction; §P7 Observability Studio (start) | LAB-01..04, FUT-03; OBS-01 | Covered (LAB-04 extended) |
| 14 | §P7 goal; §P8 CI/CD Studio pipeline, DevSecOps list (start) | OBS-02..04; CIC-01..03 | Covered |
| 15 | §P8 DevSecOps (end), security incidents; §P9 AI Interviewer, resume interrogation | CIC-03, CIC-04, OPS-08; INT-01..04; RSM-01..03 | Covered |
| 16 | §P9 JD Analyzer; §P10 behavioural topics, answer frameworks, communication coach (start) | JDA-01..05; BEH-01..03 | Covered |
| 17 | §P10 communication coach (end), voice, STAR database; §P11 evidence dimensions, knowledge vs confidence (start) | BEH-03..06, INT-11; RDY-01, RDY-02 | Covered |
| 18 | §P11 knowledge vs confidence, wrong-answer data, readiness levels, daily plan; §P12 emergency mode (start) | RDY-02..06; QST-12, QST-13; INT-06 | Covered |
| 19 | §P12 emergency mode, Full Interview Day, Interview Replay; §P13 brand, visual evolution, personality | INT-05..07; UX-01, UX-02 | Covered |
| 20 | §P13 avoid list, light visual system, dark palette, typography | UX-02..06 | Covered |
| 21 | §P13 iconography, motion principles; §P14 package table, visual architecture (start) | UX-07, UX-08; UX-13, UX-14 | Covered (UX-13, UX-14 added) |
| 22 | §P14 visual architecture (end), where 3D is used, Architecture / Incident / Interviewer UI direction; §P15 navigation (start) | UX-09, UX-14; ARC-15; OPS-01, OPS-09; INT-09; NAV-01 | Covered |
| 23 | §P15 navigation (end), mental states, Command Center; §P16 core entities (start) | NAV-01, UX-10; CMD-01..07; DAT-01, DAT-02 | Covered (entity count corrected) |
| 24 | §P16 entities (end), evidence provenance table | DAT-02; DOC-05, DAT-09 | Covered (DAT-09 added) |
| 25 | §P16 provenance (end), data principles; §P17 production architecture, operational stack, security requirements (start) | DAT-03..08; SYS-02, SYS-03; NFR-OPS-01, NFR-OPS-02; NFR-SEC-01 | Covered (SYS-02, SYS-03 added) |
| 26 | §P17 security requirements (end); §P18 roadmap RP0, RP1, RP2 (start) | NFR-SEC-01..10; see section 3 | Covered |
| 27 | §P18 RP2 (end), RP3, RP4, RP5 | see section 3 | Covered |
| 28 | §P18 RP6, RP7, RP8, RP9; §P19 prototype capabilities (start) | see section 3; OPS-12, FUT-23 | Covered (OPS-12, FUT-23 added) |
| 29 | §P19 prototype capabilities, visual update, prototype limitation; §P20 future expansion (start) | `[PROTO]` items; SYS-04; FUT-01.. | Covered (SYS-04 added) |
| 30 | §P20 future expansion (end); Appendix A technology domains (start) | FUT-01..22; LRN-08 | Covered |
| 31 | Appendix A technology domains (end), application architecture patterns, business systems (start) | LRN-08; QST-10 | Covered |
| 32 | Appendix A business systems (end), infrastructure scenarios, operational failures | QST-10 | Covered |
| 33 | Appendix B question scoring, troubleshooting scoring, architecture scoring, interview scoring (start) | QST-11; OPS-05; ARC-05; INT-08 | Covered |
| 34 | Appendix B interview scoring (end), readiness philosophy; Appendix C 20 principles; Final Product Definition | INT-08; RDY-07; PR-01..PR-20; VIS-01 | Covered (VIS-01 added) |
| 35 | North-star outcome | §1 north-star; RDY-09 | Covered |

## 2. Gaps and errors found

| # | Spec item (page) | Problem in the PRD | Fix |
|---|---|---|---|
| 1 | Mind maps and infographics as per-technology facets (p.4) | Only the example set (LRN-09/10) was required | Added LRN-13 |
| 2 | Recommended initial stack (p.5) | No requirement; only the operational parts appeared in NFR-OPS-01/04 | Added SYS-01 |
| 3 | Authority split table (p.5–6) | AI-03 gave "readiness thresholds" as plain deterministic and "question selection" as deterministic plus adaptive. The spec text puts the adaptive wording on readiness thresholds | Corrected AI-03. The PDF text layer is misaligned, so confirm against the rendered page |
| 4 | Frontend package table and priorities (p.21) | No requirement for the stack | Added UX-13 |
| 5 | Visual architecture, which library does what (p.21–22) | Only motion in general (UX-08) | Added UX-14 |
| 6 | Core entities (p.23–24) | DAT-02 said 30 entities; the spec lists **33** | Corrected the count |
| 7 | Evidence provenance meanings (p.24) | DOC-05 listed the types without what each means | Added DAT-09 |
| 8 | Production architecture and API/WebSocket (p.25) | No requirement for the component layout or the real-time channel | Added SYS-02, SYS-03 |
| 9 | RP9 "Advanced incident simulation" (p.28) | No requirement | Added OPS-12 |
| 10 | RP9 "Multi-user or team simulations if required" (p.28) | FUT-13/14 cover peer review and team dashboards, not simulations | Added FUT-23 |
| 11 | Prototype limitation list (p.29) | Persistence and authentication were never stated as requirements | Added SYS-04 |
| 12 | Final Product Definition, intended end state (p.34) | Only the north-star question was captured | Added VIS-01 |
| 13 | Future sandbox direction environments (p.13) | LAB-04 omitted Docker, Kubernetes, Terraform and cloud | Extended LAB-04 |

Remaining wording issue, not a coverage gap: the PRD cites TODO items (A-03, A-06, A-09, C-04, C-08) that do not exist. Tracked as S5 in [TODO-PRIORITY.md](TODO-PRIORITY.md). The PRD also links [DOMAIN_MODEL.md](DOMAIN_MODEL.md) and [READINESS_ENGINE.md](READINESS_ENGINE.md), which are not written yet (S6). [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) is written (G6).

## 3. Spec roadmap (RP0–RP9) traceability

The spec's own roadmap (p.26–28) is mapped here so none of its bullets is lost. Scheduling of these items is in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md).

| Spec roadmap phase | Bullets | PRD IDs |
|---|---|---|
| RP0 Product foundation | product identity and scope; design tokens; core domain entities; application shell; readiness model | UX-01..06; DAT-02; NAV-01; RDY-01..09 |
| RP1 UI foundation | React + TypeScript; MUI theme; navigation; responsive layout; Command Center; knowledge pages; question pages; analytics shell | PR-16; UX-04..06, UX-11; NAV-01; CMD-01..08; LRN-01; QST-01 |
| RP2 Knowledge platform | upload/import; chunking and indexing; PostgreSQL + pgvector; source provenance; reading mode; AI contextual assistant; mind maps; infographics; flashcards | DOC-02, DOC-06; DOC-04, DOC-05, DAT-09; DOC-07..09; LRN-09, LRN-10, LRN-13; CRD-01..06 |
| RP3 Question engine | taxonomy; bank; attempts; evaluation; adaptive difficulty; scenario graph | QST-01..07 |
| RP4 AI layer | provider abstraction; Ollama; optional OpenAI/Anthropic; RAG pipeline; evaluation pipeline; prompt/version management; guardrails | AI-02, AI-05, AI-06; NFR-AI-01..04; NFR-MNT-03 |
| RP5 Architecture Studio | React Flow editor; palette; inspector; requirements panel; deterministic rules; AI review; versioning; scorecards; failure injection; cost estimation | ARC-01..16; UX-13, UX-14 |
| RP6 Production Simulator | incident model; evidence model; ops console; terminal; telemetry; progressive evidence; RCA scoring; chaos events | OPS-01..11 |
| RP7 Hands-on labs | sandbox lifecycle; Docker, Kubernetes, Terraform, Linux, CI/CD, cloud labs | LAB-01..06; NFR-SEC-05..07 |
| RP8 Interview intelligence | resume interrogation; JD analyzer; dynamic interviewer; behavioural database; replay; full interview day | RSM-01..05; JDA-01..05; INT-01..10; BEH-05, BEH-06 |
| RP9 Voice and advanced simulation | speech-to-text; voice interviewer; communication scoring; advanced incident simulation; 3D visualisation; multi-user or team simulations | INT-11; BEH-03, BEH-04; OPS-12; UX-09; FUT-23 |

## 4. List counts verified

| List | Spec count | PRD |
|---|---|---|
| Knowledge Hub facets | 13 | LRN-01 (13) |
| Architecture requirement inputs | 13 | ARC-02 (12 + deployment frequency) |
| Scorecard dimensions | 12 + overall | ARC-05 |
| Core entities | 33 | DAT-02 (33, corrected) |
| Readiness levels | 6 | RDY-04 |
| Evidence dimensions | 9 | RDY-01 |
| Evaluation dimensions | 10 | AI-04 |
| Interview rounds | 6 | INT-05 |
| Product principles | 20 | PR-01..PR-20 |
| Future capabilities | 22 | FUT-01..22 (+ FUT-23 from RP9) |
| Technology domains | 25 | LRN-08 |
| Security requirements | 10 | NFR-SEC-01..10 |
