# ADR-0001: Product name and module naming

- Status: Accepted
- Date: 2026-10-09

## Context

The master specification calls the product "Neural Ops — DevOps Interview Brain". The product has since been renamed **OPSFORGE**, and its modules carry a `Forge*` brand family. Some modules are intentionally unnamed.

## Decision

The product is **OPSFORGE**. Module names:

| Brand name      | Module                 |
| --------------- | ---------------------- |
| ForgeLearn      | Knowledge              |
| ForgeCards      | Flashcards             |
| ForgeLab        | Hands-on Labs          |
| ForgeOps        | Incident Simulator     |
| ForgeArchitect  | Architecture Studio    |
| ForgeInterview  | AI Interviewer         |
| ForgeResume     | Resume Interrogation   |
| ForgeJD         | JD Analyzer            |
| ForgeReady      | Readiness Engine       |

Command Center, Documents, Questions and Patterns have no brand name and must not be given one without a decision.

- Navigation labels are descriptive (for example "Hands-on Labs"). The `Forge*` name appears as the page eyebrow.
- Code identifiers, package names (`@opsforge/*`), routes and database objects use the descriptive module name, not the brand name, so that a marketing rename never forces a migration.

## Consequences

- The spec's "Neural Ops" wording is translated when reading the spec. It is not changed in the PDF.
- A rename touches `apps/web/src/app/modules.tsx` and copy only.
