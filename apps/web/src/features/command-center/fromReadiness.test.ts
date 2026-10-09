import type { EvidenceOrigin, ReadinessEvidence, ReadinessFactorId } from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { buildReadinessReport } from '../readiness/engine'
import { buildCommandCenter } from './fromReadiness'

const NOW = new Date('2026-06-30T12:00:00Z')

function ev(
  factor: ReadinessFactorId,
  score: number,
  attempt: string,
  extra: Partial<ReadinessEvidence> = {},
  daysAgo = 1,
): ReadinessEvidence {
  return {
    id: `${attempt}:${factor}`,
    attemptId: attempt,
    origin: 'interview' satisfies EvidenceOrigin,
    factor,
    score,
    at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    label: `Item ${attempt}`,
    basis: 'deterministic',
    ...extra,
  }
}

function build(evidence: ReadinessEvidence[], total = 5) {
  const report = buildReadinessReport(evidence, { now: NOW })
  return {
    report,
    snapshot: buildCommandCenter({
      report,
      evidence,
      architectureScenarioTotal: total,
      now: NOW.getTime(),
    }),
  }
}

describe('buildCommandCenter', () => {
  it('takes the overall score, band, level and dimensions straight from the report', () => {
    const { report, snapshot } = build([
      ev('knowledge', 50, 'a'),
      ev('knowledge', 55, 'b'),
      ev('interviews', 80, 'c'),
    ])
    expect(snapshot.overall.score).toBe(Math.round(report.overall.score!))
    expect(snapshot.overall.band).toBe(report.overall.band)
    expect(snapshot.overall.level.value).toBe(report.level.value)
    expect(snapshot.overall.level.label).toBe(report.level.label)
    expect(snapshot.evidenceTotal).toBe(report.evidenceCount)
    expect(snapshot.dimensions.map((d) => d.id)).toEqual(report.factors.map((f) => f.id))
    for (const f of report.factors) {
      const d = snapshot.dimensions.find((x) => x.id === f.id)!
      expect(d.score).toBe(f.score === null ? null : Math.round(f.score))
      expect(d.band).toBe(f.band)
    }
  })

  it('keeps missing evidence null and never invents data', () => {
    const { snapshot } = build([])
    expect(snapshot.overall.score).toBeNull()
    expect(snapshot.overall.band).toBeNull()
    expect(snapshot.dimensions.every((d) => d.score === null)).toBe(true)
    expect(snapshot.failureRisks).toEqual([])
    expect(snapshot.skills).toEqual([])
    expect(snapshot.recentEvidence).toEqual([])
    expect(snapshot.recentIncidents).toEqual([])
    expect(snapshot.continueTraining).toEqual([])
    expect(snapshot.architecture).toEqual({
      scenariosCompleted: 0,
      scenariosTotal: 5,
      latest: null,
    })
  })

  it('ranks failure risks by gap to target and only for scored factors', () => {
    const { snapshot } = build([
      ev('knowledge', 30, 'a'),
      ev('knowledge', 35, 'b'),
      ev('security', 60, 'c'),
      ev('communication', 95, 'd'),
    ])
    const ids = snapshot.failureRisks.map((r) => r.dimension)
    expect(ids[0]).toBe('knowledge')
    expect(ids).toContain('security')
    expect(ids).not.toContain('communication')
    expect(ids).not.toContain('labs')
    expect(snapshot.failureRisks[0]!.likelihood).toBe('high')
  })

  it('builds the skill matrix by topic and mode, leaving unseen modes null', () => {
    const { snapshot } = build([
      ev('knowledge', 40, 'a', { topic: 'Kubernetes' }),
      ev('knowledge', 50, 'b', { topic: 'Kubernetes' }),
      ev('incidents', 70, 'c', { topic: 'Kubernetes', origin: 'incident' }),
      ev('knowledge', 90, 'd', { topic: 'Terraform' }),
      ev('knowledge', 85, 'e'),
    ])
    const k8s = snapshot.skills.find((s) => s.label === 'Kubernetes')!
    expect(k8s.evidenceCount).toBe(3)
    const cell = (mode: string) => k8s.cells.find((c) => c.mode === mode)!
    expect(cell('troubleshooting').score).toBe(70)
    expect(cell('hands-on').score).toBeNull()
    expect(cell('hands-on').band).toBeNull()
    expect(snapshot.skills.map((s) => s.label)).not.toContain('undefined')
    expect(snapshot.weakestSkills.map((s) => s.label)).toContain('Kubernetes')
    expect(snapshot.weakestSkills.map((s) => s.label)).not.toContain('Terraform')
  })

  it('derives the plan and next action from the report actions', () => {
    const { report, snapshot } = build([ev('knowledge', 40, 'a'), ev('knowledge', 45, 'b')])
    const top = report.nextActions[0]!
    expect(snapshot.nextAction?.title).toBe(top.title)
    expect(snapshot.nextAction?.module).toBe(top.module)
    expect(snapshot.plan.items[0]!.status).toBe('next')
    expect(snapshot.plan.items.slice(1).every((i) => i.status === 'todo')).toBe(true)
    expect(snapshot.plan.totalMinutes).toBe(snapshot.plan.items.reduce((n, i) => n + i.minutes, 0))
  })

  it('summarises incidents and the latest architecture review from their evidence', () => {
    const { snapshot } = build([
      ev('incidents', 80, 'i1', { origin: 'incident', topic: 'Payment outage' }, 2),
      ev('troubleshooting', 70, 'i1', { origin: 'incident', topic: 'Payment outage' }, 2),
      ev('architecture', 60, 'a1', { origin: 'architecture', topic: 'Multi-region API' }, 5),
      ev('architecture', 40, 'a2', {
        origin: 'architecture',
        topic: 'Event pipeline',
        gaps: ['No dead-letter queue'],
      }),
    ])
    expect(snapshot.recentIncidents).toHaveLength(1)
    expect(snapshot.recentIncidents[0]).toMatchObject({ title: 'Payment outage', score: 75 })
    expect(snapshot.recentIncidents[0]!.outcome).toBe('resolved')
    expect(snapshot.architecture.scenariosCompleted).toBe(2)
    expect(snapshot.architecture.latest?.title).toBe('Event pipeline')
    expect(snapshot.architecture.latest?.gaps).toEqual(['No dead-letter queue'])
  })

  it('shows each evidence item with its share of the factor and newest first', () => {
    const { snapshot } = build([
      ev('knowledge', 40, 'old', {}, 10),
      ev('knowledge', 90, 'new', {}, 1),
    ])
    expect(snapshot.recentEvidence.map((e) => e.id)).toEqual(['new:knowledge', 'old:knowledge'])
    const shares = snapshot.recentEvidence.reduce((n, e) => n + e.share, 0)
    expect(shares).toBeCloseTo(1, 2)
    expect(snapshot.recentEvidence[0]!.outcome).toBe('pass')
    expect(snapshot.recentEvidence[1]!.outcome).toBe('fail')
  })
})
