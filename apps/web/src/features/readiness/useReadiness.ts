import type {
  EvidenceSourceStatus,
  ReadinessReport,
  ReadinessSnapshot,
  ReadinessSnapshotRepository,
} from '@opsforge/types'
import { useEffect, useState } from 'react'
import { buildReadinessReport } from './engine'
import { loadEvidence, type EvidenceSource } from './sources'
import { recordSnapshot, snapshotRepository } from './snapshots'

export interface ReadinessRuntime {
  sources?: EvidenceSource[]
  snapshots?: ReadinessSnapshotRepository
  now?: () => Date
}

export type ReadinessState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      report: ReadinessReport
      sources: EvidenceSourceStatus[]
      history: ReadinessSnapshot[]
    }

/** Container hook: gathers evidence, asks the engine for the report, records a snapshot. */
export function useReadiness(runtime: ReadinessRuntime = {}): ReadinessState {
  const [state, setState] = useState<ReadinessState>({ status: 'loading' })
  const { sources, snapshots = snapshotRepository, now } = runtime

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { evidence, statuses } = await loadEvidence(sources)
      const report = buildReadinessReport(evidence, { now: now?.() })
      const history = await recordSnapshot(report, snapshots)
      if (!cancelled) setState({ status: 'ready', report, sources: statuses, history })
    })().catch((error: unknown) => {
      if (!cancelled) {
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not calculate readiness.',
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [sources, snapshots, now])

  return state
}
