export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface DependencyHealth {
  name: string
  status: HealthStatus
  detail?: string
}

export interface LivenessResponse {
  status: 'ok'
  service: string
  version: string
}

export interface ReadinessResponse {
  status: HealthStatus
  service: string
  version: string
  dependencies: DependencyHealth[]
}
