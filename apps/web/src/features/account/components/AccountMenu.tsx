import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useAccount } from '../accountContext'
import { ApiError } from '../accountApi'
import { SignInForm, type SignInMode } from './SignInForm'

/** Container: top-bar sign-in entry. Shows the account name once signed in. */
export function AccountMenu() {
  const account = useAccount()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<SignInMode>('sign-in')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (account.status === 'checking') return null

  if (account.status === 'signed-in' && account.user) {
    return (
      <>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 160 }}>
          {account.user.displayName}
        </Typography>
        <Button size="small" variant="outlined" onClick={() => void account.signOut()}>
          Sign out
        </Button>
      </>
    )
  }

  async function submit(values: { email: string; password: string; displayName: string }) {
    setBusy(true)
    setError(null)
    try {
      if (mode === 'register') {
        await account.register(values.email, values.password, values.displayName)
      } else {
        await account.signIn(values.email, values.password)
      }
      setOpen(false)
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 0
          ? 'The API is not reachable. Your data stays in this browser until it is.'
          : e instanceof Error
            ? e.message
            : 'Could not sign in.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
        Sign in
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{mode === 'register' ? 'Create your account' : 'Sign in'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Signed in, your readiness history is saved to your account instead of this browser.
          </Typography>
          <SignInForm
            mode={mode}
            busy={busy}
            error={error}
            onModeChange={(next) => {
              setMode(next)
              setError(null)
            }}
            onSubmit={(values) => void submit(values)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
