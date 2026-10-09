import type { InterviewSession, ReadinessEvidence, ThreadEvaluation } from '@opsforge/types'
import { AttemptBuilder, basisOf, day, dimensionMean, isSecurityQuestion } from './shared'

function gapsOf(evaluation: ThreadEvaluation): string[] {
  const missed = evaluation.concepts
    .filter((c) => c.required && c.status === 'missed')
    .map((c) => `Missed ${c.label}`)
  const flags = evaluation.redFlags.map((r) => `Misconception: ${r.label}`)
  return [...flags, ...missed]
}

/**
 * Each answered, scored interview thread becomes one attempt that evidences several factors.
 * Knowledge comes from accuracy and depth only; confidence from delivery and follow-up handling
 * only, so the two never share a signal.
 */
export function interviewEvidence(sessions: InterviewSession[]): ReadinessEvidence[] {
  const out: ReadinessEvidence[] = []
  for (const session of sessions) {
    for (const round of session.rounds) {
      for (const thread of round.threads) {
        const evaluation = thread.evaluation
        if (!evaluation || thread.closeReason === 'skipped') continue
        const first = thread.turns.find((t) => t.answer && !t.answer.skipped)
        if (!first?.answer) continue

        const topic = thread.spec.topic
        const builder = new AttemptBuilder({
          attemptId: `interview:${session.id}:${thread.id}`,
          origin: 'interview',
          at: first.answer.submittedAt,
          label: `Interview ${day(session.startedAt)}, ${topic}`,
          topic,
          basis: basisOf(evaluation.basis),
        })
        const gaps = gapsOf(evaluation)
        const knowledge = dimensionMean(evaluation, ['technical-accuracy', 'depth'])

        builder
          .add('interviews', evaluation.score, { gaps })
          .add('knowledge', knowledge, { gaps })
          .add(
            'communication',
            dimensionMean(evaluation, ['communication', 'structure', 'conciseness']),
          )
          .add('confidence', dimensionMean(evaluation, ['confidence', 'follow-up-handling']))
          .add(
            'architecture',
            dimensionMean(evaluation, ['architecture-thinking', 'trade-off-reasoning']),
            {
              gaps,
            },
          )
          .add('troubleshooting', dimensionMean(evaluation, ['incident-response']), { gaps })

        if (isSecurityQuestion(topic, thread.spec.technologies)) {
          builder.add('security', knowledge ?? evaluation.score, { gaps })
        }
        out.push(...builder.items)
      }
    }
  }
  return out
}
