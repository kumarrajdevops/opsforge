import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog, { type DialogProps } from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useId, type ReactNode } from 'react'

export interface DialogShellProps extends Omit<DialogProps, 'title' | 'onClose'> {
  title: string
  description?: ReactNode
  onClose: () => void
  /** Footer actions. Omit for content-only dialogs. */
  actions?: ReactNode
}

/** Standard modal: titled, described, dismissible, with a labelled close button and footer actions. */
export function DialogShell({
  title,
  description,
  onClose,
  actions,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  ...props
}: DialogShellProps) {
  const titleId = useId()
  const descriptionId = useId()
  return (
    <Dialog
      {...props}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <DialogTitle component="div" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} variant="h3" component="h2">
            {title}
          </Typography>
          {description && (
            <Typography id={descriptionId} variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        <IconButton aria-label="Close dialog" onClick={onClose} edge="end" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** Use for irreversible actions (reset sandbox, delete document). */
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <DialogShell
      open={open}
      title={title}
      onClose={onClose}
      maxWidth="xs"
      actions={
        <>
          <Button color="inherit" variant="outlined" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant="contained"
            color={destructive ? 'error' : 'primary'}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Typography variant="body1" color="text.secondary">
        {description}
      </Typography>
    </DialogShell>
  )
}
