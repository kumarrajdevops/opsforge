import type {
  AnswerEvidence,
  CandidateAnswer,
  InterviewConfig,
  InterviewEngineInfo,
  InterviewRound,
  InterviewSession,
  InterviewTurn,
  ProbeKind,
  QuestionOrigin,
  QuestionSpec,
  QuestionThread,
  ThreadCloseReason,
} from '@opsforge/types'
import { evaluateSession, evaluateThread } from './scoring'

/** A single answer counts for at most this long, so an abandoned tab cannot swallow a whole round. */
export const MAX_ANSWER_SECONDS = 900

export function createSession(input: {
  id: string
  config: InterviewConfig
  engine: InterviewEngineInfo
  now: string
}): InterviewSession {
  return {
    id: input.id,
    schemaVersion: 1,
    config: input.config,
    engine: input.engine,
    status: 'in-progress',
    startedAt: input.now,
    rounds: input.config.rounds.map((plan, i) => ({
      id: `round-${i + 1}`,
      kind: plan.kind,
      timeboxMinutes: plan.timeboxMinutes,
      questionTarget: plan.questionTarget,
      status: 'pending' as const,
      threads: [],
    })),
  }
}

export function activeRound(session: InterviewSession): InterviewRound | undefined {
  return session.rounds.find((r) => r.status === 'active')
}

export function nextPendingRound(session: InterviewSession): InterviewRound | undefined {
  return session.rounds.find((r) => r.status === 'pending')
}

export function openThread(round: InterviewRound | undefined): QuestionThread | undefined {
  return round?.threads.find((t) => t.status === 'open')
}

export function currentTurn(thread: QuestionThread | undefined): InterviewTurn | undefined {
  const last = thread?.turns[thread.turns.length - 1]
  return last && !last.answer ? last : undefined
}

export function roundUsedSeconds(round: InterviewRound): number {
  return round.threads.reduce(
    (sum, t) => sum + t.turns.reduce((s, turn) => s + (turn.answer?.durationSeconds ?? 0), 0),
    0,
  )
}

export function roundRemainingSeconds(round: InterviewRound): number {
  return round.timeboxMinutes * 60 - roundUsedSeconds(round)
}

export type SessionPhase = 'question' | 'between-rounds' | 'complete'

export function phaseOf(session: InterviewSession): SessionPhase {
  if (session.status !== 'in-progress') return 'complete'
  return activeRound(session) ? 'question' : 'between-rounds'
}

function mapRound(
  session: InterviewSession,
  roundId: string,
  fn: (r: InterviewRound) => InterviewRound,
): InterviewSession {
  return { ...session, rounds: session.rounds.map((r) => (r.id === roundId ? fn(r) : r)) }
}

function mapThread(
  session: InterviewSession,
  threadId: string,
  fn: (t: QuestionThread) => QuestionThread,
): InterviewSession {
  return {
    ...session,
    rounds: session.rounds.map((r) => ({
      ...r,
      threads: r.threads.map((t) => (t.id === threadId ? fn(t) : t)),
    })),
  }
}

export function startRound(
  session: InterviewSession,
  roundId: string,
  now: string,
): InterviewSession {
  return mapRound(session, roundId, (r) => ({ ...r, status: 'active', startedAt: now }))
}

export function addQuestion(
  session: InterviewSession,
  input: {
    roundId: string
    threadId: string
    turnId: string
    spec: QuestionSpec
    origin: QuestionOrigin
    groundedIn?: string
    prompt: string
    authoredPrompt: string
    phrasedBy?: string
    now: string
  },
): InterviewSession {
  const turn: InterviewTurn = {
    id: input.turnId,
    kind: 'question',
    prompt: input.prompt,
    authoredPrompt: input.authoredPrompt,
    ...(input.phrasedBy ? { phrasedBy: input.phrasedBy } : {}),
    askedAt: input.now,
  }
  const thread: QuestionThread = {
    id: input.threadId,
    roundId: input.roundId,
    spec: input.spec,
    origin: input.origin,
    ...(input.groundedIn ? { groundedIn: input.groundedIn } : {}),
    turns: [turn],
    status: 'open',
  }
  return mapRound(session, input.roundId, (r) => ({ ...r, threads: [...r.threads, thread] }))
}

export function recordAnswer(
  session: InterviewSession,
  threadId: string,
  answer: CandidateAnswer,
  evidence: AnswerEvidence | undefined,
): InterviewSession {
  return mapThread(session, threadId, (t) => {
    const turns = [...t.turns]
    const last = turns[turns.length - 1]
    if (!last || last.answer) return t
    turns[turns.length - 1] = { ...last, answer, ...(evidence ? { evidence } : {}) }
    return { ...t, turns }
  })
}

export function addFollowUp(
  session: InterviewSession,
  threadId: string,
  input: {
    turnId: string
    probe: ProbeKind
    target: string
    prompt: string
    authoredPrompt: string
    phrasedBy?: string
    now: string
  },
): InterviewSession {
  const turn: InterviewTurn = {
    id: input.turnId,
    kind: 'follow-up',
    probe: input.probe,
    target: input.target,
    prompt: input.prompt,
    authoredPrompt: input.authoredPrompt,
    ...(input.phrasedBy ? { phrasedBy: input.phrasedBy } : {}),
    askedAt: input.now,
  }
  return mapThread(session, threadId, (t) => ({ ...t, turns: [...t.turns, turn] }))
}

/** Closes the thread and stores its hidden evaluation. */
export function closeThread(
  session: InterviewSession,
  threadId: string,
  reason: ThreadCloseReason,
): InterviewSession {
  return mapThread(session, threadId, (t) => {
    const kind = session.rounds.find((r) => r.id === t.roundId)!.kind
    const closed: QuestionThread = { ...t, status: 'closed', closeReason: reason }
    return { ...closed, evaluation: evaluateThread(closed, kind) }
  })
}

export function completeRound(
  session: InterviewSession,
  roundId: string,
  now: string,
): InterviewSession {
  return mapRound(session, roundId, (r) => ({ ...r, status: 'completed', completedAt: now }))
}

export function completeSession(session: InterviewSession, now: string): InterviewSession {
  const done: InterviewSession = {
    ...session,
    status: 'completed',
    completedAt: now,
    rounds: session.rounds.map((r) =>
      r.status === 'completed' ? r : { ...r, status: 'completed' as const },
    ),
  }
  return { ...done, evaluation: evaluateSession(done, now) }
}

export function clampDuration(startedAt: string, nowMs: number): number {
  const elapsed = Math.round((nowMs - Date.parse(startedAt)) / 1000)
  return Math.max(0, Math.min(MAX_ANSWER_SECONDS, Number.isFinite(elapsed) ? elapsed : 0))
}
