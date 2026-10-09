import type { InterviewSession } from '@opsforge/types'

export interface AnalysisNotes {
  answers: number
  /** Answers where a configured model failed and the rule-based baseline was used instead. */
  fellBack: number
}

export function analysisNotes(session: InterviewSession): AnalysisNotes {
  let answers = 0
  let fellBack = 0
  for (const round of session.rounds) {
    for (const thread of round.threads) {
      for (const turn of thread.turns) {
        if (!turn.evidence) continue
        answers += 1
        if (turn.evidence.fallbackReason) fellBack += 1
      }
    }
  }
  return { answers, fellBack }
}
