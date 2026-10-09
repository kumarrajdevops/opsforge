import type { ReadinessResponse } from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { connectionFromReadiness } from './apiHealth'

const base: ReadinessResponse = { status: 'ok', service: 'api', version: '0.0.0', dependencies: [] }

describe('connectionFromReadiness', () => {
  it('maps ok to online', () => {
    expect(connectionFromReadiness(base)).toBe('online')
  })
  it('maps degraded to degraded', () => {
    expect(connectionFromReadiness({ ...base, status: 'degraded' })).toBe('degraded')
  })
  it('maps down to offline', () => {
    expect(connectionFromReadiness({ ...base, status: 'down' })).toBe('offline')
  })
})
