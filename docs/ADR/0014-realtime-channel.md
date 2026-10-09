# ADR-0014: Real-time channel

- Status: Proposed
- Date: 2026-10-09
- Related: [ADR-0008](0008-background-processing.md), [SECURITY_ARCHITECTURE.md](../SECURITY_ARCHITECTURE.md) section 7, SYS-03, NFR-PERF-03

## Context

The spec calls for a WebSocket channel (SYS-03) for streaming model output, job progress and later the terminal and lab event stream. Users should see progress for ingestion and long evaluations, and see model text as it is produced (NFR-PERF-03: no request blocks for more than 30 seconds without streaming or a job handle). No channel exists today. The terminal and labs are emulated in the browser (ADR-0007), so they need no channel now.

## Decision

1. **One authenticated WebSocket endpoint** at `/api/ws`, served by the API process. Same origin, same session cookie as HTTP.
2. **Authentication on upgrade.** The cookie is validated on the handshake, the `Origin` header is checked against the allowlist, and the connection closes when the session expires or is revoked.
3. **Typed messages.** A small envelope (`type`, `id`, `payload`) with a versioned schema shared in `@opsforge/types`. Unknown types are ignored and logged, not executed.
4. **Server to client is the main direction:** job progress, model token streams, notifications. Client to server messages are limited to subscribe, unsubscribe and cancel. All state-changing work still goes through HTTP routes with the usual authorization.
5. **Fan-out via Redis pub/sub** on `ws:user:<id>` channels, so a worker can publish progress and whichever API replica holds the socket delivers it. Messages are transient: nothing is stored in Redis for replay.
6. **The channel is never required.** Every use has an HTTP fallback (`GET /api/jobs/{id}`, non-streaming completion). The UI must work with the socket closed.
7. **Limits:** message size cap, per-connection rate cap, a cap on connections per user, heartbeats, and idle close.
8. **Streaming model output** passes through the gateway, which validates after the stream completes. The browser shows streamed text as provisional, and nothing is stored or scored from a stream until validation finishes.
9. **A future terminal or lab event stream** would use the same envelope but a separate, isolated path to the execution plane, not through this endpoint, and needs its own ADR ([ADR-0007](0007-terminal-and-lab-sandbox.md)).

## Alternatives considered

| Alternative | Why not |
| --- | --- |
| Server-sent events | Simpler and enough for server-to-client only. WebSocket is specified, supports cancel and subscribe messages, and avoids a second mechanism. SSE remains acceptable for a single streaming route if WebSocket proves heavy |
| Polling only | Poor for token streaming, wasteful for progress |
| Socket.IO or a hosted realtime service | Extra dependency or third party for a small need |
| Separate realtime service | Premature; it would split session handling and add a deployment unit |

## Consequences

- WebSocket scaling needs sticky routing or Redis fan-out; the design uses Redis so any replica works.
- Authentication on upgrade and Origin checks are security-critical and tested (the route allowlist test is extended to cover the endpoint).
- Reverse proxies need upgrade headers (nginx config change) and longer read timeouts for the socket path.
- Message schemas are a contract and are versioned like an API.
