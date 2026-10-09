import type { InterviewRepository, InterviewSession } from '@opsforge/types'

const PREFIX = 'opsforge.interview.session.'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  readonly length: number
  key(index: number): string | null
}

function safeStorage(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isSession(value: unknown): value is InterviewSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<InterviewSession>
  return (
    typeof v.id === 'string' &&
    v.schemaVersion === 1 &&
    typeof v.startedAt === 'string' &&
    Array.isArray(v.rounds) &&
    typeof v.config === 'object' &&
    v.config !== null
  )
}

/** Browser persistence until the API exists. An HTTP repository will implement the same port. */
export class LocalStorageInterviewRepository implements InterviewRepository {
  private readonly store: KeyValueStore | null
  private readonly fallback = new Map<string, string>()

  constructor(store: KeyValueStore | null = safeStorage()) {
    this.store = store
  }

  private keys(): string[] {
    const keys = new Set<string>()
    for (const key of this.fallback.keys()) if (key.startsWith(PREFIX)) keys.add(key)
    try {
      if (this.store) {
        for (let i = 0; i < this.store.length; i++) {
          const key = this.store.key(i)
          if (key?.startsWith(PREFIX)) keys.add(key)
        }
      }
    } catch {
      // storage unavailable; only in-memory sessions are listed
    }
    return [...keys]
  }

  private read(key: string): string | null {
    try {
      const stored = this.store ? this.store.getItem(key) : null
      return stored ?? this.fallback.get(key) ?? null
    } catch {
      return this.fallback.get(key) ?? null
    }
  }

  private parse(raw: string | null): InterviewSession | null {
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isSession(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  async list(): Promise<InterviewSession[]> {
    return this.keys()
      .map((key) => this.parse(this.read(key)))
      .filter((s): s is InterviewSession => s !== null)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  async load(id: string): Promise<InterviewSession | null> {
    return this.parse(this.read(PREFIX + id))
  }

  async save(session: InterviewSession): Promise<void> {
    const key = PREFIX + session.id
    const value = JSON.stringify(session)
    try {
      if (this.store) this.store.setItem(key, value)
      else this.fallback.set(key, value)
    } catch {
      this.fallback.set(key, value)
    }
  }

  async remove(id: string): Promise<void> {
    const key = PREFIX + id
    this.fallback.delete(key)
    try {
      this.store?.removeItem(key)
    } catch {
      // storage unavailable; nothing persisted to remove
    }
  }
}

export const interviewRepository: InterviewRepository = new LocalStorageInterviewRepository()
