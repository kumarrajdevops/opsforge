# OPSFORGE: Product Principles

Source: Appendix C of `docs/Neural_Ops_Master_Product_Technical_Specification.pdf` ("Product Principles / Non-Negotiables", 20 items) and its Final Product Definition. This file was split out of [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) §2, and the IDs `PR-01` to `PR-20` are unchanged so existing references still resolve.

The principles are binding acceptance criteria for every phase and every module. A change that breaks one needs an ADR that says so, not a quiet exception.

## 1. The principles

The "Statement" column is the spec's wording. The "What it means for the build" column is the architect's reading, added so each principle can be tested. It does not change the statement.

| ID | Statement | What it means for the build |
| --- | --- | --- |
| PR-01 | Interview readiness is an evidence problem, not a content-consumption problem. | Reading, opening or finishing content never raises a score. Only a recorded attempt, answer, command or design does. |
| PR-02 | Documentation is a knowledge source, not the complete learning experience. | Every technology has practice, troubleshooting, architecture and interview facets next to its documents (LRN-01). |
| PR-03 | Official sources and AI-generated material retain distinct provenance. | Every document, chunk and generated item carries a provenance type (DOC-05) that the UI shows and the evidence keeps. |
| PR-04 | Deterministic systems remain authoritative for scoring and readiness thresholds. | Scores and levels come from pure, versioned, tested code (NFR-MNT-02). No model output is a score. |
| PR-05 | LLMs support reasoning and generation; they never silently define the user's readiness. | A model may produce evidence dimensions (AI-04). Where a model took part, the result says so, and there is a no-model path. |
| PR-06 | Every major weakness leads to an actionable next step. | A weakness with no next action is a defect. Each weakness maps to a module and a concrete task. |
| PR-07 | Every wrong answer becomes learning data. | Wrong answers are stored with topic and confidence, feed analytics, and can become cards (QST-12, CRD-04). |
| PR-08 | Hands-on ability is represented separately from theoretical knowledge. | Hands-on evidence is its own dimension and is never blended into knowledge. Emulated labs are labelled as emulated (ADR-0007). |
| PR-09 | Knowledge and confidence are measured separately. | Two signals, compared and never averaged (RDY-02). The gap is itself a finding. |
| PR-10 | Architecture is evaluated against explicit requirements. | A design is scored against stated users, traffic, availability, RPO, RTO and budget, not against a generic checklist (ARC-02, ARC-05). |
| PR-11 | Troubleshooting rewards evidence-driven investigation and clarifying questions. | Naming a fix before scope, symptoms, timeline and recent changes earns nothing (QST-08, OPS-05). |
| PR-12 | Senior-level preparation includes communication, leadership and behavioral evidence. | Behavioral and communication results are first-class evidence, not an optional extra (BEH-*). |
| PR-13 | The UI is engaging but never undermines professional interview preparation. | Light, neutral and professional by default. No game mechanics, no decoration that reads as a toy (UX-03). |
| PR-14 | 3D and animation communicate system state, relationships or progress, never mere decoration. | Every 3D view or animation answers "what does this show?". It has a non-3D fallback (NFR-UX-04). |
| PR-15 | Accessibility and reduced-motion behavior are first-class requirements. | Keyboard operation, screen-reader state changes and `prefers-reduced-motion` are part of "done" for each phase (NFR-UX-01, NFR-UX-02). |
| PR-16 | The product is a real React + TypeScript + MUI implementation, not a static HTML prototype. | The prototype in `docs/prototype/` is a visual reference only. Production code is the typed, tested app. |
| PR-17 | Every major feature contributes measurable evidence to the readiness engine. | A module that produces no evidence needs a stated reason. Evidence is typed, timestamped and replayable. |
| PR-18 | Historical attempts and evaluations are retained for replay and trend analysis. | Append-only evidence. Recalculating readiness never overwrites history (DAT-03 to DAT-08). |
| PR-19 | Security and sandbox isolation are mandatory for any real command execution or cloud lab. | No user command runs on a server without a sandbox ADR. Today none does (ADR-0007, [SECURITY.md](SECURITY.md)). |
| PR-20 | The ultimate outcome is confidence grounded in demonstrated capability. | The product succeeds when the candidate's confidence matches what the evidence shows, in both directions. |

## 2. Product definition (spec, Final Product Definition)

OPSFORGE is not a DevOps notes application. It is a continuous interview-readiness system that converts knowledge into evidence, evidence into diagnosis, diagnosis into targeted practice, and practice into measurable Senior DevOps interview readiness.

**North-star outcome.** When the user asks "Am I ready for a Senior DevOps interview today?", the system answers with evidence, identifies exactly where the candidate is likely to fail, and produces the highest-value actions to close those gaps (PRD §1, RDY-09).

**Core principle (spec Phase 0).** A user must not be marked proficient simply because they read documentation. Understanding, recall, application, troubleshooting and explanation each require evidence.

## 3. How the principles are used

- **Phase exit.** Every phase in [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) is checked against the principles it touches before it is called done. The roadmap's standing rule (lint, typecheck, tests, evidence to the engine, accessibility and reduced motion) is PR-15, PR-17 and PR-04 in practice.
- **Review.** A review that finds a principle broken blocks the change. Examples: a score computed from model output (PR-04, PR-05), a lab pass shown as real-environment skill (PR-08), a 3D view with no state meaning (PR-14).
- **Conflicts.** When two principles pull apart, the deterministic and evidence principles (PR-01, PR-04, PR-05, PR-17, PR-18) win over presentation principles (PR-13, PR-14). Record the call in an ADR.
- **Traceability.** Each principle's testable parts appear as requirements with IDs in the PRD and in [NON_FUNCTIONAL_REQUIREMENTS.md](NON_FUNCTIONAL_REQUIREMENTS.md). The "What it means" column names the main ones.
