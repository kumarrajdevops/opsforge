import { describe, expect, it } from 'vitest'
import type { ReadinessReport } from '@opsforge/types'
import { buildNeuralCoreModel, coreDescription, coreRows, spherePoints } from './model'

function factor(
  id: string,
  score: number | null,
  target: number,
  confidence: 'none' | 'low' | 'medium' | 'high',
) {
  return {
    id,
    label: id,
    score,
    band: score === null ? null : score >= 80 ? 'strong' : score >= 50 ? 'developing' : 'weak',
    target,
    evidenceConfidence: confidence,
  }
}

const report = {
  overall: { score: 62, band: 'developing', coverage: 0.5, evidenceConfidence: 'medium' },
  factors: [
    factor('knowledge', 80, 70, 'high'),
    factor('incidents', 40, 70, 'low'),
    factor('security', null, 60, 'none'),
  ],
} as unknown as ReadinessReport

describe('neural core model', () => {
  it('spreads points evenly on the requested radius', () => {
    const points = spherePoints(12, 2)
    expect(points).toHaveLength(12)
    for (const [x, y, z] of points) expect(Math.hypot(x, y, z)).toBeCloseTo(2)
    expect(spherePoints(1, 2)[0]).toBeDefined()
    expect(spherePoints(0, 2)).toEqual([])
  })

  it('sizes nodes by score and marks missing evidence instead of inventing a score', () => {
    const model = buildNeuralCoreModel(report)
    const [knowledge, incidents, security] = model.nodes
    expect(knowledge!.radius).toBeGreaterThan(incidents!.radius)
    expect(security!.hasEvidence).toBe(false)
    expect(security!.score).toBeNull()
    expect(security!.tone).toBe('neutral')
    expect(security!.confidence).toBeLessThan(incidents!.confidence)
    expect(knowledge!.targetRadius).toBeGreaterThan(0)
  })

  it('takes the core tone from the engine band, not from its own thresholds', () => {
    expect(buildNeuralCoreModel(report).core.tone).toBe('warning')
  })

  it('mirrors the scene as table rows and a description', () => {
    const rows = coreRows(report)
    expect(rows.map((r) => r.gap)).toEqual(['10', '-30', '—'])
    expect(rows[2]!.band).toBe('No evidence')
    expect(coreDescription(report)).toContain('3 readiness factors')
    expect(coreDescription(report)).toContain('1 are below target')
  })
})
