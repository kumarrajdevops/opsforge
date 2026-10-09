import type {
  ArchitectureDocument,
  ArchitectureRepository,
  ArchitectureVersion,
  SaveVersionInput,
  SaveVersionResult,
} from '@opsforge/types'
import { newId, sanitizeDocument } from './documentOps'
import { contentHash } from './versioning'

const DRAFT_PREFIX = 'opsforge.architecture.draft.'
const VERSIONS_PREFIX = 'opsforge.architecture.versions.'
const MAX_VERSIONS = 50

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function safeStorage(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/** Browser persistence until the API exists. Same contract an HTTP repository will implement. */
export class LocalStorageArchitectureRepository implements ArchitectureRepository {
  private readonly store: KeyValueStore | null
  private readonly fallback = new Map<string, string>()

  constructor(store: KeyValueStore | null = safeStorage()) {
    this.store = store
  }

  private read(key: string): string | null {
    try {
      return this.store ? this.store.getItem(key) : (this.fallback.get(key) ?? null)
    } catch {
      return this.fallback.get(key) ?? null
    }
  }

  private write(key: string, value: string): void {
    try {
      if (this.store) this.store.setItem(key, value)
      else this.fallback.set(key, value)
    } catch {
      this.fallback.set(key, value)
    }
  }

  async loadDraft(scenarioId: string): Promise<ArchitectureDocument | null> {
    const raw = this.read(DRAFT_PREFIX + scenarioId)
    if (!raw) return null
    try {
      return sanitizeDocument(JSON.parse(raw))
    } catch {
      return null
    }
  }

  async saveDraft(scenarioId: string, document: ArchitectureDocument): Promise<void> {
    this.write(DRAFT_PREFIX + scenarioId, JSON.stringify(document))
  }

  async listVersions(scenarioId: string): Promise<ArchitectureVersion[]> {
    const raw = this.read(VERSIONS_PREFIX + scenarioId)
    if (!raw) return []
    try {
      const parsed: unknown = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      const versions: ArchitectureVersion[] = []
      for (const v of parsed as ArchitectureVersion[]) {
        const document = sanitizeDocument(v?.document)
        if (document && typeof v.number === 'number') versions.push({ ...v, document })
      }
      return versions.sort((a, b) => b.number - a.number)
    } catch {
      return []
    }
  }

  async saveVersion(scenarioId: string, input: SaveVersionInput): Promise<SaveVersionResult> {
    const existing = await this.listVersions(scenarioId)
    const hash = contentHash(input.document)
    const latest = existing[0]
    if (latest && latest.contentHash === hash) return { version: latest, created: false }

    const version: ArchitectureVersion = {
      id: newId('v'),
      scenarioId,
      number: (latest?.number ?? 0) + 1,
      createdAt: new Date().toISOString(),
      note: input.note.trim(),
      contentHash: hash,
      document: input.document,
      summary: input.summary,
    }
    const next = [version, ...existing].slice(0, MAX_VERSIONS)
    this.write(VERSIONS_PREFIX + scenarioId, JSON.stringify(next))
    return { version, created: true }
  }
}

export const architectureRepository: ArchitectureRepository =
  new LocalStorageArchitectureRepository()
