import type { AccountUser } from '@opsforge/types'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AccountContext, type AccountState, type AccountStatus } from './accountContext'
import { accountApi, ApiError, type AccountApi } from './accountApi'

export function AccountProvider({
  children,
  api = accountApi,
}: {
  children: ReactNode
  api?: AccountApi
}) {
  const [status, setStatus] = useState<AccountStatus>('checking')
  const [user, setUser] = useState<AccountUser | null>(null)
  const [apiReachable, setApiReachable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    api
      .me(controller.signal)
      .then((me) => {
        setUser(me)
        setStatus('signed-in')
        setApiReachable(true)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setApiReachable(error instanceof ApiError && error.status === 401)
        setStatus('signed-out')
      })
    return () => controller.abort()
  }, [api])

  const adopt = useCallback((me: AccountUser) => {
    setUser(me)
    setApiReachable(true)
    setStatus('signed-in')
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => adopt(await api.login(email, password)),
    [api, adopt],
  )
  const register = useCallback(
    async (email: string, password: string, displayName: string) =>
      adopt(await api.register(email, password, displayName)),
    [api, adopt],
  )
  const signOut = useCallback(async () => {
    await api.logout()
    setUser(null)
    setStatus('signed-out')
  }, [api])

  const value = useMemo<AccountState>(
    () => ({ status, user, apiReachable, signIn, register, signOut }),
    [status, user, apiReachable, signIn, register, signOut],
  )
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}
