import Box from '@mui/material/Box'
import { alpha, keyframes } from '@mui/material/styles'

const breathe = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50% { transform: scale(1.18); opacity: 0.2; }
`

/** Quiet presence indicator for the interviewer. It pulses only while `active` and never under reduced motion. */
export function InterviewerOrb({ active = false, size = 44 }: { active?: boolean; size?: number }) {
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        position: 'relative',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 35% 30%, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
        boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.12)}`,
        '&::after': {
          content: '""',
          position: 'absolute',
          inset: -6,
          borderRadius: '50%',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
          animation: active ? `${breathe} 3.2s ease-in-out infinite` : 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        },
      })}
    />
  )
}
