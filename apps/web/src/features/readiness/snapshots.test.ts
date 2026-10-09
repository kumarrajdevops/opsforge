import type { ReadinessEvidence } from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { buildReadinessReport } from './engine'
import { LocalStorageSnapshotRepository, recordSnapshot } from './snapshots'
import { loadEvidence, type EvidenceSource } from './sources'

const NOW = new Date('2026-06-30T12:00:00Z')
const item = (id: string, score: number): ReadinessEvidence => ({
  id,
  attemptId: id,
  origin: 'interview',
  factor: 'knowledge',
  score,
  at: '2026-06-29T10:00:00.000Z',
  label: id,
  basis: 'deterministic',
})

describe('snapshot history', () => {
  it('records nothing before there is any evidence', async () => {
    const repo = new LocalStorageSnapshotRepository(null)
    const history = await recordSnapshot(buildReadinessReport([], { now: NOW }), repo)
    expect(history).toEqual([])
  })

  it('appends a snapshot and does not duplicate an unchanged result', async () => {
    const repo = new LocalStorageSnapshotRepository(null)
    const report = buildReadinessReport([item('a', 70)], { now: NOW })
    await recordSnapshot(report, repo)
    await recordSnapshot(report, repo)
    expect(await repo.list()).toHaveLength(1)
  })

  it('appends again when evidence changes and never rewrites the earlier entry', async () => {
    const repo = new LocalStorageSnapshotRepository(null)
    await recordSnapshot(buildReadinessReport([item('a', 70)], { now: NOW }), repo)
    const first = (await repo.list())[0]
    await recordSnapshot(buildReadinessReport([item('a', 70), item('b', 40)], { now: NOW }), repo)
    const history = await repo.list()
    expect(history).toHaveLength(2)
    expect(history[0]).toEqual(first)
    expect(history[1]?.evidenceCount).toBe(2)
  })
})

describe('evidence sources', () => {
  it('reports unbuilt modules as not connected and never invents evidence', async () => {
    const { evidence, statuses } = await loadEvidence([
      { origin: 'lab', load: async () => [] },
      { origin: 'interview', load: async () => [item('a', 80)] },
    ])
    expect(evidence).toHaveLength(1)
    expect(statuses.find((s) => s.origin === 'lab')?.connected).toBe(false)
    expect(statuses.find((s) => s.origin === 'interview')?.connected).toBe(true)
  })

  it('isolates a failing source so the rest still count', async () => {
    const failing: EvidenceSource = {
      origin: 'incident',
      load: async () => {
        throw new Error('corrupt')
      },
    }
    const { evidence, statuses } = await loadEvidence([
      failing,
      { origin: 'interview', load: async () => [item('a', 80)] },
    ])
    expect(evidence).toHaveLength(1)
    const status = statuses.find((s) => s.origin === 'incident')
    expect(status?.connected).toBe(false)
    expect(status?.note).toMatch(/could not read/i)
  })
})
