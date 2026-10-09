import type { InterrogationCategory, ReadinessEvidence, ResumeRecord } from '@opsforge/types'
import { technologyLabel } from '../../technologies/catalog'
import { AttemptBuilder, basisOf, dimensionMean } from './shared'

/** Reliability of a drill answer by angle. A spoken account of past work is weaker than a simulation. */
const CATEGORY_RELIABILITY: Partial<Record<InterrogationCategory, number>> = {
  incidents: 0.7,
  'trade-offs': 0.8,
}

/**
 * A resume drill is a scored answer about the candidate's own claim. It counts as question
 * practice and as knowledge, and as the factor matching its angle. A claim that was never drilled
 * contributes nothing: a resume line alone is not evidence.
 */
export function drillEvidence(resume: ResumeRecord | null): ReadinessEvidence[] {
  if (!resume) return []
  const claims = new Map(resume.claims.map((c) => [c.id, c]))
  const out: ReadinessEvidence[] = []

  for (const attempt of resume.attempts) {
    const evaluation = attempt.evaluation
    if (!evaluation || attempt.answer.trim() === '') continue
    const claim = claims.get(attempt.claimId)
    const tech = claim?.technologies[0]
    const topic = tech ? technologyLabel(tech) : claim?.context
    const reliability = CATEGORY_RELIABILITY[attempt.category]

    const builder = new AttemptBuilder({
      attemptId: `drill:${attempt.id}`,
      origin: 'resume-drill',
      at: attempt.answeredAt,
      label: `Resume drill, ${attempt.category}${topic ? `, ${topic}` : ''}`,
      topic,
      basis: basisOf(evaluation.basis),
      reliability,
    })
    const gaps = evaluation.concepts
      .filter((c) => c.required && c.status === 'missed')
      .map((c) => `Missed ${c.label}`)

    builder
      .add('questions', evaluation.score, { gaps })
      .add('knowledge', dimensionMean(evaluation, ['technical-accuracy', 'depth']), { gaps })
      .add('confidence', dimensionMean(evaluation, ['confidence']))

    switch (attempt.category) {
      case 'security':
        builder.add('security', evaluation.score, { gaps })
        break
      case 'troubleshooting':
        builder.add('troubleshooting', evaluation.score, { gaps })
        break
      case 'incidents':
        builder.add('incidents', evaluation.score, { gaps })
        break
      case 'architecture':
      case 'trade-offs':
        builder.add('architecture', evaluation.score, { gaps })
        break
      case 'leadership':
        builder.add('communication', dimensionMean(evaluation, ['communication', 'structure']))
        break
      default:
        break
    }
    out.push(...builder.items)
  }
  return out
}
