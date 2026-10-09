import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, type FormEvent } from 'react'

export type SignInMode = 'sign-in' | 'register'

export interface SignInFormProps {
  mode: SignInMode
  busy: boolean
  error: string | null
  onModeChange(mode: SignInMode): void
  onSubmit(values: { email: string; password: string; displayName: string }): void
}

/** Presentational: owns only the field values. Calling the API is the container's job. */
export function SignInForm({ mode, busy, error, onModeChange, onSubmit }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const registering = mode === 'register'

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit({ email, password, displayName })
  }

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 2 }} noValidate>
      {error && (
        <Alert severity="error" role="alert">
          {error}
        </Alert>
      )}
      {registering && (
        <TextField
          label="Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          autoComplete="name"
          required
        />
      )}
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete={registering ? 'new-password' : 'current-password'}
        helperText={registering ? 'At least 10 characters.' : undefined}
        required
      />
      <Button type="submit" variant="contained" disabled={busy}>
        {registering ? 'Create account' : 'Sign in'}
      </Button>
      <Typography variant="body2" color="text.secondary">
        {registering ? 'Already have an account? ' : 'New here? '}
        <Link
          component="button"
          type="button"
          onClick={() => onModeChange(registering ? 'sign-in' : 'register')}
        >
          {registering ? 'Sign in' : 'Create an account'}
        </Link>
      </Typography>
    </Box>
  )
}
