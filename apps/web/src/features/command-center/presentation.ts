import type {
  EvidenceEvent,
  FailureRisk,
  IncidentRecord,
  ModuleKey,
  ScoreBand,
} from '@opsforge/types'
import type { Tone } from '@opsforge/ui'

/** Display mappings only. What a band means (and its thresholds) is decided by the readiness engine. */

export const bandTone: Record<ScoreBand, Tone> = {
  critical: 'error',
  weak: 'error',
  developing: 'warning',
  solid: 'info',
  strong: 'success',
}

export const bandLabel: Record<ScoreBand, string> = {
  critical: 'Critical',
  weak: 'Weak',
  developing: 'Developing',
  solid: 'Solid',
  strong: 'Strong',
}

export const likelihoodTone: Record<FailureRisk['likelihood'], Tone> = {
  high: 'error',
  medium: 'warning',
  low: 'info',
}

export const outcomeTone: Record<EvidenceEvent['outcome'], Tone> = {
  pass: 'success',
  partial: 'warning',
  fail: 'error',
}

export const outcomeLabel: Record<EvidenceEvent['outcome'], string> = {
  pass: 'PASS',
  partial: 'PARTIAL',
  fail: 'FAIL',
}

export const incidentOutcomeTone: Record<IncidentRecord['outcome'], Tone> = {
  resolved: 'success',
  partial: 'warning',
  failed: 'error',
}

export const moduleLabel: Record<ModuleKey, string> = {
  knowledge: 'ForgeLearn',
  flashcards: 'ForgeCards',
  questions: 'Questions',
  incidents: 'ForgeOps',
  labs: 'ForgeLab',
  architecture: 'ForgeArchitect',
  interviewer: 'ForgeInterview',
  resume: 'ForgeResume',
  jd: 'ForgeJD',
  readiness: 'ForgeReady',
}

export function modulePath(module: ModuleKey): string {
  return `/${module}`
}

export function formatSigned(value: number, digits = 0): string {
  const rounded = Number(value.toFixed(digits))
  if (rounded === 0) return '±0'
  return `${rounded > 0 ? '+' : '−'}${Math.abs(rounded).toFixed(digits)}`
}

export function deltaTone(value: number): Tone {
  if (value > 0) return 'success'
  if (value < 0) return 'error'
  return 'neutral'
}

export function formatRelative(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export function formatClock(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
