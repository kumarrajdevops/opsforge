/*
 * Vendor-neutral LLM contract (PRD AI-02).
 *
 * Business logic depends on `LlmProvider` and nothing else. Adapters for Ollama, OpenAI, Anthropic
 * and so on implement it and are registered at composition time; no vendor type, model name or
 * endpoint appears in a feature. LLM output is untrusted text: callers validate it, and it never
 * becomes a score (deterministic software is authoritative, AI-01 and AI-04).
 */

export type LlmRole = 'system' | 'user' | 'assistant'

export interface LlmMessage {
  role: LlmRole
  content: string
}

export type LlmResponseFormat = 'text' | 'json'

export interface LlmRequest {
  /** What the call is for, e.g. `interview.analyze-answer`. Used for routing, audit and prompt versioning. */
  purpose: string
  /** Version of the prompt that produced `messages`, so results can be traced to a prompt revision. */
  promptVersion: string
  messages: LlmMessage[]
  responseFormat?: LlmResponseFormat
  /** Providers should treat 0 as "as deterministic as you can be". */
  temperature?: number
  maxOutputTokens?: number
}

export interface LlmUsage {
  inputTokens?: number
  outputTokens?: number
}

export interface LlmCompletion {
  text: string
  providerId: string
  /** Resolved model identifier, recorded for audit. Opaque to callers. */
  model: string
  usage?: LlmUsage
}

/** Where inference runs. Lets policy prefer local models (AI-03) and lets the UI say so honestly. */
export type LlmLocality = 'local' | 'cloud'

export interface LlmProvider {
  readonly id: string
  readonly name: string
  readonly locality: LlmLocality
  complete(request: LlmRequest, signal?: AbortSignal): Promise<LlmCompletion>
}
