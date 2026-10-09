import type { IncidentRepository, IncidentSession, SessionEvent } from '@opsforge/types'

const PREFIX = 'opsforge.incident.session.'

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function safeStorage(): KeyValueStore | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function isSession(value: unknown): value is IncidentSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<IncidentSession>
  return (
    typeof v.scenarioId === 'string' &&
    typeof v.startedAt === 'string' &&
    typeof v.elapsedSeconds === 'number' &&
    Array.isArray(v.events) &&
    v.events.every(
      (e) => typeof e === 'object' && e !== null && typeof (e as SessionEvent).type === 'string',
    )
  )
}

/** Browser persistence until the API exists. Same contract an HTTP repository will implement. */
export class LocalStorageIncidentRepository implements IncidentRepository {
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

  async load(scenarioId: string): Promise<IncidentSession | null> {
    const raw = this.read(PREFIX + scenarioId)
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return isSession(parsed) && parsed.scenarioId === scenarioId ? parsed : null
    } catch {
      return null
    }
  }

  async save(session: IncidentSession): Promise<void> {
    const key = PREFIX + session.scenarioId
    const value = JSON.stringify(session)
    try {
      if (this.store) this.store.setItem(key, value)
      else this.fallback.set(key, value)
    } catch {
      this.fallback.set(key, value)
    }
  }

  async clear(scenarioId: string): Promise<void> {
    const key = PREFIX + scenarioId
    this.fallback.delete(key)
    try {
      this.store?.removeItem(key)
    } catch {
      // storage unavailable; nothing persisted to clear
    }
  }
}

export const incidentRepository: IncidentRepository = new LocalStorageIncidentRepository()
