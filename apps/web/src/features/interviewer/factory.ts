import type { InterviewRepository, LlmProvider } from '@opsforge/types'
import { llmProviders } from '../ai/registry'
import { LlmAnswerAnalyzer, ResilientAnalyzer } from './analysis/llmAnalyzer'
import { InterviewEngine } from './engine'
import { interviewRepository } from './repository'
import { LlmInterviewerVoice } from './voice'

export interface EngineOptions {
  /** Explicit provider, or `null` to force deterministic mode. Omitted means "use what is registered". */
  provider?: LlmProvider | null
  repository?: InterviewRepository
}

/**
 * Composition root for the interviewer and the only place in the feature that reads the provider
 * registry. Everything below receives a provider (or nothing) by injection and never names a vendor.
 */
export function createInterviewEngine({
  provider = llmProviders.preferred(),
  repository = interviewRepository,
}: EngineOptions = {}): InterviewEngine {
  return new InterviewEngine({
    analyzer: new ResilientAnalyzer(provider ? new LlmAnswerAnalyzer(provider) : null),
    voice: provider ? new LlmInterviewerVoice(provider) : null,
    repository,
    ...(provider ? { llmProviderId: provider.id } : {}),
  })
}

export interface InterviewerRuntime {
  engine: InterviewEngine
  repository: InterviewRepository
  /** Plain-language statement of how answers will be analysed, shown before the interview starts. */
  disclosure: string
  llmProviderName: string | null
}

export function createInterviewerRuntime(options: EngineOptions = {}): InterviewerRuntime {
  const provider = options.provider === undefined ? llmProviders.preferred() : options.provider
  const repository = options.repository ?? interviewRepository
  return {
    engine: createInterviewEngine({ provider, repository }),
    repository,
    disclosure: analysisDisclosure(provider),
    llmProviderName: provider?.name ?? null,
  }
}

export function analysisDisclosure(provider: LlmProvider | null): string {
  return provider
    ? `Answers are analysed by rule-based matching plus ${provider.name} (${provider.locality}). Scores come from fixed rules over that evidence.`
    : 'No language model is configured. Answers are analysed by rule-based keyword and pattern matching, so wording matters and confidence is capped. Scores come from fixed rules.'
}
