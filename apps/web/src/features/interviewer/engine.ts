import type {
  AnswerAnalyzer,
  AnswerEvidence,
  InterviewConfig,
  InterviewRepository,
  InterviewSession,
  InterviewerVoice,
  QuestionSpec,
  QuestionThread,
  VoiceRequest,
} from '@opsforge/types'
import { analyzeAnswerText } from './analysis/ruleBased'
import { compileTerm } from './analysis/text'
import { questionBank } from './bank'
import { decideFollowUp, type FollowUpDecision } from './followUp'
import { selectQuestion } from './planner'
import {
  activeRound,
  addFollowUp,
  addQuestion,
  clampDuration,
  closeThread,
  completeRound,
  completeSession,
  currentTurn,
  createSession,
  nextPendingRound,
  openThread,
  recordAnswer,
  roundRemainingSeconds,
  startRound,
} from './session'
import { accumulateTurns } from './evidence'
import { phraseWith } from './voice'

export interface EngineDeps {
  /** Always required. The composition root decides whether it is rule-based, LLM-backed or both. */
  analyzer: AnswerAnalyzer
  /** Optional natural-language layer. */
  voice?: InterviewerVoice | null
  repository: InterviewRepository
  bank?: readonly QuestionSpec[]
  now?: () => Date
  newId?: () => string
  /** Provider id recorded in the session for transparency; the engine never reads it. */
  llmProviderId?: string
}

export interface SubmitInput {
  text: string
  skipped?: boolean
  /** Overrides the measured duration. Tests only. */
  durationSeconds?: number
}

/**
 * Orchestrates an interview. Question choice, follow-up policy and scoring are deterministic domain
 * code; the analyzer and voice are injected ports. Every step returns a new session and persists it.
 */
export class InterviewEngine {
  private readonly deps: Required<Pick<EngineDeps, 'analyzer' | 'repository'>> & EngineDeps
  private readonly now: () => Date
  private readonly newId: () => string
  private readonly bank: readonly QuestionSpec[]
  private counter = 0

  constructor(deps: EngineDeps) {
    this.deps = deps
    this.now = deps.now ?? (() => new Date())
    this.newId =
      deps.newId ??
      (() =>
        `${Date.now().toString(36)}${(this.counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`)
    this.bank = deps.bank ?? questionBank
  }

  private iso(): string {
    return this.now().toISOString()
  }

  private async persist(session: InterviewSession): Promise<InterviewSession> {
    await this.deps.repository.save(session)
    return session
  }

  async start(config: InterviewConfig): Promise<InterviewSession> {
    const session = createSession({
      id: this.newId(),
      config,
      engine: {
        analyzerId: this.deps.analyzer.id,
        ...(this.deps.voice ? { voiceId: this.deps.voice.id } : {}),
        ...(this.deps.llmProviderId ? { llmProviderId: this.deps.llmProviderId } : {}),
      },
      now: this.iso(),
    })
    const first = session.rounds[0]
    if (!first) return this.persist(completeSession(session, this.iso()))
    return this.persist(await this.enterRound(session, first.id))
  }

  /** Moves from the between-rounds screen into the next round. */
  async advanceRound(session: InterviewSession): Promise<InterviewSession> {
    if (activeRound(session)) return session
    const next = nextPendingRound(session)
    if (!next) return this.persist(completeSession(session, this.iso()))
    return this.persist(await this.enterRound(session, next.id))
  }

  async submitAnswer(session: InterviewSession, input: SubmitInput): Promise<InterviewSession> {
    const round = activeRound(session)
    const thread = openThread(round)
    const turn = currentTurn(thread)
    if (!round || !thread || !turn) return session

    const skipped = input.skipped === true || input.text.trim() === ''
    const duration = input.durationSeconds ?? clampDuration(turn.askedAt, this.now().getTime())
    const answer = {
      text: skipped ? '' : input.text.trim(),
      submittedAt: this.iso(),
      durationSeconds: duration,
      skipped,
    }

    const evidence = skipped ? undefined : await this.analyze(thread.spec, turn.prompt, answer.text)
    let next = recordAnswer(session, thread.id, answer, evidence)
    const updated = openThread(activeRound(next))!

    const timeUp = roundRemainingSeconds(activeRound(next)!) <= 0
    const decision = decideFollowUp(updated, { timeUp })

    if (decision.next) {
      next = await this.askFollowUp(next, updated, decision.next)
      return this.persist(next)
    }

    next = closeThread(next, thread.id, decision.closeReason)
    return this.persist(await this.afterThreadClosed(next, round.id, timeUp))
  }

  /** Ends the current round now. The open question is scored on what was said so far. */
  async endRound(session: InterviewSession): Promise<InterviewSession> {
    const round = activeRound(session)
    if (!round) return session
    let next = session
    const thread = openThread(round)
    if (thread) {
      next = this.discardUnanswered(next, thread)
      next = closeThread(next, thread.id, 'time')
    }
    next = completeRound(next, round.id, this.iso())
    if (!nextPendingRound(next)) next = completeSession(next, this.iso())
    return this.persist(next)
  }

  async endInterview(session: InterviewSession): Promise<InterviewSession> {
    let next = session
    const round = activeRound(next)
    if (round) {
      const thread = openThread(round)
      if (thread) {
        next = this.discardUnanswered(next, thread)
        next = closeThread(next, thread.id, 'time')
      }
      next = completeRound(next, round.id, this.iso())
    }
    return this.persist(completeSession(next, this.iso()))
  }

  // ───────────── internals ─────────────

  /** An unanswered trailing question is removed so it neither counts for nor against the candidate. */
  private discardUnanswered(session: InterviewSession, thread: QuestionThread): InterviewSession {
    const last = thread.turns[thread.turns.length - 1]
    if (!last || last.answer) return session
    const trimmed = thread.turns.slice(0, -1)
    if (trimmed.length === 0) {
      return {
        ...session,
        rounds: session.rounds.map((r) => ({
          ...r,
          threads: r.threads.filter((t) => t.id !== thread.id),
        })),
      }
    }
    return {
      ...session,
      rounds: session.rounds.map((r) => ({
        ...r,
        threads: r.threads.map((t) => (t.id === thread.id ? { ...t, turns: trimmed } : t)),
      })),
    }
  }

  private async analyze(
    spec: QuestionSpec,
    prompt: string,
    answer: string,
  ): Promise<AnswerEvidence> {
    try {
      return await this.deps.analyzer.analyze({ spec, prompt, answer })
    } catch (error) {
      const evidence = analyzeAnswerText(spec, answer)
      const reason = error instanceof Error ? error.message : 'Analyzer failed.'
      return { ...evidence, fallbackReason: `${this.deps.analyzer.id}: ${reason}` }
    }
  }

  private async enterRound(session: InterviewSession, roundId: string): Promise<InterviewSession> {
    const started = startRound(session, roundId, this.iso())
    return this.askNextQuestion(started, roundId)
  }

  private async afterThreadClosed(
    session: InterviewSession,
    roundId: string,
    timeUp: boolean,
  ): Promise<InterviewSession> {
    const round = session.rounds.find((r) => r.id === roundId)!
    const reachedTarget = round.threads.length >= round.questionTarget
    if (!timeUp && !reachedTarget) {
      const withQuestion = await this.askNextQuestion(session, roundId)
      // The bank ran dry for this round: treat it as finished rather than stalling.
      if (openThread(withQuestion.rounds.find((r) => r.id === roundId))) return withQuestion
    }
    let next = completeRound(session, roundId, this.iso())
    if (!nextPendingRound(next)) next = completeSession(next, this.iso())
    return next
  }

  private async askNextQuestion(
    session: InterviewSession,
    roundId: string,
  ): Promise<InterviewSession> {
    const round = session.rounds.find((r) => r.id === roundId)!
    const planned = selectQuestion(session, round, this.bank)
    if (!planned) return session

    const transcript = round.threads
      .slice(-1)
      .flatMap((t) =>
        t.turns.flatMap((turn) =>
          turn.answer ? [{ prompt: turn.prompt, answer: turn.answer.text }] : [],
        ),
      )
    const phrased = await phraseWith(this.deps.voice ?? null, {
      kind: 'question',
      authored: planned.spec.prompt,
      spec: planned.spec,
      transcript,
      forbiddenTerms: forbiddenTermsFor(planned.spec, planned.spec.prompt, new Set()),
    })
    return addQuestion(session, {
      roundId,
      threadId: this.newId(),
      turnId: this.newId(),
      spec: planned.spec,
      origin: planned.origin,
      ...(planned.groundedIn ? { groundedIn: planned.groundedIn } : {}),
      prompt: phrased.text,
      authoredPrompt: planned.spec.prompt,
      ...(phrased.phrasedBy ? { phrasedBy: phrased.phrasedBy } : {}),
      now: this.iso(),
    })
  }

  private async askFollowUp(
    session: InterviewSession,
    thread: QuestionThread,
    decision: FollowUpDecision,
  ): Promise<InterviewSession> {
    const acc = accumulateTurns(thread.turns)
    const request: VoiceRequest = {
      kind: 'follow-up',
      authored: decision.authored,
      probe: decision.probe,
      spec: thread.spec,
      ...(decision.anchor ? { anchor: decision.anchor } : {}),
      transcript: thread.turns.flatMap((t) =>
        t.answer ? [{ prompt: t.prompt, answer: t.answer.text }] : [],
      ),
      forbiddenTerms: forbiddenTermsFor(
        thread.spec,
        decision.authored,
        new Set(acc.concepts.keys()),
      ),
    }
    const phrased = await phraseWith(this.deps.voice ?? null, request)
    return addFollowUp(session, thread.id, {
      turnId: this.newId(),
      probe: decision.probe,
      target: decision.target,
      prompt: phrased.text,
      authoredPrompt: decision.authored,
      ...(phrased.phrasedBy ? { phrasedBy: phrased.phrasedBy } : {}),
      now: this.iso(),
    })
  }
}

/**
 * Terms of ideas the candidate has not yet said. A voice provider must not introduce them, because
 * that would hand over the answer. Terms already present in the authored wording are allowed.
 */
export function forbiddenTermsFor(
  spec: QuestionSpec,
  authored: string,
  covered: Set<string>,
): string[] {
  const own = (term: string) =>
    compileTerm(term).test(authored) || compileTerm(term).test(spec.prompt)
  return spec.concepts
    .filter((c) => !covered.has(c.id))
    .flatMap((c) => c.terms)
    .filter((t) => !own(t))
}
