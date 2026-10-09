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

/**
 * One JSON document under one key. Reads validate shape and treat anything unreadable as absent;
 * if storage is blocked or full, the value is kept in memory for the page's lifetime.
 * Pass `null` as the store to force memory-only (tests, private windows).
 */
export class LocalKeyValueDocument<T> {
  private readonly store: KeyValueStore | null
  private readonly key: string
  private readonly isValid: (value: unknown) => value is T
  private memory: string | null = null

  constructor(
    key: string,
    isValid: (value: unknown) => value is T,
    store: KeyValueStore | null | undefined = undefined,
  ) {
    this.key = key
    this.isValid = isValid
    this.store = store === undefined ? safeStorage() : store
  }

  read(): T | null {
    let raw: string | null
    try {
      raw = this.store ? this.store.getItem(this.key) : null
    } catch {
      raw = null
    }
    raw ??= this.memory
    if (!raw) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return this.isValid(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  write(value: T): void {
    const raw = JSON.stringify(value)
    this.memory = raw
    try {
      this.store?.setItem(this.key, raw)
    } catch {
      // quota or blocked storage: the in-memory copy still serves this session
    }
  }

  remove(): void {
    this.memory = null
    try {
      this.store?.removeItem(this.key)
    } catch {
      // nothing to do
    }
  }
}
