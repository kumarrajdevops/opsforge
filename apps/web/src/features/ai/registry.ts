import type { LlmProvider } from '@opsforge/types'

/*
 * The set of LLM providers available to the app. It starts empty: no provider ships, so features
 * run on their deterministic paths until a composition step registers one (local first, AI-03).
 * Features take an `LlmProvider` (or null); they never import an adapter.
 */
export class LlmProviderRegistry {
  private readonly providers = new Map<string, LlmProvider>()

  register(provider: LlmProvider): () => void {
    this.providers.set(provider.id, provider)
    return () => {
      if (this.providers.get(provider.id) === provider) this.providers.delete(provider.id)
    }
  }

  list(): LlmProvider[] {
    return [...this.providers.values()]
  }

  get(id: string): LlmProvider | undefined {
    return this.providers.get(id)
  }

  get isConfigured(): boolean {
    return this.providers.size > 0
  }

  /** Local models are preferred (AI-03); otherwise the first registered provider. */
  preferred(): LlmProvider | null {
    const all = this.list()
    return all.find((p) => p.locality === 'local') ?? all[0] ?? null
  }
}

export const llmProviders = new LlmProviderRegistry()
