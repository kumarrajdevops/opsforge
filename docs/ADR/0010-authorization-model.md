# ADR-0010: Authorization model

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0005](0005-identity-and-persistence.md), [SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md) section 5, NFR-SEC-01, NFR-SEC-03

## Context

Authentication exists (ADR-0005): a session cookie identifies a user. Authorization is only the rule "scope to the signed-in user's `user_id`", applied in the snapshot service. That is enough for one context and fails as contexts multiply: each new route and repository can forget the filter, and there is no answer to "who may do what" in one place.

The product is single-user now. Teams, mentors and reviewers are future (FUT-13, FUT-14, FUT-23). The decision must secure the present and not block that future. An earlier plan reserved a number for identity as ADR-0010; identity is ADR-0005, so 0010 is used here.

## Decision

1. **Actor.** A request dependency resolves the session cookie into an `Actor(user_id, roles, session_id)` or rejects the request. Services take an actor argument and never read the request.
2. **Roles.** `user` for everyone, `admin` for operators. There is no role that can read another user's personal data. An admin acts on jobs, usage, erasure and configuration, and each admin action is audited.
3. **Ownership by default.** Every user-owned table has `user_id`. Repository functions require the actor and filter by it. A query without the filter is a defect.
4. **One policy function.** `can(actor, action, resource)` in the service layer answers every permission question. Routers and the UI do not decide permissions. The UI hides what the API would refuse and is never the control.
5. **Not found, not forbidden.** A resource the actor may not see answers `404`, so existence does not leak.
6. **System content is read-only.** Seeded questions, scenarios and patterns are readable by all and writable by no route.
7. **A tenant key later.** When teams exist, add `workspace_id` to owned tables, membership and role grants (`mentor`, `reviewer`) to the policy, and PostgreSQL row-level security with a per-request setting as defence in depth. Not before.
8. **Tests prove it.** An isolation suite creates two users and exercises every route that takes or returns an id (phase 44). A route allowlist test already exists, so a new route cannot appear unreviewed.
9. **External identity** (OIDC) replaces only step 1.

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Per-route ad hoc checks | What exists; does not scale and cannot be audited as a set |
| Full RBAC or ABAC engine (Casbin, OPA) now | Over-specified for two roles and one tenant. The single `can()` function keeps the seam and can wrap an engine later |
| PostgreSQL row-level security from the start | Strong, but couples every test and migration to it before there is more than one context. Added later as defence in depth |
| Authorization in the UI | Not a control |

## Consequences

- Every service signature gains an actor parameter. Cheap now, costly to retrofit.
- The `admin` role needs a safe way to be granted (a command-line action, audited), and never through the public API.
- Row-level security and workspaces are deferred and need a follow-up ADR when teams begin.
- Isolation tests become a required gate for any new context.
