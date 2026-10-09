import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { DialogShell } from '@opsforge/ui'
import { useState } from 'react'

export interface SaveVersionDialogProps {
  open: boolean
  onClose: () => void
  onSave: (note: string) => Promise<unknown>
}

/** Remount-on-open (parent renders it conditionally) keeps the form state fresh. */
export function SaveVersionDialog({ open, onClose, onSave }: SaveVersionDialogProps) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await onSave(note.trim())
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the version.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Save version"
      description="Records the current design and its deterministic score. Saving an unchanged design does not create a new version."
      actions={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            Save version
          </Button>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <TextField
        autoFocus
        fullWidth
        size="small"
        label="Note (optional)"
        placeholder="What changed and why"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        slotProps={{ htmlInput: { maxLength: 160 } }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !busy) void submit()
        }}
      />
    </DialogShell>
  )
}
