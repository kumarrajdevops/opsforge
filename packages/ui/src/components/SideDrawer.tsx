import CloseIcon from '@mui/icons-material/Close'
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useId, type ReactNode } from 'react'

export interface SideDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: ReactNode
  anchor?: 'left' | 'right'
  width?: number
  children: ReactNode
  /** Sticky footer (apply / cancel). */
  footer?: ReactNode
}

/** Detail / inspector drawer (component inspector, evidence detail, filters). */
export function SideDrawer({
  open,
  onClose,
  title,
  subtitle,
  anchor = 'right',
  width = 420,
  children,
  footer,
}: SideDrawerProps) {
  const titleId = useId()
  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      slotProps={{ paper: { role: 'dialog', 'aria-labelledby': titleId } as object }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: width }, maxWidth: '100%' } }}
    >
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${theme.palette.border.subtle}`,
        })}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} variant="h4" component="h2">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton aria-label="Close panel" onClick={onClose} size="small" edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>{children}</Box>
      {footer && (
        <Box
          sx={(theme) => ({
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          {footer}
        </Box>
      )}
    </Drawer>
  )
}
