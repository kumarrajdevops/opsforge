import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { motion, useReducedMotion } from 'framer-motion'
import { toneColors, type Tone } from '../theme/tones'
import { AnimatedNumber } from './AnimatedNumber'

export interface ScoreRingProps {
  value: number
  max?: number
  /** Accessible name, e.g. "Interview readiness". Also shown as the caption unless `caption` is set. */
  label: string
  caption?: string
  tone?: Tone
  size?: number
  thickness?: number
  /** Text in the centre. Defaults to the animated rounded value. */
  display?: string
}

/**
 * Presentational score ring. It never decides what a score means: the caller supplies the
 * value and tone (the readiness engine owns thresholds). The arc and the number animate with
 * Framer Motion and render instantly when the user prefers reduced motion.
 */
export function ScoreRing({
  value,
  max = 100,
  label,
  caption,
  tone = 'primary',
  size = 128,
  thickness = 10,
  display,
}: ScoreRingProps) {
  const theme = useTheme()
  const reduced = useReducedMotion()
  const clamped = Math.min(Math.max(value, 0), max)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / max)

  return (
    <Box
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={clamped}
      sx={{ position: 'relative', width: size, height: size, display: 'inline-flex' }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden focusable="false">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          stroke={alpha(theme.palette.text.primary, 0.08)}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          stroke={toneColors(theme, tone).solid}
          initial={{ strokeDashoffset: reduced ? offset : circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: [0.2, 0, 0, 1] }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography variant="metric" sx={{ fontSize: size * 0.24 }}>
          {display ?? <AnimatedNumber value={clamped} />}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {caption ?? label}
        </Typography>
      </Box>
    </Box>
  )
}
