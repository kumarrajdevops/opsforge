import type {
  AnalysisBasis,
  EvidenceBasis,
  EvidenceOrigin,
  InterviewDimensionId,
  ReadinessEvidence,
  ReadinessFactorId,
  ThreadEvaluation,
} from '@opsforge/types'
import { findTechnology } from '../../technologies/catalog'

export function mean(values: (number | null | undefined)[]): number | null {
  const present = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0) / present.length
}

export function dimensionMean(
  evaluation: ThreadEvaluation,
  ids: InterviewDimensionId[],
): number | null {
  return mean(evaluation.dimensions.filter((d) => ids.includes(d.id)).map((d) => d.score))
}

export function basisOf(basis: AnalysisBasis | 'mixed'): EvidenceBasis {
  return basis
}

const SECURITY_TOPIC = /secur|iam\b|secret|vulnerab|rbac|encrypt|zero.?trust|complian|credential/i

/** A question is security evidence when its topic or a tagged tool says so. */
export function isSecurityQuestion(topic: string, technologies: string[]): boolean {
  if (SECURITY_TOPIC.test(topic)) return true
  return technologies.some((id) => {
    const category = findTechnology(id)?.category
    return category === 'security' || category === 'identity'
  })
}

/** Builds items for one attempt, skipping any factor with no score. */
export interface AttemptBase {
  attemptId: string
  origin: EvidenceOrigin
  at: string
  label: string
  topic?: string
  basis: EvidenceBasis
  reliability?: number
}

export class AttemptBuilder {
  readonly items: ReadinessEvidence[] = []
  private readonly base: AttemptBase

  constructor(base: AttemptBase) {
    this.base = base
  }

  add(
    factor: ReadinessFactorId,
    score: number | null,
    extra: { gaps?: string[]; reliability?: number; label?: string } = {},
  ): this {
    if (score === null || !Number.isFinite(score)) return this
    const { attemptId, origin, at, label, topic, basis, reliability } = this.base
    this.items.push({
      id: `${attemptId}:${factor}`,
      attemptId,
      origin,
      factor,
      score,
      at,
      label: extra.label ?? label,
      topic,
      basis,
      gaps: extra.gaps?.length ? extra.gaps : undefined,
      reliability: extra.reliability ?? reliability,
    })
    return this
  }
}

export function day(iso: string): string {
  return iso.slice(0, 10)
}
