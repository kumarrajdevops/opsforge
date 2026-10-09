import type {
  AnalysisBasis,
  EvaluationConfidence,
  InterviewDimensionId,
  ProbeKind,
  QuestionOrigin,
  ReadinessBand,
  ThreadCloseReason,
} from '@opsforge/types'
import type { Tone } from '@opsforge/ui'

export function bandTone(band: ReadinessBand | null): Tone {
  if (band === 'strong') return 'success'
  if (band === 'solid') return 'primary'
  if (band === 'borderline') return 'warning'
  return band === 'below-bar' ? 'error' : 'neutral'
}

export function scoreTone(score: number | null): Tone {
  if (score === null) return 'neutral'
  if (score >= 78) return 'success'
  if (score >= 62) return 'primary'
  if (score >= 45) return 'warning'
  return 'error'
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}

export const confidenceLabel: Record<EvaluationConfidence, string> = {
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
}

export const basisLabel: Record<AnalysisBasis | 'mixed', string> = {
  'rule-based': 'Rule-based analysis',
  'llm-assisted': 'Model-assisted analysis',
  mixed: 'Mixed analysis',
}

export const originLabel: Record<QuestionOrigin, string> = {
  bank: 'Question bank',
  resume: 'From your resume',
  jd: 'From the job description',
}

export const probeLabel: Record<ProbeKind, string> = {
  clarify: 'Clarify',
  gap: 'Gap',
  depth: 'Depth',
  tradeoff: 'Trade-off',
  challenge: 'Challenge',
  ownership: 'Ownership',
  outcome: 'Outcome',
  signal: 'Probe',
}

export const closeReasonLabel: Record<ThreadCloseReason, string> = {
  covered: 'Covered',
  'follow-up-limit': 'Follow-up limit reached',
  'moved-on': 'Moved on',
  skipped: 'Skipped',
  time: 'Time ran out',
}

/** What the setup screen lists as evaluated, without values: scores stay hidden until the debrief. */
export const evaluatedAreas: { id: InterviewDimensionId; hint: string }[] = [
  { id: 'technical-accuracy', hint: 'Are the claims correct?' },
  { id: 'depth', hint: 'Do you explain how and why?' },
  { id: 'follow-up-handling', hint: 'How you respond to probing' },
  { id: 'architecture-thinking', hint: 'Design under constraints' },
  { id: 'incident-response', hint: 'Scope, hypothesis, mitigation' },
  { id: 'communication', hint: 'Clear and direct' },
  { id: 'confidence', hint: 'Calibrated, not hedged' },
  { id: 'structure', hint: 'Organised answers' },
  { id: 'conciseness', hint: 'Right length' },
  { id: 'trade-off-reasoning', hint: 'Costs and alternatives' },
]
