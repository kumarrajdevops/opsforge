import type {
  EvidenceOrigin,
  ReadinessEvidence,
  ReadinessFactorId,
  ReadinessReport,
} from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { FACTOR_ORDER } from './config'
import { buildReadinessReport } from './engine'

const NOW = new Date('2026-06-30T12:00:00Z')

let counter = 0
function ev(
  factor: ReadinessFactorId,
  score: number,
  daysAgo = 0,
  extra: Partial<ReadinessEvidence> = {},
): ReadinessEvidence {
  counter += 1
  const at = new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString()
  const attemptId = extra.attemptId ?? `attempt-${counter}`
  return {
    id: `${attemptId}:${factor}`,
    attemptId,
    origin: 'interview',
    factor,
    score,
    at,
    label: `Item ${counter}`,
    basis: 'deterministic',
    ...extra,
  }
}

const report = (items: ReadinessEvidence[]): ReadinessReport =>
  buildReadinessReport(items, { now: NOW })

const factorOf = (r: ReadinessReport, id: ReadinessFactorId) => r.factors.find((f) => f.id === id)!

/** A broad, strong, multi-module, multi-day body of evidence. */
function strongEvidence(
  score: number,
  factors = FACTOR_ORDER,
  perFactor = 12,
): ReadinessEvidence[] {
  const origins: EvidenceOrigin[] = ['interview', 'resume-drill', 'incident', 'architecture', 'lab']
  const items: ReadinessEvidence[] = []
  let i = 0
  for (const factor of factors) {
    for (let n = 0; n < perFactor; n += 1) {
      i += 1
      items.push(ev(factor, score, n % 10, { origin: origins[i % origins.length] }))
    }
  }
  return items
}

describe('no evidence', () => {
  it('has no score, level 1, and no factor shown as zero', () => {
    const r = report([])
    expect(r.overall.score).toBeNull()
    expect(r.level.value).toBe(1)
    expect(r.factors).toHaveLength(11)
    expect(r.factors.every((f) => f.score === null && f.band === null)).toBe(true)
    expect(r.overall.coverage).toBe(0)
  })

  it('still proposes a first action for every factor', () => {
    const r = report([])
    expect(r.nextActions.length).toBeGreaterThan(0)
    expect(factorOf(r, 'knowledge').nextAction.title).toBeTruthy()
  })
})

describe('level is earned by breadth, volume and time, not one result', () => {
  it('a single perfect attempt stays at level 1', () => {
    const r = report([ev('knowledge', 100), ev('interviews', 100, 0, { attemptId: 'x' })])
    expect(r.level.value).toBe(1)
  })

  it('many perfect results in one factor on one day stay low', () => {
    const items = Array.from({ length: 30 }, () => ev('questions', 100))
    const r = report(items)
    expect(r.level.value).toBeLessThan(3)
  })

  it('strong evidence across every factor over several days reaches a senior level', () => {
    const r = report(strongEvidence(86))
    expect(r.level.value).toBeGreaterThanOrEqual(4)
  })

  it('weak evidence across every factor does not pass level 2', () => {
    const r = report(strongEvidence(35))
    expect(r.level.value).toBeLessThanOrEqual(1)
  })

  it('exposes what the next level still needs', () => {
    const r = report([ev('knowledge', 70)])
    expect(r.level.next).not.toBeNull()
    expect(r.level.next!.checks.some((c) => !c.passed)).toBe(true)
  })

  it('has no input through which a level or score can be supplied', () => {
    const forged = { ...ev('knowledge', 50), level: 6, finalLevel: 6, overall: 100 }
    const r = report([forged as ReadinessEvidence])
    expect(r.level.value).toBe(1)
    expect(factorOf(r, 'knowledge').score).toBe(50)
  })
})

describe('knowledge and confidence are separate', () => {
  it('scores them independently', () => {
    const r = report([
      ...Array.from({ length: 4 }, () => ev('knowledge', 86)),
      ...Array.from({ length: 4 }, () => ev('confidence', 61)),
    ])
    expect(factorOf(r, 'knowledge').score).toBe(86)
    expect(factorOf(r, 'confidence').score).toBe(61)
  })

  it('flags high knowledge with low confidence as under-confident', () => {
    const r = report([
      ...Array.from({ length: 4 }, () => ev('knowledge', 86)),
      ...Array.from({ length: 4 }, () => ev('confidence', 61)),
    ])
    expect(r.calibration.pattern).toBe('under-confident')
    expect(r.calibration.gap).toBe(25)
    expect(r.calibration.guidance.toLowerCase()).toMatch(/verbal|spoken|aloud|interview/)
  })

  it('flags low knowledge with high confidence as possible overconfidence', () => {
    const r = report([
      ...Array.from({ length: 4 }, () => ev('knowledge', 58)),
      ...Array.from({ length: 4 }, () => ev('confidence', 89)),
    ])
    expect(r.calibration.pattern).toBe('over-confident')
    expect(r.calibration.guidance.toLowerCase()).toMatch(/hands-on|deeper/)
  })

  it('reports aligned when the two agree', () => {
    const r = report([
      ...Array.from({ length: 4 }, () => ev('knowledge', 72)),
      ...Array.from({ length: 4 }, () => ev('confidence', 70)),
    ])
    expect(r.calibration.pattern).toBe('aligned')
  })

  it('does not call a pattern from too little evidence', () => {
    const r = report([ev('knowledge', 90), ev('confidence', 40)])
    expect(r.calibration.pattern).toBe('insufficient')
  })
})

describe('explainability', () => {
  const r = report([
    ev('knowledge', 90, 1, { label: 'Strong answer', topic: 'Kubernetes' }),
    ev('knowledge', 40, 2, {
      label: 'Weak answer',
      topic: 'Terraform',
      gaps: ['Missed state locking'],
    }),
    ev('knowledge', 80, 20, { label: 'Older answer', topic: 'Kubernetes' }),
  ])
  const knowledge = factorOf(r, 'knowledge')

  it('lists contributing evidence whose shares sum to one and points sum to the score', () => {
    const share = knowledge.contributions.reduce((s, c) => s + c.share, 0)
    const points = knowledge.contributions.reduce((s, c) => s + c.points, 0)
    expect(share).toBeCloseTo(1, 2)
    expect(points).toBeCloseTo(knowledge.score!, 0)
  })

  it('orders contributions by share, largest first', () => {
    const shares = knowledge.contributions.map((c) => c.share)
    expect(shares).toEqual([...shares].sort((a, b) => b - a))
  })

  it('names weaknesses with the evidence behind them', () => {
    const weak = knowledge.weaknesses.find((w) => w.topic === 'Terraform')
    expect(weak).toBeDefined()
    expect(weak!.evidenceIds.length).toBeGreaterThan(0)
  })

  it('explains evidence confidence in words', () => {
    expect(knowledge.confidenceReason.length).toBeGreaterThan(10)
    expect(['low', 'medium', 'high']).toContain(knowledge.evidenceConfidence)
  })

  it('always carries a recommended next action', () => {
    expect(knowledge.nextAction.title).toBeTruthy()
    expect(knowledge.nextAction.why).toBeTruthy()
  })

  it('marks an action as unavailable when only unbuilt modules can help', () => {
    const labs = factorOf(report([]), 'labs')
    expect(labs.nextAction.available).toBe(false)
  })
})

describe('evidence confidence', () => {
  it('is low for a single observation and higher for broad, repeated evidence', () => {
    const one = factorOf(report([ev('knowledge', 80)]), 'knowledge')
    const many = factorOf(
      report(
        Array.from({ length: 10 }, (_, n) =>
          ev('knowledge', 80, n % 3, { origin: n % 2 ? 'interview' : 'resume-drill' }),
        ),
      ),
      'knowledge',
    )
    expect(one.evidenceConfidence).toBe('low')
    expect(many.evidenceConfidence).toBe('high')
  })

  it('counts one attempt that feeds several factors only once toward volume', () => {
    const items = ['knowledge', 'questions', 'communication', 'confidence'].map((f) =>
      ev(f as ReadinessFactorId, 90, 0, { attemptId: 'same' }),
    )
    const r = report(items)
    const attempts = r.level.gates[1]!.checks.find((c) => c.id === 'attempts')
    expect(attempts?.current).toMatch(/^1\b/)
  })
})

describe('recency and trend', () => {
  it('weights recent evidence above old evidence', () => {
    const r = report([ev('knowledge', 90, 0), ev('knowledge', 30, 90)])
    expect(factorOf(r, 'knowledge').score!).toBeGreaterThan(60)
  })

  it('detects an improving trend', () => {
    const r = report([
      ev('knowledge', 40, 12),
      ev('knowledge', 45, 10),
      ev('knowledge', 70, 3),
      ev('knowledge', 80, 1),
    ])
    expect(factorOf(r, 'knowledge').trend.direction).toBe('improving')
  })

  it('detects a declining trend', () => {
    const r = report([
      ev('knowledge', 85, 12),
      ev('knowledge', 80, 10),
      ev('knowledge', 50, 3),
      ev('knowledge', 40, 1),
    ])
    const trend = factorOf(r, 'knowledge').trend
    expect(trend.direction).toBe('declining')
    expect(trend.delta!).toBeLessThan(0)
  })

  it('says there is not enough history rather than guessing', () => {
    const r = report([ev('knowledge', 80, 0), ev('knowledge', 20, 0)])
    expect(factorOf(r, 'knowledge').trend.direction).toBe('insufficient')
  })
})

describe('integrity', () => {
  it('is deterministic for the same evidence and clock', () => {
    const items = strongEvidence(75, ['knowledge', 'architecture'], 5)
    expect(report(items)).toEqual(report(items))
  })

  it('ignores invalid and duplicate items', () => {
    const good = ev('knowledge', 70)
    const r = report([
      good,
      good,
      { ...good, id: 'bad', score: Number.NaN },
      { ...good, id: 'bad2', score: 250 },
    ])
    expect(r.evidenceCount).toBeLessThanOrEqual(2)
    expect(factorOf(r, 'knowledge').score).toBeLessThanOrEqual(100)
  })

  it('changes the fingerprint when evidence changes and keeps it when it does not', () => {
    const a = [ev('knowledge', 70)]
    expect(report(a).fingerprint).toBe(report(a).fingerprint)
    expect(report([...a, ev('knowledge', 60)]).fingerprint).not.toBe(report(a).fingerprint)
  })

  it('reports the versions that produced it', () => {
    const r = report([])
    expect(r.engineVersion).toMatch(/^\d+\.\d+\.\d+$/)
    expect(r.configVersion).toBeTruthy()
  })
})
