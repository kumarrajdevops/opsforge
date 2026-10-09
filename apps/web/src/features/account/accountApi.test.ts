import { afterEach, describe, expect, it, vi } from 'vitest'
import { accountApi, ApiError, apiRequest } from './accountApi'

function respond(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(body === null ? null : JSON.stringify(body), { status })),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('apiRequest', () => {
  it('returns parsed JSON', async () => {
    respond(200, { id: 'u1' })
    expect(await apiRequest('/api/x')).toEqual({ id: 'u1' })
  })

  it('surfaces the API message on a refusal', async () => {
    respond(401, { detail: 'Incorrect email or password.' })
    await expect(accountApi.login('a@b.co', 'x')).rejects.toMatchObject({
      status: 401,
      message: 'Incorrect email or password.',
    })
  })

  it('reads the first validation message', async () => {
    respond(422, { detail: [{ msg: 'Value error, Enter a valid email address.' }] })
    await expect(accountApi.login('x', 'y')).rejects.toThrow('Enter a valid email address.')
  })

  it('reports an unreachable API as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')))
    const error = await apiRequest('/api/x').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
  })

  it('sends credentials in a JSON body, never in the URL', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await accountApi.login('a@b.co', 'secret-pass')
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/auth/login')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'a@b.co', password: 'secret-pass' })
  })
})
