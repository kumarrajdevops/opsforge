import type { LivenessResponse, ReadinessResponse } from '@opsforge/types'

export type ApiConnection = 'checking' | 'online' | 'degraded' | 'offline'

export function connectionFromReadiness(response: ReadinessResponse): ApiConnection {
  if (response.status === 'ok') return 'online'
  if (response.status === 'degraded') return 'degraded'
  return 'offline'
}

export async function fetchLiveness(signal?: AbortSignal): Promise<LivenessResponse> {
  const res = await fetch('/api/health/live', { signal })
  if (!res.ok) throw new Error(`Liveness check failed: ${res.status}`)
  return (await res.json()) as LivenessResponse
}

export async function fetchReadiness(signal?: AbortSignal): Promise<ReadinessResponse> {
  const res = await fetch('/api/health/ready', { signal })
  // 503 carries a valid readiness body describing which dependency is down
  if (!res.ok && res.status !== 503) throw new Error(`Readiness check failed: ${res.status}`)
  return (await res.json()) as ReadinessResponse
}
