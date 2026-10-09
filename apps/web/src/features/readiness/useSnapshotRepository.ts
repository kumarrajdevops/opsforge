import type { ReadinessSnapshotRepository } from '@opsforge/types'
import { useMemo } from 'react'
import { useAccount } from '../account/accountContext'
import { ApiSnapshotRepository, migrateLocalSnapshots } from './apiSnapshots'
import { snapshotRepository, localSnapshotRepository } from './snapshots'

/**
 * Where readiness history lives. Signed in: the account (API). Signed out or API unreachable:
 * this browser, so the app still works offline. A failed API call falls back to the browser copy,
 * which the next successful call moves to the account.
 */
export function useSnapshotRepository(): {
  ready: boolean
  repository: ReadinessSnapshotRepository
} {
  const { status } = useAccount()
  return useMemo(() => {
    if (status === 'checking') return { ready: false, repository: snapshotRepository }
    if (status === 'signed-out') return { ready: true, repository: snapshotRepository }
    const remote = new ApiSnapshotRepository()
    const repository: ReadinessSnapshotRepository = {
      async list() {
        try {
          await migrateLocalSnapshots(localSnapshotRepository, remote)
          return await remote.list()
        } catch {
          return localSnapshotRepository.list()
        }
      },
      async append(snapshot) {
        try {
          await remote.append(snapshot)
        } catch {
          await localSnapshotRepository.append(snapshot)
        }
      },
    }
    return { ready: true, repository }
  }, [status])
}
