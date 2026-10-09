import type {
  ReadinessReport,
  ReadinessSnapshot,
  ReadinessSnapshotRepository,
} from '@opsforge/types'
import { LocalKeyValueDocument, type KeyValueStore } from '../storage/localDocument'

const KEY = 'opsforge.readiness.snapshots'
const MAX_SNAPSHOTS = 200

function isSnapshotList(value: unknown): value is ReadinessSnapshot[] {
  return (
    Array.isArray(value) &&
    value.every(
      (s) =>
        typeof s === 'object' &&
        s !== null &&
        typeof (s as ReadinessSnapshot).id === 'string' &&
        typeof (s as ReadinessSnapshot).takenAt === 'string' &&
        typeof (s as ReadinessSnapshot).fingerprint === 'string',
    )
  )
}

/**
 * Append-only history of readiness results, oldest first. A snapshot is never edited: a later
 * calculation adds a new entry, so any past score can be reconstructed as it was shown.
 */
export class LocalStorageSnapshotRepository implements ReadinessSnapshotRepository {
  private readonly doc: LocalKeyValueDocument<ReadinessSnapshot[]>

  constructor(store?: KeyValueStore | null) {
    this.doc = new LocalKeyValueDocument(KEY, isSnapshotList, store)
  }

  async list(): Promise<ReadinessSnapshot[]> {
    return this.doc.read() ?? []
  }

  async append(snapshot: ReadinessSnapshot): Promise<void> {
    const existing = this.doc.read() ?? []
    this.doc.write([...existing, snapshot].slice(-MAX_SNAPSHOTS))
  }
}

export const snapshotRepository: ReadinessSnapshotRepository = new LocalStorageSnapshotRepository()

export function snapshotOf(report: ReadinessReport): ReadinessSnapshot {
  return {
    id: `snap-${report.generatedAt}-${report.fingerprint}`,
    takenAt: report.generatedAt,
    configVersion: report.configVersion,
    fingerprint: report.fingerprint,
    evidenceCount: report.evidenceCount,
    overall: report.overall.score,
    level: report.level.value,
    factors: Object.fromEntries(report.factors.map((f) => [f.id, f.score])),
  }
}

/**
 * Records the report only when it differs from the last snapshot (by fingerprint), so reopening
 * the page does not pad the history. Returns the full history after the call.
 */
export async function recordSnapshot(
  report: ReadinessReport,
  repository: ReadinessSnapshotRepository = snapshotRepository,
): Promise<ReadinessSnapshot[]> {
  const history = await repository.list()
  const last = history[history.length - 1]
  if (last && last.fingerprint === report.fingerprint) return history
  if (report.evidenceCount === 0 && !last) return history
  const snapshot = snapshotOf(report)
  await repository.append(snapshot)
  return [...history, snapshot]
}
