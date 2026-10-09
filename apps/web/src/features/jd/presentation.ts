import type {
  PrepActionKind,
  RequirementStatus,
  ResponsibilityTheme,
  SeniorityLevel,
  SenioritySignalKind,
} from '@opsforge/types'
import type { Tone } from '@opsforge/ui'

export const STATUS_LABEL: Record<RequirementStatus, string> = {
  demonstrated: 'Demonstrated',
  partial: 'Partial',
  weak: 'Weak',
  'claimed-untested': 'Claimed, untested',
  'no-evidence': 'No evidence',
}

export function statusTone(status: RequirementStatus): Tone {
  switch (status) {
    case 'demonstrated':
      return 'success'
    case 'partial':
      return 'primary'
    case 'weak':
      return 'error'
    case 'claimed-untested':
      return 'warning'
    default:
      return 'neutral'
  }
}

export const STATUS_ORDER: RequirementStatus[] = [
  'demonstrated',
  'partial',
  'weak',
  'claimed-untested',
  'no-evidence',
]

export const THEME_LABEL: Record<ResponsibilityTheme, string> = {
  delivery: 'Delivery',
  reliability: 'Reliability',
  platform: 'Platform',
  security: 'Security',
  observability: 'Observability',
  cost: 'Cost',
  leadership: 'Leadership',
  collaboration: 'Collaboration',
}

export const SIGNAL_LABEL: Record<SenioritySignalKind, string> = {
  title: 'Title',
  years: 'Years of experience',
  ownership: 'Ownership',
  leadership: 'Leadership',
  architecture: 'Architecture',
  scope: 'Scope',
  'on-call': 'On-call',
}

export const LEVEL_LABEL: Record<SeniorityLevel, string> = {
  mid: 'Mid-level',
  senior: 'Senior',
  staff: 'Staff or above',
}

export const ACTION_LABEL: Record<PrepActionKind, string> = {
  'defend-claim': 'Resume drill',
  'mock-interview': 'Mock interview',
  study: 'Study',
  incident: 'Incident',
  architecture: 'Architecture',
}
