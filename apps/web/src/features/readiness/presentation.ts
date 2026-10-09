import type {
  CalibrationReport,
  EvidenceConfidence,
  ReadinessScoreBand,
  TrendDirection,
} from '@opsforge/types'
import type { Tone } from '@opsforge/ui'

export {
  bandLabel,
  formatClock,
  formatRelative,
  formatSigned,
  modulePath,
} from '../command-center/presentation'

export const bandTone: Record<ReadinessScoreBand, Tone> = {
  critical: 'error',
  weak: 'error',
  developing: 'warning',
  solid: 'info',
  strong: 'success',
}

export const confidenceLabel: Record<EvidenceConfidence, string> = {
  none: 'No evidence',
  low: 'Low confidence',
  medium: 'Medium confidence',
  high: 'High confidence',
}

export const confidenceTone: Record<EvidenceConfidence, Tone> = {
  none: 'neutral',
  low: 'warning',
  medium: 'info',
  high: 'success',
}

export const trendLabel: Record<TrendDirection, string> = {
  improving: 'Improving',
  declining: 'Declining',
  steady: 'Steady',
  insufficient: 'Not enough history',
}

export const trendTone: Record<TrendDirection, Tone> = {
  improving: 'success',
  declining: 'error',
  steady: 'neutral',
  insufficient: 'neutral',
}

export const patternLabel: Record<CalibrationReport['pattern'], string> = {
  aligned: 'Aligned',
  'under-confident': 'Under-confident',
  'over-confident': 'Possible overconfidence',
  insufficient: 'Not enough evidence',
}

export const patternTone: Record<CalibrationReport['pattern'], Tone> = {
  aligned: 'success',
  'under-confident': 'info',
  'over-confident': 'warning',
  insufficient: 'neutral',
}

export const severityTone = {
  high: 'error',
  medium: 'warning',
  low: 'info',
} as const satisfies Record<string, Tone>

export function formatScore(score: number | null): string {
  return score === null ? '—' : String(Math.round(score))
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`
}

export function formatDay(iso: string): string {
  return iso.slice(0, 10)
}
