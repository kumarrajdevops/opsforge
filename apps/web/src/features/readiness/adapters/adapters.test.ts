import type {
  ArchitectureVersion,
  IncidentSession,
  InterviewSession,
  ResumeRecord,
  Scenario,
  SessionEvent,
  ThreadEvaluation,
} from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { getScenario } from '../../incident-simulator/scenarios'
import { matchCommand } from '../../incident-simulator/engine'
import { architectureEvidence } from './architecture'
import { drillEvidence } from './drills'
import { incidentEvidence } from './incidents'
import { interviewEvidence } from './interviews'

const AT = '2026-06-20T10:00:00.000Z'

function evaluation(overrides: Partial<ThreadEvaluation> = {}): ThreadEvaluation {
  return {
    scoringVersion: 'test',
    basis: 'rule-based',
    score: 70,
    dimensions: [
      { id: 'technical-accuracy', score: 80, note: '' },
      { id: 'depth', score: 60, note: '' },
      { id: 'communication', score: 70, note: '' },
      { id: 'structure', score: 50, note: '' },
      { id: 'confidence', score: 40, note: '' },
      { id: 'follow-up-handling', score: 60, note: '' },
      { id: 'architecture-thinking', score: null, note: '' },
    ],
    concepts: [
      { label: 'state locking', required: true, status: 'missed' },
      { label: 'remote backend', required: true, status: 'explained' },
    ],
    redFlags: [{ label: 'Claims apply is idempotent without a plan' }],
    signals: [],
    followUps: [],
    ...overrides,
  } as unknown as ThreadEvaluation
}

function thread(
  id: string,
  topic: string,
  ev: ThreadEvaluation | null,
  closeReason: string | null = null,
) {
  return {
    id,
    spec: { topic, technologies: ['terraform'] },
    turns: [{ answer: { submittedAt: AT, skipped: false } }],
    closeReason,
    evaluation: ev,
  }
}

function interview(threads: ReturnType<typeof thread>[]): InterviewSession {
  return {
    id: 's1',
    startedAt: AT,
    status: 'complete',
    rounds: [{ threads }],
  } as unknown as InterviewSession
}

describe('interview adapter', () => {
  const items = interviewEvidence([interview([thread('t1', 'Terraform state', evaluation())])])
  const byFactor = (f: string) => items.find((i) => i.factor === f)

  it('turns one scored thread into evidence for several factors', () => {
    expect(byFactor('interviews')?.score).toBe(70)
    expect(byFactor('communication')?.score).toBeCloseTo(60, 5)
    expect(new Set(items.map((i) => i.attemptId)).size).toBe(1)
  })

  it('keeps knowledge and confidence on disjoint signals', () => {
    expect(byFactor('knowledge')?.score).toBe(70)
    expect(byFactor('confidence')?.score).toBe(50)
  })

  it('omits factors with no signal rather than scoring zero', () => {
    expect(byFactor('architecture')).toBeUndefined()
  })

  it('carries gaps into the evidence', () => {
    const gaps = byFactor('knowledge')?.gaps ?? []
    expect(gaps.some((g) => g.includes('state locking'))).toBe(true)
    expect(gaps.some((g) => g.includes('idempotent'))).toBe(true)
  })

  it('skips unscored and skipped threads', () => {
    const none = interviewEvidence([
      interview([thread('t2', 'x', null), thread('t3', 'y', evaluation(), 'skipped')]),
    ])
    expect(none).toEqual([])
  })

  it('passes the analysis basis through', () => {
    const llm = interviewEvidence([
      interview([
        thread('t4', 'x', evaluation({ basis: 'llm-assisted' } as Partial<ThreadEvaluation>)),
      ]),
    ])
    expect(llm.every((i) => i.basis === 'llm-assisted')).toBe(true)
  })

  it('counts security questions toward security', () => {
    const sec = interviewEvidence([
      interview([thread('t5', 'IAM least privilege and secrets', evaluation())]),
    ])
    expect(sec.some((i) => i.factor === 'security')).toBe(true)
  })
})

describe('resume drill adapter', () => {
  const resume = {
    claims: [{ id: 'c1', technologies: ['kubernetes'], context: 'Ran clusters' }],
    attempts: [
      {
        id: 'a1',
        claimId: 'c1',
        category: 'incidents',
        answer: 'We rolled back.',
        answeredAt: AT,
        evaluation: evaluation(),
      },
      {
        id: 'a2',
        claimId: 'c1',
        category: 'security',
        answer: '   ',
        answeredAt: AT,
        evaluation: evaluation(),
      },
      {
        id: 'a3',
        claimId: 'c1',
        category: 'depth',
        answer: 'ok',
        answeredAt: AT,
        evaluation: null,
      },
    ],
  } as unknown as ResumeRecord

  it('returns nothing without a resume', () => {
    expect(drillEvidence(null)).toEqual([])
  })

  it('counts only answered, scored drills', () => {
    const items = drillEvidence(resume)
    expect(new Set(items.map((i) => i.attemptId))).toEqual(new Set(['drill:a1']))
  })

  it('maps an incidents drill to incidents at reduced reliability', () => {
    const items = drillEvidence(resume)
    const incident = items.find((i) => i.factor === 'incidents')
    expect(incident?.reliability).toBe(0.7)
    expect(items.some((i) => i.factor === 'questions')).toBe(true)
  })

  it('does not count a resume claim without a drill as evidence', () => {
    const undrilled = { ...resume, attempts: [] } as unknown as ResumeRecord
    expect(drillEvidence(undrilled)).toEqual([])
  })
})

describe('incident adapter', () => {
  const scenario = getScenario('leaked-aws-key')!
  let clock = 0
  const command = (input: string): SessionEvent => ({
    at: (clock += 20),
    type: 'command',
    input,
    commandId: matchCommand(scenario, input)?.id ?? null,
  })

  it('ignores a session with no activity', () => {
    const session: IncidentSession = {
      scenarioId: scenario.id,
      startedAt: AT,
      elapsedSeconds: 0,
      events: [],
    }
    expect(incidentEvidence([{ scenario, session }])).toEqual([])
  })

  it('scores a started session through the deterministic evaluator only', () => {
    clock = 0
    const session: IncidentSession = {
      scenarioId: scenario.id,
      startedAt: AT,
      elapsedSeconds: 200,
      events: [
        { at: 0, type: 'start' },
        command('aws iam list-users'),
        command('aws sts get-caller-identity'),
      ],
    }
    const items = incidentEvidence([{ scenario, session }])
    for (const item of items) {
      expect(item.basis).toBe('deterministic')
      expect(item.origin).toBe('incident')
      expect(item.reliability).toBe(0.5)
    }
    expect(items.length).toBeGreaterThan(0)
    expect(items.some((i) => i.factor === 'incidents')).toBe(true)
    expect(items.some((i) => i.factor === 'security')).toBe(true)
  })
})

describe('architecture adapter', () => {
  const scenario = { id: 'web-app', title: 'Web app on AWS' } as Scenario
  const version = (overall: number | null, security: number | null = 40): ArchitectureVersion =>
    ({
      id: 'v',
      scenarioId: scenario.id,
      number: 3,
      createdAt: AT,
      summary: {
        evaluatorVersion: 'x',
        overall,
        dimensions: { security },
        criticalFailures: 2,
      },
    }) as unknown as ArchitectureVersion

  it('turns a reviewed design into architecture and security evidence', () => {
    const items = architectureEvidence([{ scenario, version: version(64) }])
    expect(items.find((i) => i.factor === 'architecture')?.score).toBe(64)
    expect(items.find((i) => i.factor === 'security')?.score).toBe(40)
    expect(items[0]?.attemptId).toBe('architecture:web-app:v3')
  })

  it('names critical failures and weak dimensions as gaps', () => {
    const items = architectureEvidence([{ scenario, version: version(64) }])
    const gaps = items[0]?.gaps ?? []
    expect(gaps.some((g) => g.includes('2 critical'))).toBe(true)
    expect(gaps.some((g) => g.includes('security'))).toBe(true)
  })

  it('skips an unscored design', () => {
    expect(architectureEvidence([{ scenario, version: version(null) }])).toEqual([])
  })
})
