import AltRouteOutlined from '@mui/icons-material/AltRouteOutlined'
import BadgeOutlined from '@mui/icons-material/BadgeOutlined'
import BoltOutlined from '@mui/icons-material/BoltOutlined'
import DevicesOutlined from '@mui/icons-material/DevicesOutlined'
import DynamicFeedOutlined from '@mui/icons-material/DynamicFeedOutlined'
import HubOutlined from '@mui/icons-material/HubOutlined'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import LanguageOutlined from '@mui/icons-material/LanguageOutlined'
import MemoryOutlined from '@mui/icons-material/MemoryOutlined'
import MonitorHeartOutlined from '@mui/icons-material/MonitorHeartOutlined'
import PublicOutlined from '@mui/icons-material/PublicOutlined'
import QueueOutlined from '@mui/icons-material/QueueOutlined'
import RocketLaunchOutlined from '@mui/icons-material/RocketLaunchOutlined'
import ShieldOutlined from '@mui/icons-material/ShieldOutlined'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import type {
  CheckSeverity,
  CloudProvider,
  ComponentCategory,
  ConnectionKind,
  NodeImpact,
  UserImpact,
} from '@opsforge/types'
import type { Tone } from '@opsforge/ui'
import type { ReactElement } from 'react'

/** Display mappings only. Nothing here decides pass/fail or a score. */

export const categoryIcon: Record<ComponentCategory, ReactElement> = {
  client: <DevicesOutlined fontSize="inherit" />,
  dns: <PublicOutlined fontSize="inherit" />,
  cdn: <LanguageOutlined fontSize="inherit" />,
  waf: <ShieldOutlined fontSize="inherit" />,
  'load-balancer': <AltRouteOutlined fontSize="inherit" />,
  compute: <MemoryOutlined fontSize="inherit" />,
  kubernetes: <HubOutlined fontSize="inherit" />,
  database: <StorageOutlined fontSize="inherit" />,
  cache: <BoltOutlined fontSize="inherit" />,
  queue: <QueueOutlined fontSize="inherit" />,
  kafka: <DynamicFeedOutlined fontSize="inherit" />,
  storage: <Inventory2Outlined fontSize="inherit" />,
  iam: <BadgeOutlined fontSize="inherit" />,
  secrets: <KeyOutlined fontSize="inherit" />,
  monitoring: <MonitorHeartOutlined fontSize="inherit" />,
  cicd: <RocketLaunchOutlined fontSize="inherit" />,
}

export const providerTone: Record<CloudProvider, Tone> = {
  aws: 'warning',
  azure: 'info',
  generic: 'neutral',
}

export const providerShort: Record<CloudProvider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  generic: 'Generic',
}

export const severityTone: Record<CheckSeverity, Tone> = {
  critical: 'error',
  major: 'warning',
  minor: 'info',
}

export const severityLabel: Record<CheckSeverity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
}

export const impactTone: Record<NodeImpact, Tone> = {
  ok: 'success',
  degraded: 'warning',
  down: 'error',
}

export const impactLabel: Record<NodeImpact, string> = {
  ok: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

export const userImpactTone: Record<UserImpact, Tone> = {
  available: 'success',
  degraded: 'warning',
  outage: 'error',
}

export const userImpactLabel: Record<UserImpact, string> = {
  available: 'Users unaffected',
  degraded: 'Users see degraded service',
  outage: 'User-facing outage',
}

export const edgeDash: Record<ConnectionKind, string | undefined> = {
  traffic: undefined,
  data: undefined,
  async: '6 4',
  telemetry: '2 4',
  deploy: '8 4 2 4',
}

/** Score to tone for dimension bars. Display bands only; the evaluator owns the numbers. */
export function scoreTone(score: number | null): Tone {
  if (score === null) return 'neutral'
  if (score >= 80) return 'success'
  if (score >= 60) return 'info'
  if (score >= 40) return 'warning'
  return 'error'
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'no recovery path'
  if (minutes === 0) return 'none'
  if (minutes < 60) return `~${minutes} min`
  const hours = minutes / 60
  return `~${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}

export function formatDelta(value: number | null): string {
  if (value === null) return '—'
  if (value === 0) return '±0'
  return `${value > 0 ? '+' : '−'}${Math.abs(value)}`
}
