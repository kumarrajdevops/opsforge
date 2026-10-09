import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

/** Small uppercase mono label used to tag instrument-style regions of the page. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="monoSmall"
      component="p"
      sx={{ color: 'text.secondary', letterSpacing: '0.08em', textTransform: 'uppercase', m: 0 }}
    >
      {children}
    </Typography>
  )
}
