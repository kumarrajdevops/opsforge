import type { AccountUser } from '@opsforge/types'

/** A request the API refused, with the message it gave. `status` 0 means it could not be reached. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function messageFrom(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const first = detail[0] as { msg?: unknown } | undefined
      if (typeof first?.msg === 'string') return first.msg.replace(/^Value error, /, '')
    }
  }
  return fallback
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

/** JSON request to the API. Auth travels in an httpOnly cookie, so no token is handled here. */
export async function apiRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    })
  } catch {
    throw new ApiError(0, 'The API is not reachable.')
  }
  const parsed = parseJson(await res.text())
  if (!res.ok)
    throw new ApiError(res.status, messageFrom(parsed, `Request failed (${res.status}).`))
  return parsed as T
}

export const accountApi = {
  me: (signal?: AbortSignal) => apiRequest<AccountUser>('/api/auth/me', { signal }),
  login: (email: string, password: string) =>
    apiRequest<AccountUser>('/api/auth/login', { body: { email, password } }),
  register: (email: string, password: string, displayName: string) =>
    apiRequest<AccountUser>('/api/auth/register', { body: { email, password, displayName } }),
  logout: () => apiRequest<null>('/api/auth/logout', { method: 'POST' }),
}

export type AccountApi = typeof accountApi
