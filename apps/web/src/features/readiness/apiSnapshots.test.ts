import type { ReadinessSnapshot } from '@opsforge/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiSnapshotRepository, migrateLocalSnapshots } from './apiSnapshots'
import { LocalStorageSnapshotRepository } from './snapshots'

const snap = (n: number): ReadinessSnapshot => ({
  id: `snap-${n}`,
  takenAt: `2026-06-0${n}T12:00:00.000Z`,
  configVersion: 'v1',
  fingerprint: `fp-${n}`,
  evidenceCount: n,
  overall: 50,
  level: 2,
  factors: { knowledge: 60 },
})

afterEach(() => vi.unstubAllGlobals())

describe('ApiSnapshotRepository', () => {
  it('lists from and appends to the API', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Response(JSON.stringify(init?.method === 'POST' ? snap(1) : [snap(1)])),
    )
    vi.stubGlobal('fetch', fetchMock)
    const repo = new ApiSnapshotRepository()
    expect(await repo.list()).toEqual([snap(1)])
    await repo.append(snap(1))
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/readiness/snapshots')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST')
  })
})

describe('migrateLocalSnapshots', () => {
  it('uploads browser history, then clears it', async () => {
    const local = new LocalStorageSnapshotRepository(null)
    await local.append(snap(1))
    await local.append(snap(2))
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify({ imported: 2, skipped: 0 })),
    )
    vi.stubGlobal('fetch', fetchMock)
    await migrateLocalSnapshots(local, new ApiSnapshotRepository())
    const sent = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      snapshots: ReadinessSnapshot[]
    }
    expect(sent.snapshots).toHaveLength(2)
    expect(await local.list()).toEqual([])
  })

  it('keeps the browser history when the import fails', async () => {
    const local = new LocalStorageSnapshotRepository(null)
    await local.append(snap(1))
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    await expect(migrateLocalSnapshots(local, new ApiSnapshotRepository())).rejects.toThrow()
    expect(await local.list()).toHaveLength(1)
  })

  it('does not call the API when there is nothing to move', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await migrateLocalSnapshots(
      new LocalStorageSnapshotRepository(null),
      new ApiSnapshotRepository(),
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
