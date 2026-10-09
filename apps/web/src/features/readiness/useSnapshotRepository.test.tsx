import type { ReadinessSnapshot } from '@opsforge/types'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountContext, type AccountState } from '../account/accountContext'
import { localSnapshotRepository } from './snapshots'
import { useSnapshotRepository } from './useSnapshotRepository'

const snap: ReadinessSnapshot = {
  id: 'snap-1',
  takenAt: '2026-06-01T12:00:00.000Z',
  configVersion: 'v1',
  fingerprint: 'fp-1',
  evidenceCount: 1,
  overall: 50,
  level: 2,
  factors: { knowledge: 60 },
}

function withStatus(status: AccountState['status']) {
  const value: AccountState = {
    status,
    user: null,
    apiReachable: status === 'signed-in',
    signIn: async () => undefined,
    register: async () => undefined,
    signOut: async () => undefined,
  }
  return ({ children }: { children: ReactNode }) => (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  )
}

beforeEach(() => localSnapshotRepository.clear())
afterEach(() => {
  vi.unstubAllGlobals()
  localSnapshotRepository.clear()
})

describe('useSnapshotRepository', () => {
  it('waits while the session is being checked', () => {
    const { result } = renderHook(() => useSnapshotRepository(), {
      wrapper: withStatus('checking'),
    })
    expect(result.current.ready).toBe(false)
  })

  it('uses the browser copy when signed out and never calls the API', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useSnapshotRepository(), {
      wrapper: withStatus('signed-out'),
    })
    await result.current.repository.append(snap)
    expect(await result.current.repository.list()).toEqual([snap])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reads from the account when signed in', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify([snap]))),
    )
    const { result } = renderHook(() => useSnapshotRepository(), {
      wrapper: withStatus('signed-in'),
    })
    expect(await result.current.repository.list()).toEqual([snap])
  })

  it('falls back to the browser copy when the API fails, and keeps what it recorded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    const { result } = renderHook(() => useSnapshotRepository(), {
      wrapper: withStatus('signed-in'),
    })
    await result.current.repository.append(snap)
    expect(await localSnapshotRepository.list()).toEqual([snap])
  })
})
