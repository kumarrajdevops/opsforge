import type { InterviewMode, InterviewRoundKind, InterviewSession } from '@opsforge/types'
import {
  activeRound,
  currentTurn,
  openThread,
  phaseOf,
  roundRemainingSeconds,
  roundUsedSeconds,
  type SessionPhase,
} from './session'

/**
 * Everything the interview room is allowed to know. There are no scores, rubrics, concept lists,
 * evidence, probe kinds or evaluations in this shape, so the UI cannot leak them (PRD INT-04).
 */
export interface CandidateRoundView {
  id: string
  kind: InterviewRoundKind
  status: 'pending' | 'active' | 'completed'
  timeboxMinutes: number
  questionTarget: number
  questionsAsked: number
}

export interface CandidateExchange {
  kind: 'question' | 'follow-up'
  prompt: string
  answer?: string
  skipped?: boolean
}

export interface CandidateView {
  sessionId: string
  mode: InterviewMode
  phase: SessionPhase
  rounds: CandidateRoundView[]
  activeRoundId?: string
  /** Seconds left in the active round, measured from answers already given. */
  remainingSeconds?: number
  question?: {
    number: number
    total: number
    followUp: boolean
    prompt: string
    askedAt: string
    exchanges: CandidateExchange[]
  }
  /** The round that just finished, shown on the between-rounds screen. */
  justFinished?: InterviewRoundKind
  nextRound?: InterviewRoundKind
}

export function redactForCandidate(session: InterviewSession): CandidateView {
  const round = activeRound(session)
  const thread = openThread(round)
  const turn = currentTurn(thread)
  const view: CandidateView = {
    sessionId: session.id,
    mode: session.config.mode,
    phase: phaseOf(session),
    rounds: session.rounds.map((r) => ({
      id: r.id,
      kind: r.kind,
      status: r.status,
      timeboxMinutes: r.timeboxMinutes,
      questionTarget: r.questionTarget,
      questionsAsked: r.threads.length,
    })),
  }

  if (round) {
    view.activeRoundId = round.id
    view.remainingSeconds = roundRemainingSeconds(round)
  }
  if (round && thread && turn) {
    view.question = {
      number: round.threads.length,
      total: round.questionTarget,
      followUp: turn.kind === 'follow-up',
      prompt: turn.prompt,
      askedAt: turn.askedAt,
      exchanges: thread.turns
        .filter((t) => t.answer)
        .map((t) => ({
          kind: t.kind,
          prompt: t.prompt,
          answer: t.answer!.text,
          skipped: t.answer!.skipped,
        })),
    }
  }
  if (!round && view.phase === 'between-rounds') {
    const done = [...session.rounds].reverse().find((r) => r.status === 'completed')
    const next = session.rounds.find((r) => r.status === 'pending')
    if (done) view.justFinished = done.kind
    if (next) view.nextRound = next.kind
  }
  return view
}

export { roundUsedSeconds }
