import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import { toneColors, type Tone } from '../theme/tones'
import { useMountedFlag } from './useMountedFlag'

export interface ScoreRingProps {
  value: number
  max?: number
  /** Accessible name, e.g. "Interview readiness". Also shown as the caption unless `caption` is set. */
  label: string
  caption?: string
  tone?: Tone
  size?: number
  thickness?: number
  /** Text in the centre. Defaults to the rounded value. */
  display?: string
}

/**
 * Presentational score ring. It never decides what a score means: the caller supplies the
 * value and tone (the readiness engine owns thresholds).
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
  const clamped = Math.min(Math.max(value, 0), max)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const mounted = useMountedFlag()
  const offset = circumference * (1 - (mounted ? clamped : 0) / max)

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
        <Box
          component="circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          sx={(theme) => ({ stroke: alpha(theme.palette.text.primary, 0.08) })}
        />
        <Box
          component="circle"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          sx={(theme) => ({
            stroke: toneColors(theme, tone).solid,
            transition: `stroke-dashoffset ${theme.opsforge.motion.duration.slow}ms ${theme.opsforge.motion.easing.emphasized}`,
          })}
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
          {display ?? Math.round(clamped)}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {caption ?? label}
        </Typography>
      </Box>
    </Box>
  )
}
