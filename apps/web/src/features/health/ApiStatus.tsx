import { StatusIndicator, type Status } from '@opsforge/ui'
import type { ApiConnection } from './apiHealth'
import { useApiConnection } from './useApiConnection'

const MAP: Record<ApiConnection, { status: Status; label: string }> = {
  checking: { status: 'unknown', label: 'API: checking' },
  online: { status: 'healthy', label: 'API: online' },
  degraded: { status: 'degraded', label: 'API: degraded' },
  offline: { status: 'critical', label: 'API: offline' },
}

export function ApiStatus() {
  const connection = useApiConnection()
  const { status, label } = MAP[connection]
  return <StatusIndicator status={status} label={label} variant="pill" />
}
