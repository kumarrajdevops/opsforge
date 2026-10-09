import type {
  CommandCategory,
  EvidenceChannel,
  EvidenceRole,
  HypothesisCategory,
  IncidentSeverity,
  MetricState,
  PreventionQuality,
  ServiceHealth,
  ServiceKind,
} from '@opsforge/types'
import type { Status, Tone } from '@opsforge/ui'

export const severityOrder: IncidentSeverity[] = ['sev1', 'sev2', 'sev3', 'sev4']

export const severityMeta: Record<
  IncidentSeverity,
  { label: string; tone: Tone; meaning: string }
> = {
  sev1: { label: 'SEV1', tone: 'error', meaning: 'Critical: full outage or data loss' },
  sev2: { label: 'SEV2', tone: 'error', meaning: 'Major: core journey broken for many customers' },
  sev3: { label: 'SEV3', tone: 'warning', meaning: 'Minor: degraded, workaround exists' },
  sev4: { label: 'SEV4', tone: 'info', meaning: 'Low: cosmetic or single-customer' },
}

export const metricTone: Record<MetricState, Tone> = {
  ok: 'success',
  warn: 'warning',
  crit: 'error',
}

export const healthStatus: Record<ServiceHealth, Status> = {
  healthy: 'healthy',
  degraded: 'degraded',
  down: 'critical',
}

export const healthLabel: Record<ServiceHealth, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

export const serviceKindLabel: Record<ServiceKind, string> = {
  web: 'Web',
  api: 'API',
  database: 'Database',
  cache: 'Cache',
  queue: 'Queue',
  worker: 'Worker',
  platform: 'Platform',
  external: 'External',
  identity: 'Identity',
  storage: 'Storage',
  'source-control': 'Source control',
}

export const channelLabel: Record<EvidenceChannel, string> = {
  metrics: 'Metric',
  logs: 'Log',
  traces: 'Trace',
  command: 'Command',
  alert: 'Alert',
  change: 'Change',
  report: 'Report',
}

export const roleMeta: Record<EvidenceRole, { label: string; tone: Tone }> = {
  'root-cause': { label: 'Root cause', tone: 'error' },
  mechanism: { label: 'Mechanism', tone: 'warning' },
  contributing: { label: 'Contributing', tone: 'warning' },
  symptom: { label: 'Symptom', tone: 'info' },
  'ruled-out': { label: 'Rules out', tone: 'success' },
  noise: { label: 'Noise', tone: 'neutral' },
}

export const categoryLabel: Record<HypothesisCategory, string> = {
  change: 'Recent change',
  capacity: 'Capacity',
  dependency: 'Dependency',
  'data-store': 'Data store',
  cache: 'Cache',
  messaging: 'Messaging',
  network: 'Network',
  configuration: 'Configuration',
  infrastructure: 'Infrastructure',
  security: 'Security',
}

export const commandCategoryLabel: Record<CommandCategory, string> = {
  kubernetes: 'Kubernetes',
  database: 'Database',
  messaging: 'Messaging',
  cache: 'Cache',
  network: 'Network',
  deploy: 'Deploy',
  cloud: 'Cloud',
  'source-control': 'Source control',
  system: 'System',
}

export const qualityMeta: Record<PreventionQuality, { label: string; tone: Tone }> = {
  strong: { label: 'Strong', tone: 'success' },
  acceptable: { label: 'Acceptable', tone: 'info' },
  weak: { label: 'Weak', tone: 'warning' },
  counterproductive: { label: 'Counterproductive', tone: 'error' },
}

export const riskTone: Record<'low' | 'medium' | 'high', Tone> = {
  low: 'success',
  medium: 'warning',
  high: 'error',
}

export function scoreTone(score: number | null): Tone {
  if (score === null) return 'neutral'
  if (score >= 75) return 'success'
  if (score >= 50) return 'warning'
  return 'error'
}
