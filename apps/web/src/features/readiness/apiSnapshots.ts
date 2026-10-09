import type { ReadinessSnapshot, ReadinessSnapshotRepository } from '@opsforge/types'
import { apiRequest } from '../account/accountApi'
import type { LocalStorageSnapshotRepository } from './snapshots'

const URL = '/api/readiness/snapshots'

/** Readiness history kept on the server, per account. The API only ever appends. */
export class ApiSnapshotRepository implements ReadinessSnapshotRepository {
  list(): Promise<ReadinessSnapshot[]> {
    return apiRequest<ReadinessSnapshot[]>(URL)
  }

  async append(snapshot: ReadinessSnapshot): Promise<void> {
    await apiRequest<ReadinessSnapshot>(URL, { body: snapshot })
  }

  import(snapshots: ReadinessSnapshot[]): Promise<{ imported: number; skipped: number }> {
    return apiRequest(`${URL}/import`, { body: { snapshots } })
  }
}

/**
 * Moves history recorded in this browser to the account, then clears the browser copy. The local
 * copy is only removed after the API confirms the import, so a failure loses nothing.
 */
export async function migrateLocalSnapshots(
  local: LocalStorageSnapshotRepository,
  remote: ApiSnapshotRepository,
): Promise<void> {
  const pending = await local.list()
  if (pending.length === 0) return
  await remote.import(pending)
  local.clear()
}
