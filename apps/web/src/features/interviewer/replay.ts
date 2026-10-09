import type {
  InterviewRoundKind,
  InterviewSession,
  ProbeKind,
  ThreadCloseReason,
  ThreadEvaluation,
} from '@opsforge/types'

export interface ReplayExchange {
  turnId: string
  kind: 'question' | 'follow-up'
  probe?: ProbeKind
  target?: string
  prompt: string
  phrasedBy?: string
  answer: string
  skipped: boolean
  durationSeconds: number
}

export interface ReplayThread {
  threadId: string
  round: InterviewRoundKind
  topic: string
  intent: string
  origin: string
  groundedIn?: string
  exchanges: ReplayExchange[]
  closeReason: ThreadCloseReason
  /** The hidden evaluation, revealed only because the session is complete. */
  evaluation: ThreadEvaluation | null
}

/**
 * Question → Answer → Follow-up → Answer → Evaluation → Score, per thread. Replay exists only for a
 * completed session, so hidden scoring cannot be read mid-interview through this path.
 */
export function buildReplay(session: InterviewSession): ReplayThread[] | null {
  if (session.status !== 'completed') return null
  return session.rounds.flatMap((round) =>
    round.threads.map<ReplayThread>((thread) => ({
      threadId: thread.id,
      round: round.kind,
      topic: thread.spec.topic,
      intent: thread.spec.intent,
      origin: thread.origin,
      ...(thread.groundedIn ? { groundedIn: thread.groundedIn } : {}),
      exchanges: thread.turns
        .filter((turn) => turn.answer)
        .map<ReplayExchange>((turn) => ({
          turnId: turn.id,
          kind: turn.kind,
          ...(turn.probe ? { probe: turn.probe } : {}),
          ...(turn.target ? { target: turn.target } : {}),
          prompt: turn.prompt,
          ...(turn.phrasedBy ? { phrasedBy: turn.phrasedBy } : {}),
          answer: turn.answer!.text,
          skipped: turn.answer!.skipped,
          durationSeconds: turn.answer!.durationSeconds,
        })),
      closeReason: thread.closeReason ?? 'covered',
      evaluation: thread.evaluation ?? null,
    })),
  )
}
