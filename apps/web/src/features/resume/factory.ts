import type { InterviewRepository, LlmProvider, ResumeRepository } from '@opsforge/types'
import { interviewRepository } from '../interviewer/repository'
import { analysisDisclosure, createAnswerAnalyzer, preferredProvider } from '../interviewer/factory'
import { resumeRepository } from './repository'
import type { ResumeRuntime } from './useResume'

export interface ResumeRuntimeOptions {
  /** Explicit provider, or `null` to force deterministic mode. Omitted means "use what is registered". */
  provider?: LlmProvider | null
  repository?: ResumeRepository
  interviewRepository?: InterviewRepository
}

export function createResumeRuntime(options: ResumeRuntimeOptions = {}): ResumeRuntime {
  const provider = options.provider === undefined ? preferredProvider() : options.provider
  return {
    repository: options.repository ?? resumeRepository,
    interviewRepository: options.interviewRepository ?? interviewRepository,
    analyzer: createAnswerAnalyzer(provider),
    disclosure: analysisDisclosure(provider),
  }
}
