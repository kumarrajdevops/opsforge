# ADR-0005: Identity, sessions and server-side persistence

- Status: Accepted
- Date: 2026-10-09
- Gate: G4

## Context

Until now the API was a health endpoint and everything saved in the browser. That blocks documents, RAG, spaced repetition and use from more than one device. The PRD refers to "real user identity" (it names ADR-0010; this ADR is that decision, and the number is not reserved for it any more).

The product is built for one person first, but must not assume one person.

## Decision

**Accounts.** Email and password. Passwords are hashed with scrypt (n=2^14, r=8, p=1, per-user random salt) from the Python standard library. Verification uses a constant-time compare. An unknown email still runs a dummy hash so login timing does not reveal which emails exist, and the error message is the same for both failures.

**Sessions.** The API issues an opaque 32-byte random token in an `httpOnly`, `SameSite=Lax` cookie (`opsforge_session`, path `/api`, `Secure` in production). Only the SHA-256 of the token is stored in `auth_sessions`, so a database leak does not yield usable sessions. Sessions last 14 days and logout deletes the row.

**Same origin.** The web app reaches the API under `/api` through the Vite proxy in development and the reverse proxy in production. With `SameSite=Lax` and JSON-only bodies there is no CSRF token. If the API ever moves to another origin, this must be revisited.

**Registration** can be closed with `AUTH_ALLOW_REGISTRATION=false`, which a single-user deployment should do after creating its account.

**Persistence.** PostgreSQL through SQLAlchemy 2, with Alembic migrations as the only way the schema changes. API tests run against in-memory SQLite; migrations are verified against real Postgres.

**Pattern module: readiness snapshots.** `GET/POST /api/readiness/snapshots` and `POST /api/readiness/snapshots/import`. Snapshots are append-only (a trigger on Postgres rejects UPDATE) and idempotent per user and client snapshot id, so a retry never duplicates. The wire format is camelCase to match `@opsforge/types`.

**Web.** A repository chosen by account state: signed in uses the API, signed out uses the browser. If the API fails, the app falls back to the browser copy. On the first successful signed-in read the browser history is imported, and the local copy is cleared only after the API confirms. Other modules copy this pattern one at a time.

## Alternatives considered

- **JWT in local storage.** Readable by any script on the page, and hard to revoke. Rejected.
- **Stateless signed cookie.** No revocation without a denylist. Rejected.
- **External identity provider (OAuth, SSO).** Right for a hosted multi-user product, wrong for a local-first tool today. The session boundary (`current_user`) is one dependency, so adding one later does not touch modules.
- **Server-side session in Redis.** Faster, but adds a hard dependency for something Postgres handles at this scale.

## Consequences

- Login rate limiting and lockout were left to G10 and are now in place (per email and per address, in-process; see [SECURITY.md](../SECURITY.md)). Counters are not shared between instances.
- A duplicate email returns 409, which reveals that an account exists. Accepted for a registration form that can be closed.
- Password reset and email verification do not exist. With no mail system, recovery is an operator task.
- Modules other than readiness snapshots still save in the browser until each is moved.
