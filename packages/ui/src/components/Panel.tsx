import Box from '@mui/material/Box'
import Card, { type CardProps } from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import { useId, type ReactNode } from 'react'
import { mergeSx } from '../utils/sx'

export interface PanelProps extends Omit<CardProps, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  /** Right-aligned header content (buttons, chips, tabs). */
  actions?: ReactNode
  /** Recessed surface for secondary groupings inside another panel. */
  recessed?: boolean
  /** Remove body padding (tables, full-bleed canvases). */
  flush?: boolean
}

/** Standard content container: bordered surface with optional header. Use instead of ad-hoc Cards. */
export function Panel({
  title,
  subtitle,
  actions,
  recessed = false,
  flush = false,
  children,
  sx,
  ...props
}: PanelProps) {
  const titleId = useId()
  return (
    <Card
      component="section"
      aria-labelledby={title ? titleId : undefined}
      {...props}
      sx={mergeSx(
        (theme) => ({
          backgroundColor: recessed
            ? theme.palette.background.sunken
            : theme.palette.background.paper,
          boxShadow: recessed ? 'none' : undefined,
          overflow: 'hidden',
        }),
        sx,
      )}
    >
      {(title || actions) && (
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          <Box sx={{ minWidth: 0 }}>
            {title && (
              <Typography id={titleId} variant="h5" component="h2" noWrap>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ p: flush ? 0 : 2.5 }}>{children}</Box>
    </Card>
  )
}
