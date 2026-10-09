import type { JdAnalysis, JdRepository } from '@opsforge/types'
import { LocalKeyValueDocument, type KeyValueStore } from '../storage/localDocument'

const KEY = 'opsforge.jd.current'

function isAnalysis(value: unknown): value is JdAnalysis {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<JdAnalysis>
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === 1 &&
    typeof v.rawText === 'string' &&
    Array.isArray(v.technologies) &&
    Array.isArray(v.responsibilities) &&
    Array.isArray(v.seniority) &&
    Array.isArray(v.skills)
  )
}

/** Browser persistence for the current job description until the API exists. */
export class LocalStorageJdRepository implements JdRepository {
  private readonly doc: LocalKeyValueDocument<JdAnalysis>

  constructor(store?: KeyValueStore | null) {
    this.doc = new LocalKeyValueDocument(KEY, isAnalysis, store)
  }

  async load(): Promise<JdAnalysis | null> {
    return this.doc.read()
  }

  async save(analysis: JdAnalysis): Promise<void> {
    this.doc.write(analysis)
  }

  async clear(): Promise<void> {
    this.doc.remove()
  }
}

export const jdRepository: JdRepository = new LocalStorageJdRepository()
