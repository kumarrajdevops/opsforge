import type {
  InterviewConfig,
  InterviewSession,
  LlmCompletion,
  LlmProvider,
  LlmRequest,
} from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { LlmAnswerAnalyzer, parseAnalysis, ResilientAnalyzer } from './analysis/llmAnalyzer'
import { analyzeAnswerText } from './analysis/ruleBased'
import { questionBank } from './bank'
import { InterviewEngine } from './engine'
import { createInterviewEngine } from './factory'
import { buildContext } from './grounding'
import { planRounds } from './modes'
import { selectQuestion } from './planner'
import { buildReplay } from './replay'
import { LocalStorageInterviewRepository } from './repository'
import { activeRound, createSession, currentTurn, openThread } from './session'
import { redactForCandidate } from './view'
import { LlmInterviewerVoice, validateVoice } from './voice'
import { weakTopicsFrom } from './weakTopics'

const STRONG_PROBES =
  'A readiness probe decides whether the pod receives traffic, so a failing readiness check gets the pod removed from the service endpoints without a restart. ' +
  'A liveness probe makes the kubelet restart the container, which catches a deadlock. ' +
  'A startup probe protects a slow start so liveness does not kill the app during boot. ' +
  'The classic failure is a liveness probe that checks the database, so when the dependency is down every pod restarts and the outage cascades. ' +
  'I tune failureThreshold and timeoutSeconds so a GC pause is tolerated, for example three failures at a 5 second period.'

function config(overrides: Partial<InterviewConfig> = {}): InterviewConfig {
  return {
    mode: 'single-round',
    level: 'senior',
    rounds: [{ kind: 'technical', timeboxMinutes: 30, questionTarget: 2 }],
    seed: 11,
    context: { resumeClaims: [], jdRequirements: [] },
    focusTopics: [],
    ...overrides,
  }
}

function clock() {
  let t = Date.parse('2026-03-01T10:00:00.000Z')
  return () => new Date((t += 20_000))
}

function engineFor(provider: LlmProvider | null = null) {
  const repository = new LocalStorageInterviewRepository(null)
  const engine = createInterviewEngine({ provider, repository })
  return { engine, repository }
}

function deterministicEngine() {
  const repository = new LocalStorageInterviewRepository(null)
  let n = 0
  const engine = new InterviewEngine({
    analyzer: new ResilientAnalyzer(null),
    repository,
    now: clock(),
    newId: () => `id${++n}`,
  })
  return { engine, repository }
}

async function run(
  engine: InterviewEngine,
  cfg: InterviewConfig,
  answers: (prompt: string) => string,
) {
  let session = await engine.start(cfg)
  for (let i = 0; i < 150 && session.status === 'in-progress'; i++) {
    const turn = currentTurn(openThread(activeRound(session)))
    if (!turn) session = await engine.advanceRound(session)
    else session = await engine.submitAnswer(session, { text: answers(turn.prompt) })
  }
  return session
}

function scriptedProvider(reply: (request: LlmRequest) => string | Error): LlmProvider {
  return {
    id: 'stub',
    name: 'Stub',
    locality: 'local',
    async complete(request): Promise<LlmCompletion> {
      const out = reply(request)
      if (out instanceof Error) throw out
      return { text: out, providerId: 'stub', model: 'stub-1' } as LlmCompletion
    },
  }
}

describe('question bank', () => {
  it('has unique ids and concept ids, and every round is covered', () => {
    const ids = questionBank.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const q of questionBank) {
      const concepts = q.concepts.map((c) => c.id)
      expect(new Set(concepts).size).toBe(concepts.length)
      expect(q.concepts.length).toBeGreaterThanOrEqual(3)
    }
    for (const kind of [
      'screening',
      'technical',
      'troubleshooting',
      'architecture',
      'behavioral',
      'final',
    ] as const) {
      expect(questionBank.filter((q) => q.rounds.includes(kind)).length).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('planner', () => {
  it('is deterministic for a seed and varies across seeds', () => {
    const pick = (seed: number) => {
      const cfg = config({ seed })
      const session = createSession({ id: 's', config: cfg, engine: { analyzerId: 'x' }, now: 'n' })
      return selectQuestion(session, session.rounds[0]!)!.spec.id
    }
    expect(pick(3)).toBe(pick(3))
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(pick)).size).toBeGreaterThan(1)
  })

  it('grounds questions in the job description and the resume', async () => {
    const { engine } = deterministicEngine()
    const context = buildContext({
      targetRole: 'Senior SRE',
      jd: 'Requirements:\n- Strong Terraform experience\n- Kubernetes in production',
      resume:
        '- Reduced deploy time by 60% by moving CI to GitHub Actions\n- Ran Kubernetes clusters for 40 services',
    })
    expect(context.jdRequirements.length).toBeGreaterThan(0)
    expect(context.resumeClaims.length).toBeGreaterThan(0)
    const cfg = config({
      context,
      rounds: [{ kind: 'technical', timeboxMinutes: 30, questionTarget: 3 }],
    })
    const session = await run(engine, cfg, () => STRONG_PROBES)
    const origins = session.rounds[0]!.threads.map((t) => t.origin)
    expect(origins[0]).toBe('jd')
    expect(origins).toContain('resume')
  })
})

describe('follow-ups', () => {
  it('probes a gap once, never repeats, and stays within the limit', async () => {
    const { engine } = deterministicEngine()
    const session = await run(
      engine,
      config(),
      () => 'Probes check health and I would configure them carefully in production.',
    )
    for (const thread of session.rounds[0]!.threads) {
      const followUps = thread.turns.filter((t) => t.kind === 'follow-up')
      expect(followUps.length).toBeLessThanOrEqual(thread.spec.maxFollowUps ?? 2)
      const keys = followUps.map((t) => `${t.probe}:${t.target}`)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('moves on from a candidate who has nothing more to say', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config())
    session = await engine.submitAnswer(session, { text: 'Not sure about that.' })
    const turn = currentTurn(openThread(activeRound(session)))
    expect(turn?.kind).toBe('follow-up')
    session = await engine.submitAnswer(session, { text: 'No idea.' })
    const first = session.rounds[0]!.threads[0]!
    expect(first.status).toBe('closed')
    expect(first.closeReason).toBe('moved-on')
  })

  it('does not ask a follow-up once the answer covers the question', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config({ seed: 1 }))
    const spec = openThread(activeRound(session))!.spec
    const text = spec.concepts.map((c) => `${c.summary}`).join(' ')
    session = await engine.submitAnswer(session, { text })
    expect(
      session.rounds[0]!.threads[0]!.turns.filter((t) => t.kind === 'follow-up').length,
    ).toBeLessThanOrEqual(1)
  })
})

describe('hidden scoring', () => {
  it('keeps scores out of the candidate view for the whole interview', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config())
    for (let i = 0; i < 6 && session.status === 'in-progress'; i++) {
      const json = JSON.stringify(redactForCandidate(session))
      expect(json).not.toMatch(/score|evaluation|concept|redFlag|rubric|intent|weak|confidence/i)
      session = await engine.submitAnswer(session, { text: STRONG_PROBES })
    }
    expect(session.status).toBe('completed')
    expect(session.evaluation?.overall).not.toBeNull()
  })

  it('stores an evaluation on every closed thread and a session evaluation only at the end', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config())
    expect(session.evaluation).toBeUndefined()
    session = await engine.submitAnswer(session, { text: STRONG_PROBES })
    for (const t of session.rounds[0]!.threads.filter((t) => t.status === 'closed'))
      expect(t.evaluation).toBeDefined()
    expect(session.status === 'in-progress' ? session.evaluation : 'done').toBeUndefined()
  })

  it('scores a knowledgeable answer above a vague one, and penalises a red flag', () => {
    const spec = questionBank.find((q) => q.id === 'tech-k8s-probes')!
    const strong = analyzeAnswerText(spec, STRONG_PROBES)
    const vague = analyzeAnswerText(
      spec,
      'Probes are used to check things and I set them up for every deployment.',
    )
    const wrong = analyzeAnswerText(
      spec,
      STRONG_PROBES + ' If the readiness probe fails the container is restarted.',
    )
    expect(strong.concepts.length).toBeGreaterThan(vague.concepts.length)
    expect(wrong.redFlags.length).toBeGreaterThan(0)
    expect(strong.redFlags.length).toBe(0)
  })

  it('ranks sessions by answer quality and never rates rule-based analysis as high confidence', async () => {
    const good = await run(deterministicEngine().engine, config({ seed: 5 }), () => STRONG_PROBES)
    const poor = await run(
      deterministicEngine().engine,
      config({ seed: 5 }),
      () => 'It depends, I would check the logs.',
    )
    expect(good.evaluation!.overall!).toBeGreaterThan(poor.evaluation!.overall!)
    expect(good.evaluation!.basis).toBe('rule-based')
    expect(good.evaluation!.confidence).not.toBe('high')
  })

  it('is reproducible: the same seed and answers give the same questions and score', async () => {
    const a = await run(deterministicEngine().engine, config({ seed: 9 }), () => STRONG_PROBES)
    const b = await run(deterministicEngine().engine, config({ seed: 9 }), () => STRONG_PROBES)
    expect(a.rounds[0]!.threads.map((t) => t.spec.id)).toEqual(
      b.rounds[0]!.threads.map((t) => t.spec.id),
    )
    expect(a.evaluation!.overall).toBe(b.evaluation!.overall)
  })
})

describe('rounds and modes', () => {
  it('walks through every round of an interview-day plan and completes', async () => {
    const { engine } = deterministicEngine()
    const cfg = config({ mode: 'interview-day', rounds: planRounds('interview-day') })
    const session = await run(engine, cfg, () => STRONG_PROBES)
    expect(session.status).toBe('completed')
    expect(session.rounds.every((r) => r.status === 'completed')).toBe(true)
    expect(session.evaluation!.rounds).toHaveLength(6)
  })

  it('ending a round scores what was said and drops the unanswered question', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config({ rounds: planRounds('emergency').slice(0, 2) }))
    session = await engine.submitAnswer(session, { text: STRONG_PROBES })
    session = await engine.endRound(session)
    const first = session.rounds[0]!
    expect(first.status).toBe('completed')
    expect(first.threads.every((t) => t.status === 'closed')).toBe(true)
    expect(first.threads.every((t) => t.turns.every((turn) => turn.answer))).toBe(true)
  })

  it('ending the interview early still produces an evaluation', async () => {
    const { engine } = deterministicEngine()
    let session = await engine.start(config())
    session = await engine.submitAnswer(session, { text: STRONG_PROBES })
    session = await engine.endInterview(session)
    expect(session.status).toBe('completed')
    expect(session.evaluation).toBeDefined()
  })
})

describe('replay and persistence', () => {
  it('replays question, answer, follow-up, answer, evaluation and score only after completion', async () => {
    const { engine, repository } = deterministicEngine()
    let session = await engine.start(config())
    expect(buildReplay(session)).toBeNull()
    session = await run(
      engine,
      config(),
      () => 'Probes check health and I would configure them carefully.',
    )
    const replay = buildReplay(session)!
    expect(replay.length).toBeGreaterThan(0)
    const withFollowUp = replay.find((t) => t.exchanges.some((e) => e.kind === 'follow-up'))!
    expect(withFollowUp.exchanges[0]!.kind).toBe('question')
    expect(withFollowUp.exchanges.every((e) => e.answer !== undefined)).toBe(true)
    expect(withFollowUp.evaluation?.score).toBeTypeOf('number')
    const stored = await repository.load(session.id)
    expect(stored).not.toBeNull()
    expect(await repository.list()).toHaveLength(2)
  })

  it('derives focus topics from completed sessions only', async () => {
    const { engine } = deterministicEngine()
    const done = await run(engine, config(), () => 'I am not sure.')
    const open: InterviewSession = { ...done, status: 'in-progress' }
    expect(weakTopicsFrom([open])).toEqual([])
    expect(weakTopicsFrom([done]).length).toBeGreaterThan(0)
  })

  it('stores every answer verbatim with its evidence', async () => {
    const { engine } = deterministicEngine()
    const session = await run(engine, config(), () => STRONG_PROBES)
    for (const thread of session.rounds[0]!.threads) {
      for (const turn of thread.turns) {
        expect(turn.answer?.text).toBe(STRONG_PROBES)
        expect(turn.evidence).toBeDefined()
      }
    }
  })
})

describe('LLM provider abstraction', () => {
  const spec = questionBank.find((q) => q.id === 'tech-k8s-probes')!
  const request = { spec, prompt: spec.prompt, answer: STRONG_PROBES }

  it('accepts verified evidence and drops fabricated quotes and unknown ids', () => {
    const ok = parseAnalysis(
      JSON.stringify({
        concepts: [
          {
            conceptId: 'readiness-traffic',
            strength: 'explained',
            quote: 'removed from the service endpoints',
          },
          {
            conceptId: 'liveness-restart',
            strength: 'explained',
            quote: 'this sentence is not in the answer',
          },
          { conceptId: 'nonexistent', strength: 'named', quote: 'liveness probe' },
        ],
        signals: [],
        redFlags: [],
      }),
      request,
      'llm:stub',
    )
    expect(ok.concepts.map((c) => c.conceptId)).toEqual(['readiness-traffic'])
    expect(ok.basis).toBe('llm-assisted')
  })

  it('rejects any model output that tries to score', () => {
    expect(() =>
      parseAnalysis(
        JSON.stringify({ concepts: [], signals: [], redFlags: [], score: 90 }),
        request,
        'llm:stub',
      ),
    ).toThrow()
  })

  it('falls back to the rule-based baseline and says why when the provider fails', async () => {
    const provider = scriptedProvider(() => new Error('connection refused'))
    const analyzer = new ResilientAnalyzer(new LlmAnswerAnalyzer(provider))
    const evidence = await analyzer.analyze(request)
    expect(evidence.basis).toBe('rule-based')
    expect(evidence.fallbackReason).toContain('connection refused')
    expect(evidence.concepts.length).toBeGreaterThan(0)
  })

  it('runs a full interview through a stub provider and records its id', async () => {
    const provider = scriptedProvider((req) =>
      req.purpose === 'interview.analyze-answer'
        ? JSON.stringify({ concepts: [], signals: [], redFlags: [] })
        : 'Walk me through how you would handle that in production?',
    )
    const { engine } = engineFor(provider)
    const session = await run(engine, config(), () => STRONG_PROBES)
    expect(session.status).toBe('completed')
    expect(session.engine.llmProviderId).toBe('stub')
    expect(session.rounds[0]!.threads[0]!.turns[0]!.phrasedBy).toBe('llm:stub')
  })

  it('refuses voice wording that evaluates the candidate or leaks an uncovered concept', () => {
    const base = {
      kind: 'follow-up' as const,
      authored: 'How does Kubernetes decide whether a pod should receive traffic?',
      spec,
      transcript: [],
      forbiddenTerms: ['readiness', 'kubelet'],
    }
    expect(() => validateVoice('Great answer, what about the kubelet?', base)).toThrow()
    expect(() => validateVoice('What does the kubelet do here?', base)).toThrow()
    expect(validateVoice('How does the cluster decide a pod gets traffic?', base)).toContain(
      'traffic',
    )
  })

  it('falls back to authored wording when the voice provider fails', async () => {
    const provider = scriptedProvider(() => new Error('offline'))
    const { engine } = engineFor(provider)
    const session = await engine.start(config())
    const turn = session.rounds[0]!.threads[0]!.turns[0]!
    expect(turn.prompt).toBe(turn.authoredPrompt)
    expect(turn.phrasedBy).toBeUndefined()
    void LlmInterviewerVoice
  })
})
