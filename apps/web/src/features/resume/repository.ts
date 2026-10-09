import type { ResumeRecord, ResumeRepository } from '@opsforge/types'
import { LocalKeyValueDocument, type KeyValueStore } from '../storage/localDocument'

const KEY = 'opsforge.resume.current'

function isRecord(value: unknown): value is ResumeRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<ResumeRecord>
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === 1 &&
    typeof v.rawText === 'string' &&
    Array.isArray(v.claims) &&
    Array.isArray(v.sections) &&
    Array.isArray(v.attempts)
  )
}

/** Browser persistence for the current resume until the API exists. */
export class LocalStorageResumeRepository implements ResumeRepository {
  private readonly doc: LocalKeyValueDocument<ResumeRecord>

  constructor(store?: KeyValueStore | null) {
    this.doc = new LocalKeyValueDocument(KEY, isRecord, store)
  }

  async load(): Promise<ResumeRecord | null> {
    return this.doc.read()
  }

  async save(record: ResumeRecord): Promise<void> {
    this.doc.write(record)
  }

  async clear(): Promise<void> {
    this.doc.remove()
  }
}

export const resumeRepository: ResumeRepository = new LocalStorageResumeRepository()
