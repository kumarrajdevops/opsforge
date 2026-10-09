import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AccountProvider } from '../AccountProvider'
import { ApiError, type AccountApi } from '../accountApi'
import { AccountMenu } from './AccountMenu'

const USER = { id: 'u1', email: 'ada@example.com', displayName: 'Ada', createdAt: '2026-01-01' }

function apiWith(overrides: Partial<AccountApi>): AccountApi {
  return {
    me: vi.fn().mockRejectedValue(new ApiError(401, 'Sign in to continue.')),
    login: vi.fn().mockResolvedValue(USER),
    register: vi.fn().mockResolvedValue(USER),
    logout: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function renderMenu(api: AccountApi) {
  return render(
    <OpsforgeThemeProvider>
      <AccountProvider api={api}>
        <AccountMenu />
      </AccountProvider>
    </OpsforgeThemeProvider>,
  )
}

async function submitCredentials(password: string) {
  await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
  await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), password)
  const buttons = screen.getAllByRole('button', { name: 'Sign in' })
  await userEvent.click(buttons[buttons.length - 1] as HTMLElement)
}

describe('AccountMenu', () => {
  it('offers sign in when there is no session', async () => {
    renderMenu(apiWith({}))
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('shows the name and a sign-out button when a session exists', async () => {
    const api = apiWith({ me: vi.fn().mockResolvedValue(USER) })
    renderMenu(api)
    expect(await screen.findByText('Ada')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(api.logout).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('signs in through the dialog', async () => {
    const api = apiWith({})
    renderMenu(api)
    await submitCredentials('correct horse battery')
    await waitFor(() =>
      expect(api.login).toHaveBeenCalledWith('ada@example.com', 'correct horse battery'),
    )
    expect(await screen.findByText('Ada')).toBeInTheDocument()
  })

  it('shows the API message when sign in is refused', async () => {
    const api = apiWith({
      login: vi.fn().mockRejectedValue(new ApiError(401, 'Incorrect email or password.')),
    })
    renderMenu(api)
    await submitCredentials('wrong')
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
  })
})
