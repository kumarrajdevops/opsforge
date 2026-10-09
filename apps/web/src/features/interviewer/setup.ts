import type { InterviewConfig, InterviewMode, InterviewRoundKind } from '@opsforge/types'
import { buildContext } from './grounding'
import { planRounds } from './modes'

export interface SetupInput {
  mode: InterviewMode
  /** Used by single-round mode. */
  round: InterviewRoundKind
  level: 'senior' | 'staff'
  targetRole: string
  resume: string
  jd: string
  /** Prioritise topics that were weak in earlier completed sessions. */
  focusWeakTopics: boolean
}

export const DEFAULT_SETUP: SetupInput = {
  mode: 'interview-day',
  round: 'technical',
  level: 'senior',
  targetRole: '',
  resume: '',
  jd: '',
  focusWeakTopics: true,
}

export function buildInterviewConfig(
  input: SetupInput,
  extras: { seed: number; weakTopics: string[] },
): InterviewConfig {
  const role = input.targetRole.trim()
  return {
    mode: input.mode,
    level: input.level,
    rounds: planRounds(input.mode, input.round),
    seed: extras.seed,
    context: buildContext({
      ...(role ? { targetRole: role } : {}),
      resume: input.resume,
      jd: input.jd,
    }),
    focusTopics: input.focusWeakTopics ? extras.weakTopics : [],
  }
}
