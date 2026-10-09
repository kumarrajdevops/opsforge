import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  /** Module / section label above the title, e.g. "ForgeArchitect". */
  eyebrow?: string
  description?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0, maxWidth: 720 }}>
        {eyebrow && (
          <Typography variant="overline" color="primary" component="p" sx={{ m: 0 }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h2" component="h1">
          {title}
        </Typography>
        {description && (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
            {description}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box>}
    </Box>
  )
}
