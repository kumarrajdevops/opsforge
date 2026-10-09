import { describe, expect, it } from 'vitest'
import type {
  EvidenceItem,
  InterviewSession,
  JdComparison,
  QuestionThread,
  ResumeRecord,
} from '@opsforge/types'
import { analyzeJd } from '../jd/analyze'
import { buildLearningPath, buildPreparationPlan } from '../jd/plan'
import { LocalStorageJdRepository } from '../jd/repository'
import { buildResumeRecord } from '../resume/claims'
import { collectEvidence } from './collect'
import { adjacentTo, compareJd } from './compare'

const NOW = '2026-01-01T00:00:00.000Z'

function thread(
  id: string,
  technologies: string[],
  score: number,
  extra: Partial<QuestionThread> = {},
) {
  return {
    id,
    roundId: 'r1',
    spec: { id, topic: 'Topic', technologies },
    origin: 'bank',
    status: 'closed',
    closeReason: 'covered',
    turns: [{ id: 't', answer: { text: 'a real answer', submittedAt: NOW, skipped: false } }],
    evaluation: { score },
    ...extra,
  } as unknown as QuestionThread
}

function session(threads: QuestionThread[]): InterviewSession {
  return {
    id: 's1',
    startedAt: NOW,
    rounds: [{ id: 'r1', threads }],
  } as unknown as InterviewSession
}

const RESUME: ResumeRecord = buildResumeRecord({
  id: 'r',
  text: 'EXPERIENCE\n- Implemented Kubernetes clusters for 40 services\n- Wrote Terraform modules for AWS networking\n',
  format: 'paste',
  now: NOW,
})

describe('collectEvidence', () => {
  it('counts only answered, scored, non-skipped interview threads as tested', () => {
    const evidence = collectEvidence({
      sessions: [
        session([
          thread('a', ['k8s'], 80),
          thread('b', ['kubernetes'], 60, { closeReason: 'skipped' }),
          thread('c', ['kubernetes'], 60, { turns: [] }),
          thread('d', ['kubernetes'], 60, { evaluation: undefined }),
        ]),
      ],
      resume: null,
    })
    expect(evidence).toHaveLength(1)
    expect(evidence[0]).toMatchObject({
      technology: 'kubernetes',
      strength: 'tested',
      score: 80,
      source: 'interview',
    })
  })

  it('marks resume claims as claimed and drill answers as tested', () => {
    const claim = RESUME.claims.find((c) => c.technologies.includes('kubernetes'))!
    const withDrill: ResumeRecord = {
      ...RESUME,
      attempts: [
        {
          id: 'at1',
          claimId: claim.id,
          category: 'security',
          questionId: `${claim.id}:security`,
          answer: 'RBAC and network policies',
          answeredAt: NOW,
          analyzerId: 'rule-based',
          evaluation: {
            scoringVersion: 'x',
            basis: 'rule-based',
            score: 72,
            dimensions: [],
            concepts: [],
            redFlags: [],
            signals: [],
            followUps: { asked: 0, productive: 0 },
          },
        },
        {
          id: 'at2',
          claimId: claim.id,
          answer: '   ',
          evaluation: { score: 99 },
        } as unknown as ResumeRecord['attempts'][number],
      ],
    }
    const evidence = collectEvidence({ sessions: [], resume: withDrill })
    expect(evidence.filter((e) => e.strength === 'claimed').length).toBeGreaterThan(0)
    const tested = evidence.filter((e) => e.strength === 'tested')
    expect(tested).toHaveLength(claim.technologies.length)
    expect(tested.every((e) => e.source === 'drill' && e.score === 72)).toBe(true)
  })

  it('is empty with nothing on file', () => {
    expect(collectEvidence({ sessions: [], resume: null })).toEqual([])
  })
})

const JD = analyzeJd({
  id: 'j',
  now: NOW,
  text: `Senior SRE

Requirements
- Strong Kubernetes and Terraform experience
- Hands-on AWS
- Experience with on-call rotations

Nice to have
- Familiarity with Vault
`,
})

const tested = (technology: string, score: number, n: number): EvidenceItem[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${technology}-${i}`,
    technology,
    source: 'interview',
    strength: 'tested',
    score,
    label: 'x',
    at: NOW,
    adjacent: false,
  }))

const claimed = (technology: string): EvidenceItem => ({
  id: `c-${technology}`,
  technology,
  source: 'resume',
  strength: 'claimed',
  score: null,
  label: 'x',
  at: NOW,
  adjacent: false,
})

const status = (c: JdComparison, id: string) => c.assessments.find((a) => a.id === id)?.status

describe('compareJd', () => {
  it('needs two strong tested answers to demonstrate', () => {
    expect(status(compareJd(JD, tested('kubernetes', 80, 2)), 'tech:kubernetes')).toBe(
      'demonstrated',
    )
    expect(status(compareJd(JD, tested('kubernetes', 90, 1)), 'tech:kubernetes')).toBe('partial')
  })

  it('separates partial, weak, claimed and absent', () => {
    const c = compareJd(JD, [
      ...tested('kubernetes', 60, 2),
      ...tested('terraform', 30, 2),
      claimed('aws'),
    ])
    expect(status(c, 'tech:kubernetes')).toBe('partial')
    expect(status(c, 'tech:terraform')).toBe('weak')
    expect(status(c, 'tech:aws')).toBe('claimed-untested')
    expect(status(c, 'tech:vault')).toBe('no-evidence')
  })

  it('lets a tested answer override a claim, and never calls a claim demonstrated', () => {
    const c = compareJd(JD, [claimed('kubernetes'), ...tested('kubernetes', 85, 2)])
    expect(status(c, 'tech:kubernetes')).toBe('demonstrated')
    expect(status(compareJd(JD, [claimed('kubernetes')]), 'tech:kubernetes')).toBe(
      'claimed-untested',
    )
  })

  it('credits strong adjacent evidence as partial only', () => {
    const adjacent = adjacentTo('kubernetes')[0]!
    const c = compareJd(JD, tested(adjacent, 80, 2))
    expect(status(c, 'tech:kubernetes')).toBe('partial')
    expect(
      c.assessments.find((a) => a.id === 'tech:kubernetes')?.evidence.every((e) => e.adjacent),
    ).toBe(true)
  })

  it('does not list the same interview as both direct and adjacent evidence', () => {
    const adjacent = adjacentTo('kubernetes')[0]!
    const same = { source: 'interview', label: 'Interview 1', at: NOW } as const
    const c = compareJd(JD, [
      { ...tested('kubernetes', 80, 1)[0]!, ...same },
      { ...tested(adjacent, 80, 1)[0]!, ...same },
    ])
    const k = c.assessments.find((a) => a.id === 'tech:kubernetes')
    expect(k?.evidence).toHaveLength(1)
    expect(k?.evidence[0]?.adjacent).toBe(false)
  })

  it('does not score skills that nothing measures', () => {
    const unmeasured = analyzeJd({
      id: 'j',
      now: NOW,
      text: 'Requirements\n- Excellent written communication\n',
    })
    const c = compareJd(unmeasured, [])
    const skill = c.assessments.find((a) => a.kind === 'skill' && a.technologies.length === 0)
    if (skill) expect(skill.status).toBe('no-evidence')
    expect(c.requiredCoverage).toBe(0)
  })

  it('computes required coverage from measurable requirements', () => {
    const c = compareJd(JD, [...tested('kubernetes', 80, 2), ...tested('terraform', 55, 2)])
    expect(c.requiredDemonstrated).toBeGreaterThan(0)
    expect(c.requiredCoverage).toBeGreaterThanOrEqual(c.requiredDemonstrated)
  })
})

describe('buildPreparationPlan', () => {
  const comparison = compareJd(JD, [...tested('kubernetes', 85, 2), claimed('terraform')])
  const plan = buildPreparationPlan({ comparison, claims: RESUME.claims, now: NOW })

  it('omits demonstrated requirements and orders by urgency', () => {
    expect(plan.items.find((i) => i.requirementId === 'tech:kubernetes')).toBeUndefined()
    const urgencies = plan.items.map((i) => i.urgency)
    expect(urgencies).toEqual([...urgencies].sort((a, b) => b - a))
    const ids = plan.items.map((i) => i.requirementId)
    expect(ids.indexOf('tech:aws')).toBeLessThan(ids.indexOf('tech:vault'))
  })

  it('weights required gaps above preferred ones at equal severity', () => {
    const aws = plan.items.find((i) => i.requirementId === 'tech:aws')!
    const vault = plan.items.find((i) => i.requirementId === 'tech:vault')!
    expect(aws.urgency).toBeGreaterThan(vault.urgency)
  })

  it('points claimed technologies to the resume drill', () => {
    const tf = plan.items.find((i) => i.requirementId === 'tech:terraform')!
    expect(tf.actions[0]?.kind).toBe('defend-claim')
    expect(tf.actions[0]?.path).toBe('/resume')
  })

  it('only links routes that exist', () => {
    const allowed = new Set([undefined, '/resume', '/interviewer', '/incidents', '/architecture'])
    for (const item of plan.items)
      for (const a of item.actions) expect(allowed.has(a.path)).toBe(true)
  })

  it('schedules within the daily budget and lists what did not fit', () => {
    for (const day of plan.schedule) expect(day.minutes).toBeLessThanOrEqual(plan.minutesPerDay)
    const tight = buildPreparationPlan({
      comparison,
      claims: RESUME.claims,
      now: NOW,
      days: 1,
      minutesPerDay: 20,
    })
    expect(tight.schedule).toHaveLength(1)
    expect(tight.unscheduled.length).toBeGreaterThan(0)
  })

  it('keeps an item’s actions in order across days', () => {
    const order = new Map<string, number>()
    plan.schedule.forEach((day) =>
      day.slots.forEach((slot, i) => {
        const key = `${slot.itemId}`
        const prev = order.get(key) ?? -1
        expect(day.day * 100 + i).toBeGreaterThan(prev)
        order.set(key, day.day * 100 + i)
      }),
    )
  })

  it('is empty when everything is demonstrated', () => {
    const all = compareJd(JD, [
      ...['kubernetes', 'terraform', 'aws', 'vault', 'sre'].flatMap((t) => tested(t, 90, 2)),
    ])
    const p = buildPreparationPlan({ comparison: all, claims: [], now: NOW })
    expect(p.items.every((i) => i.status !== 'demonstrated')).toBe(true)
  })
})

describe('LocalStorageJdRepository', () => {
  it('round-trips and rejects corrupt data', async () => {
    const data = new Map<string, string>()
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }
    const repo = new LocalStorageJdRepository(store)
    expect(await repo.load()).toBeNull()
    await repo.save(JD)
    expect((await new LocalStorageJdRepository(store).load())?.technologies).toHaveLength(
      JD.technologies.length,
    )
    data.set('opsforge.jd.current', '{"x":1}')
    expect(await new LocalStorageJdRepository(store).load()).toBeNull()
    await repo.clear()
    expect(data.size).toBe(0)
  })
})

describe('alternative groups', () => {
  const cloud = analyzeJd({
    id: 'c',
    now: NOW,
    text: 'Requirements\n- Hands-on experience with at least one of AWS, Azure or GCP\n- Strong Kubernetes experience\n',
  })
  const groupOf = (c: JdComparison) => c.assessments.find((a) => a.kind === 'alternative')

  it('assesses the group once, at its best-placed option', () => {
    const c = compareJd(cloud, [...tested('aws', 85, 2), claimed('azure')])
    expect(c.assessments.filter((a) => a.id === 'tech:aws' || a.id === 'tech:azure')).toHaveLength(
      0,
    )
    const group = groupOf(c)
    expect(group?.status).toBe('demonstrated')
    expect(group?.technologies).toEqual(['aws'])
    expect(group?.options?.map((o) => [o.technology, o.status])).toEqual([
      ['aws', 'demonstrated'],
      ['azure', 'claimed-untested'],
      ['gcp', 'partial'],
    ])
  })

  it('counts a satisfied group as one required item in coverage', () => {
    const c = compareJd(cloud, tested('azure', 85, 2))
    expect(groupOf(c)?.status).toBe('demonstrated')
    expect(c.requiredDemonstrated).toBe(50)
  })

  it('falls back to the first option when nothing is known about any', () => {
    const group = groupOf(compareJd(cloud, []))
    expect(group?.status).toBe('no-evidence')
    expect(group?.technologies).toEqual(['aws'])
  })

  it('still reads analyses saved before alternatives existed', () => {
    const legacy = { ...cloud, alternatives: undefined }
    expect(() => compareJd(legacy, [])).not.toThrow()
  })
})

describe('buildLearningPath', () => {
  const jd = analyzeJd({
    id: 'p',
    now: NOW,
    text: 'Requirements\n- Strong Kubernetes experience\n- Terraform experience\n- Prometheus experience\n\nNice to have\n- Familiarity with Vault\n',
  })
  const plan = buildPreparationPlan({
    comparison: compareJd(jd, [
      ...tested('kubernetes', 60, 2),
      ...tested('prometheus', 30, 2),
      claimed('terraform'),
    ]),
    claims: [],
    now: NOW,
  })

  it('orders phases: gaps, claims, partials, then preferred', () => {
    expect(buildLearningPath(plan).map((p) => p.id)).toEqual([
      'gaps',
      'evidence',
      'strengthen',
      'preferred',
    ])
  })

  it('puts each item in exactly one phase and totals the minutes', () => {
    const phases = buildLearningPath(plan)
    expect(phases.flatMap((p) => p.items)).toHaveLength(plan.items.length)
    for (const phase of phases) {
      expect(phase.minutes).toBe(
        phase.items.reduce((n, i) => n + i.actions.reduce((m, a) => m + a.minutes, 0), 0),
      )
    }
  })
})
