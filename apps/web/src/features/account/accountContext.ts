import type { AccountUser } from '@opsforge/types'
import { createContext, useContext } from 'react'

export type AccountStatus = 'checking' | 'signed-out' | 'signed-in'

export interface AccountState {
  status: AccountStatus
  user: AccountUser | null
  /** The API could not be reached, so data stays in this browser. */
  apiReachable: boolean
  signIn(email: string, password: string): Promise<void>
  register(email: string, password: string, displayName: string): Promise<void>
  signOut(): Promise<void>
}

const SIGNED_OUT: AccountState = {
  status: 'signed-out',
  user: null,
  apiReachable: false,
  signIn: async () => undefined,
  register: async () => undefined,
  signOut: async () => undefined,
}

export const AccountContext = createContext<AccountState>(SIGNED_OUT)

/** Without a provider (unit tests, isolated pages) the app behaves as signed out. */
export function useAccount(): AccountState {
  return useContext(AccountContext)
}
