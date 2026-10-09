# ADR-0006: LLM providers, secrets, cost caps and fallback

- Status: Accepted
- Date: 2026-10-09
- Gate: G5

## Context

Documents and RAG (Phase 07), the reading assistant (08), question evaluation (12), scenario generation (13) and architecture review (38) need a language model. Today the `LlmProvider` interface exists in `@opsforge/types` and two features (interview answer analysis and interviewer wording) call it from the browser, but no provider is registered, so they always run their deterministic path.

The PRD fixes the direction: hybrid architecture (AI-01), providers behind one abstraction (AI-02), local by default and cloud optional with routing as configuration (NFR-AI-03), per-provider budget caps and an offline mode (NFR-AI-04), and prompt-injection and secret/PII protection (AI-06). Scores are never set by a model (AI-04).

## Decision

**1. One gateway, on the server.** All model calls go through the P1 AI Platform inside `apps/api`. Provider adapters live there and nowhere else. The browser never holds a provider key, never talks to Ollama or a cloud API directly, and never sees a prompt template's provider routing. The browser-side `LlmProvider` becomes a thin client for `POST /api/ai/complete` (built in Phase 08), so feature code that takes an `LlmProvider` does not change.

**2. Providers.**

| Provider | Locality | Role |
| --- | --- | --- |
| Ollama | local | Default. Tutor, explanations, summaries, flashcards, scenario drafts, basic interviewer, evidence extraction. |
| OpenAI | cloud | Optional. Hard reasoning and higher-quality evaluation. |
| Anthropic | cloud | Optional. Same role as OpenAI; either or both may be configured. |

Cloud providers are off unless `AI_CLOUD_ENABLED=true` and a key is present. A provider with no configuration is simply not registered. Routing is an ordered list of providers per purpose prefix (for example `interview.*` then `architecture.review`), set in configuration, not code. The first available provider that is under its budget serves the call.

**3. Key storage.**

- Keys are read from environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) into `pydantic.SecretStr` fields in the API settings.
- Local development: a git-ignored `.env`. Production: the deployment's secret store, injected as environment variables. `.env.example` lists names only.
- Keys are never written to the database, logs, error responses, API payloads, analytics or the web bundle. `GET /api/health/ready` may report that a provider is configured, never its key.
- Per-user "bring your own key" is not supported in this decision. It needs encryption at rest and a key-management story; revisit when there is more than one real user.

**4. Cost caps.**

- Every call has `maxOutputTokens` and a timeout.
- Each cloud provider has a daily and a monthly budget in USD (`AI_<PROVIDER>_DAILY_BUDGET_USD`, `AI_<PROVIDER>_MONTHLY_BUDGET_USD`). Local providers have a timeout and concurrency limit, not a money cap.
- Every call is recorded in an `ai_usage` table (user, provider, model, purpose, prompt version, input and output tokens, estimated cost, outcome, time). Spend is computed from this table, not from a counter in memory.
- When a budget is reached the provider is skipped for the rest of the period. If no other provider can serve the call, the caller gets "unavailable" (see fallback). Per-user request rate limits are part of G10.

**5. No-provider fallback.**

- `AI_MODE=offline`, no configured provider, an exhausted budget, a timeout, or invalid output all produce the same result: the call returns `unavailable`, and the calling module uses its deterministic path.
- Anything a model could not evaluate is labelled **unevaluated** or **rule-based** in the evidence and the UI. It is never scored by guess (NFR-AI-01).
- **No fake or mock provider ships in the product.** Tests use scripted stubs that exist only in test code.

**6. What may be sent.**

- Secrets (key patterns, tokens, private keys) are redacted from every prompt.
- For cloud providers, personal data (emails, phone numbers, addresses, employer-identifying details in uploaded documents) is also redacted unless the feature is marked `cloudAllowed` for that content type. Resume and document text default to local only.
- Retrieved and user text is passed as quoted data, never as instructions (see [AI_ARCHITECTURE.md](../AI_ARCHITECTURE.md)).

## Alternatives considered

- **Call providers from the browser.** Exposes keys and makes budgets unenforceable. Rejected.
- **A hosted gateway (LiteLLM, OpenRouter) as a hard dependency.** Useful later; for now it is one more service and one more place keys live. The adapter interface leaves the door open.
- **Cloud by default.** Cheaper to build against, but the product is local-first and handles resumes and private documents.
- **A built-in fake provider for demos.** Rejected: it makes sample output look like real evaluation, which breaks the "no fake data" rule.

## Consequences

- P1 must be built (Phase 08) before any feature gets real model output. Until then the two existing callers run deterministically, as they do today.
- Moving the interviewer's browser-side calls behind the gateway is a follow-up to Phase 08, not part of this ADR.
- `ai_usage` and the budget settings need a migration and API settings when P1 is built.
- Redaction is pattern-based and will miss things. It reduces risk; it is not a guarantee, and the local-only default for personal documents is the real control.
