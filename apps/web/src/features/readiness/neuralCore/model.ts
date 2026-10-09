import type { EvidenceConfidence, ReadinessReport } from '@opsforge/types'
import type { Tone } from '@opsforge/ui'
import type { Vec3 } from '../../../visuals/graphTypes'
import { bandLabel, bandTone, confidenceLabel, formatScore } from '../presentation'

export interface CoreNode {
  id: string
  label: string
  position: Vec3
  /** Node radius grows with the score. */
  radius: number
  /** Radius of the ghost shell that marks the target. */
  targetRadius: number
  tone: Tone
  /** 0..1. Spoke opacity follows how much evidence backs the score. */
  confidence: number
  score: number | null
  hasEvidence: boolean
}

export interface NeuralCoreModel {
  core: { tone: Tone; score: number | null; radius: number }
  nodes: CoreNode[]
  orbitRadius: number
}

export interface CoreRow {
  id: string
  factor: string
  score: string
  target: number
  gap: string
  band: string
  confidence: string
}

const ORBIT = 2.3
const MIN_RADIUS = 0.1
const MAX_RADIUS = 0.34
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

const CONFIDENCE: Record<EvidenceConfidence, number> = {
  none: 0.18,
  low: 0.4,
  medium: 0.7,
  high: 1,
}

const radiusFor = (score: number) => MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (score / 100)

/** Even spread of `count` points on a sphere (Fibonacci lattice). Deterministic. */
export function spherePoints(count: number, radius: number): Vec3[] {
  return Array.from({ length: count }, (_, i) => {
    const y = count === 1 ? 0 : 1 - (i / (count - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const angle = i * GOLDEN_ANGLE
    return [Math.cos(angle) * ring * radius, y * radius, Math.sin(angle) * ring * radius] as const
  })
}

/**
 * Turns a readiness report into geometry. It only reads the report: scores, bands and targets are
 * the engine's. Position is layout, size is the score, the ghost shell is the target, and spoke
 * opacity is evidence confidence.
 */
export function buildNeuralCoreModel(report: ReadinessReport): NeuralCoreModel {
  const points = spherePoints(report.factors.length, ORBIT)
  const overall = report.overall
  return {
    core: {
      tone: overall.band ? bandTone[overall.band] : 'neutral',
      score: overall.score,
      radius: 0.55 + 0.25 * ((overall.score ?? 0) / 100),
    },
    orbitRadius: ORBIT,
    nodes: report.factors.map((factor, i) => ({
      id: factor.id,
      label: factor.label,
      position: points[i] ?? [0, 0, 0],
      radius: factor.score === null ? MIN_RADIUS : radiusFor(factor.score),
      targetRadius: radiusFor(factor.target),
      tone: factor.band ? bandTone[factor.band] : 'neutral',
      confidence: CONFIDENCE[factor.evidenceConfidence],
      score: factor.score,
      hasEvidence: factor.score !== null,
    })),
  }
}

export function coreRows(report: ReadinessReport): CoreRow[] {
  return report.factors.map((factor) => ({
    id: factor.id,
    factor: factor.label,
    score: formatScore(factor.score),
    target: factor.target,
    gap: factor.score === null ? '—' : String(Math.round(factor.score - factor.target)),
    band: factor.band ? bandLabel[factor.band] : 'No evidence',
    confidence: confidenceLabel[factor.evidenceConfidence],
  }))
}

export function coreDescription(report: ReadinessReport): string {
  const scored = report.factors.filter((f) => f.score !== null)
  const below = scored.filter((f) => f.score !== null && f.score < f.target)
  const overall =
    report.overall.score === null
      ? 'no overall score yet'
      : `overall ${formatScore(report.overall.score)}`
  return `Neural core of ${report.factors.length} readiness factors around a central ${overall}. ${scored.length} have evidence and ${below.length} are below target. Node size is the score, the faint shell is the target.`
}
