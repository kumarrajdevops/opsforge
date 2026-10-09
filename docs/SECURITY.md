# Security baseline

Status: G10 baseline, 2026-10-09. This is what is in place and tested today, and what is not. It covers the API (`apps/api`), the web container and the nginx config. It is not a penetration test or a compliance claim.

Threat model for now: one API instance behind one reverse proxy, a single-tenant database, users who can register themselves, and no server-side execution of user input ([ADR-0007](ADR/0007-terminal-and-lab-sandbox.md)). Provider keys and tenant isolation arrive with later gates and will extend this document.

## Secrets

- All configuration comes from environment variables read by `pydantic-settings` (`apps/api/app/core/config.py`). No secret has a default value in code.
- `.env` is git-ignored. `.env.example` lists variable names with local-development values only.
- Passwords are hashed with scrypt (ADR-0005). Session tokens are random and opaque; only their hash is stored.
- Provider API keys (when a provider exists) stay on the server. They are never sent to the browser, never stored in the database, and never written to logs or prompts ([AI_ARCHITECTURE.md](AI_ARCHITECTURE.md)).
- `API_ENV=production` refuses to start when `production_problems()` finds any of: no `DATABASE_URL`, the development database password, `AUTH_COOKIE_SECURE=false`, or CORS origins that are `*` or plain `http`. The failure message names the variable, not its value.
- The development Postgres password (`opsforge`) is for local Docker only.

## Input validation

- Every request body is a pydantic model with explicit bounds (email length, password 8 to 200 characters, display name 1 to 100) and `extra="forbid"`, so unknown fields return 422 rather than being ignored.
- Request bodies above `API_MAX_BODY_BYTES` (default 2 MiB) are refused with 413 before parsing, including chunked uploads that declare no length. nginx enforces the same limit (`client_max_body_size 2m`) in front.
- Database access goes through SQLAlchemy with bound parameters. There is no string-built SQL.
- Responses to bad credentials are the same for unknown accounts and wrong passwords, and the lockout applies to unknown emails too, so it does not reveal which accounts exist.

## Rate limiting and lockout

Settings (all optional, defaults shown):

| Variable | Default | Effect |
| --- | --- | --- |
| `AUTH_LOGIN_MAX_FAILURES` | 5 | Failed logins per email inside the window before that email is locked. One address is allowed four times this across all emails. |
| `AUTH_LOGIN_WINDOW_SECONDS` | 900 | Window for counting failures. |
| `AUTH_LOCKOUT_SECONDS` | 900 | Lock duration. The 429 response carries `Retry-After`. |
| `AUTH_REGISTER_MAX_PER_HOUR` | 10 | Registrations per client address per hour. |
| `API_TRUSTED_PROXIES` | 0 | Reverse proxies that append to `X-Forwarded-For`. `0` ignores the header. |

Limits and trade-offs:

- **In-process state.** Counters live in the API process. They reset on restart and are not shared between workers or instances. This is correct for the single-instance setup in this repository. A multi-instance deployment needs Redis behind the same `AttemptLimiter` interface before it ships.
- **Lockout can be abused.** Because failures are counted per email, someone who knows a victim's email can lock them out for the lockout period. This is a deliberate trade-off against password guessing; the lock is temporary and per email, and a successful login clears the count.
- **Client address.** `X-Forwarded-For` is trusted only from the right: with `API_TRUSTED_PROXIES=1` the last entry (the one our proxy appended) is used, and entries to its left, which a client can forge, are ignored. Set it to the real proxy count or leave it at 0. The compose file sets `1` for the nginx container.

## Headers policy

API responses (`SecurityHeadersMiddleware`), on every response including errors:

| Header | Value |
| --- | --- |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `Permissions-Policy` | camera, microphone, geolocation disabled |
| `Cross-Origin-Resource-Policy` | `same-site` |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` (not on `/api/docs` and `/api/openapi.json`, which load a CDN and exist only outside production) |
| `Cache-Control` | `no-store` on `/api/*` unless a route sets its own |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`, production only |

Static app (nginx, `location /` only, so API responses are not duplicated):

- `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`.
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. `'unsafe-inline'` is for styles only, because MUI injects style tags. Scripts are same-origin only. Verified: the app renders under this policy in the web container with no console errors.
- `server_tokens off` hides the nginx version.

Not covered here:

- **HSTS for the static app** belongs to the TLS terminator in front of the web container, because this container serves plain HTTP. The API sends it in production.
- **The Vite dev server** sends none of these headers. They apply to the built image.
- **Cookies.** `opsforge_session` is `HttpOnly`, `SameSite=Lax`, path `/api`, and `Secure` in production.

## Dependency audit

Run before each release and after any dependency change.

```bash
# JavaScript (workspace root)
npm audit
npm audit --omit=dev

# Python (use a throwaway environment so the dev venv is not changed)
python -m venv /tmp/audit-venv
/tmp/audit-venv/bin/pip install pip-audit
apps/api/.venv/bin/python -m pip freeze --exclude-editable > /tmp/api-req.txt
/tmp/audit-venv/bin/pip-audit -r /tmp/api-req.txt --no-deps --disable-pip
```

On Windows the interpreter paths are `Scripts/python.exe` instead of `bin/python`.

Result on 2026-10-09: `npm audit` found 0 vulnerabilities (full and production only); `pip-audit` checked 54 Python packages and found no known vulnerabilities. This is a point-in-time result against public advisories; run it again on the date of any release.

## No execution of user input

No API route accepts a command, script or expression to run. `test_no_route_accepts_a_command_to_run` lists every route in the OpenAPI schema and fails when one is added, so adding an endpoint of that kind is a deliberate, reviewed decision. Terminal and lab commands run in a browser emulator (ADR-0007). Server-side containers need their own ADR first.

## Known gaps

These are not done and should not be assumed:

- No CSRF token. Protection today is `SameSite=Lax` plus JSON-only bodies on state-changing routes. Add a token or an `Origin` check before any form-encoded or cross-site flow.
- No audit log of sign-ins, failures, or data access, and no tenant isolation tests (phase 44, NFR-SEC-01..10). Data is per user, but there is no organisation model yet.
- Rate limits are per process (see above). There is no global request rate limit, only the auth routes.
- No account recovery, email verification, MFA or password-breach check.
- Sessions can be revoked by logout only; there is no "sign out everywhere".
- The API image runs as a non-root user (`opsforge`). Image vulnerability scanning and a pinned base-image digest policy are not set up.
- Backups and database encryption at rest are an operations concern outside this repository.

## Reporting

Keep findings private until fixed. Open a private security advisory on the repository, or contact the maintainer directly.
