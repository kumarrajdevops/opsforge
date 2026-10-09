import type { CalibrationReport, FactorReport, ReadinessEvidence } from '@opsforge/types'
import { actionFor } from './actions'
import { CALIBRATION_RULES } from './config'

/**
 * Knowledge and confidence are scored from different evidence and compared, never blended.
 * A big gap changes what to practise next (PRD RDY-02, RDY-03).
 */
export function calibrate(
  knowledge: FactorReport,
  confidence: FactorReport,
  evidence: ReadinessEvidence[],
  now: number,
): CalibrationReport {
  const k = knowledge.score
  const c = confidence.score
  const base = { knowledge: k, confidence: c }
  const forFactor = (id: 'knowledge' | 'confidence') => evidence.filter((e) => e.factor === id)

  if (k === null || c === null) {
    const missing =
      k === null && c === null
        ? 'knowledge and confidence'
        : k === null
          ? 'knowledge'
          : 'confidence'
    return {
      ...base,
      gap: null,
      pattern: 'insufficient',
      summary: `No ${missing} evidence yet, so the two cannot be compared.`,
      guidance: 'Sit a mock interview: it produces both a knowledge and a confidence signal.',
      actions: [],
    }
  }
  const min = CALIBRATION_RULES.minItems
  if (knowledge.evidenceCount < min || confidence.evidenceCount < min) {
    return {
      ...base,
      gap: Math.round(k - c),
      pattern: 'insufficient',
      summary: `Knowledge ${k} and confidence ${c}, but at least ${min} items on each are needed before reading anything into the gap.`,
      guidance: 'Add more scored answers; a mismatch from one or two answers is noise.',
      actions: [],
    }
  }

  const gap = Math.round(k - c)
  if (gap >= CALIBRATION_RULES.gap) {
    return {
      ...base,
      gap,
      pattern: 'under-confident',
      summary: `Knowledge ${k} is well ahead of confidence ${c}. You probably know more than you show.`,
      guidance:
        'The gap is delivery, not knowledge. Prioritise verbal practice and interview exposure: timed answers, structure, and follow-ups without hedging.',
      actions: [
        actionFor(
          'confidence',
          forFactor('confidence'),
          now,
          'Practise answering aloud under time pressure',
          `Knowledge ${k} against confidence ${c}: more reading will not close this, repetition in interview conditions will.`,
        ),
      ],
    }
  }
  if (gap <= -CALIBRATION_RULES.gap) {
    return {
      ...base,
      gap,
      pattern: 'over-confident',
      summary: `Confidence ${c} is ahead of knowledge ${k}. You may sound surer than the answers justify.`,
      guidance:
        'Potential overconfidence. Do not trust the confidence score until deeper testing and hands-on evidence back it up: follow-up questions, incidents and labs.',
      actions: [
        actionFor(
          'knowledge',
          forFactor('knowledge'),
          now,
          'Test knowledge with deeper, adversarial questions',
          `Confidence ${c} against knowledge ${k}: probe the topics where answers sounded sure but missed concepts.`,
        ),
      ],
    }
  }
  return {
    ...base,
    gap,
    pattern: 'aligned',
    summary: `Knowledge ${k} and confidence ${c} are within ${CALIBRATION_RULES.gap} points of each other.`,
    guidance:
      'Your delivery matches your depth. Raise both together by widening the topics tested.',
    actions: [],
  }
}
