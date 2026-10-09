import type {
  AnalysisBasis,
  AnswerEvidence,
  AnswerSignalId,
  ConceptHit,
  InterviewTurn,
  QuestionThread,
  RedFlagHit,
} from '@opsforge/types'

const RANK = { named: 1, explained: 2 } as const

export interface Accumulated {
  concepts: Map<string, ConceptHit>
  signals: Map<AnswerSignalId, string | undefined>
  redFlags: Map<string, RedFlagHit>
}

export function emptyAccumulated(): Accumulated {
  return { concepts: new Map(), signals: new Map(), redFlags: new Map() }
}

/** Adds one turn's evidence. The stronger concept reading wins; everything else is a union. */
export function accumulate(into: Accumulated, evidence: AnswerEvidence | undefined): Accumulated {
  if (!evidence) return into
  for (const hit of evidence.concepts) {
    const existing = into.concepts.get(hit.conceptId)
    if (!existing || RANK[hit.strength] > RANK[existing.strength])
      into.concepts.set(hit.conceptId, hit)
  }
  for (const s of evidence.signals) {
    if (!into.signals.has(s.signal) || (!into.signals.get(s.signal) && s.quote)) {
      into.signals.set(s.signal, s.quote)
    }
  }
  for (const r of evidence.redFlags) {
    if (!into.redFlags.has(r.redFlagId)) into.redFlags.set(r.redFlagId, r)
  }
  return into
}

export function accumulateTurns(turns: InterviewTurn[]): Accumulated {
  const acc = emptyAccumulated()
  for (const turn of turns) accumulate(acc, turn.evidence)
  return acc
}

export function answeredTurns(thread: QuestionThread): InterviewTurn[] {
  return thread.turns.filter((t) => t.answer && !t.answer.skipped && t.answer.text.trim() !== '')
}

export function followUpTurns(thread: QuestionThread): InterviewTurn[] {
  return thread.turns.filter((t) => t.kind === 'follow-up')
}

export function threadBasis(thread: QuestionThread): AnalysisBasis | 'mixed' {
  const bases = new Set(
    thread.turns.map((t) => t.evidence?.basis).filter((b): b is AnalysisBasis => b !== undefined),
  )
  if (bases.size > 1) return 'mixed'
  return [...bases][0] ?? 'rule-based'
}

export function answerText(thread: QuestionThread): string {
  return answeredTurns(thread)
    .map((t) => t.answer!.text)
    .join('\n')
}
