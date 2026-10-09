import type { InterviewMode, InterviewRoundKind, RoundPlan } from '@opsforge/types'

export const ROUND_LABELS: Record<InterviewRoundKind, string> = {
  screening: 'Screening',
  technical: 'Technical',
  troubleshooting: 'Troubleshooting',
  architecture: 'Architecture',
  behavioral: 'Behavioral',
  final: 'Final interviewer',
}

export const ROUND_ORDER: InterviewRoundKind[] = [
  'screening',
  'technical',
  'troubleshooting',
  'architecture',
  'behavioral',
  'final',
]

/** Timeboxes follow PRD INT-05. */
const INTERVIEW_DAY: RoundPlan[] = [
  { kind: 'screening', timeboxMinutes: 15, questionTarget: 3 },
  { kind: 'technical', timeboxMinutes: 30, questionTarget: 4 },
  { kind: 'troubleshooting', timeboxMinutes: 20, questionTarget: 2 },
  { kind: 'architecture', timeboxMinutes: 30, questionTarget: 2 },
  { kind: 'behavioral', timeboxMinutes: 20, questionTarget: 3 },
  { kind: 'final', timeboxMinutes: 20, questionTarget: 2 },
]

const EMERGENCY: RoundPlan[] = [
  { kind: 'technical', timeboxMinutes: 12, questionTarget: 3 },
  { kind: 'troubleshooting', timeboxMinutes: 8, questionTarget: 1 },
  { kind: 'architecture', timeboxMinutes: 10, questionTarget: 1 },
  { kind: 'behavioral', timeboxMinutes: 8, questionTarget: 2 },
]

export function planRounds(
  mode: InterviewMode,
  single: InterviewRoundKind = 'technical',
): RoundPlan[] {
  if (mode === 'interview-day') return INTERVIEW_DAY.map((r) => ({ ...r }))
  if (mode === 'emergency') return EMERGENCY.map((r) => ({ ...r }))
  const base = INTERVIEW_DAY.find((r) => r.kind === single) ?? INTERVIEW_DAY[1]!
  return [{ ...base, questionTarget: base.questionTarget + 1 }]
}

export const MODE_LABELS: Record<InterviewMode, { label: string; description: string }> = {
  'single-round': {
    label: 'Single round',
    description: 'Practise one round type with a few questions.',
  },
  'interview-day': {
    label: 'Interview day',
    description: 'Six timed rounds, from screening to the final interviewer.',
  },
  emergency: {
    label: 'Emergency',
    description: 'A short, high-value run when the interview is close.',
  },
}
