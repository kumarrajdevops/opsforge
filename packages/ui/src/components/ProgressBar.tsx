import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { toneColors, type Tone } from '../theme/tones'

export interface ProgressBarProps {
  label: string
  value: number
  max?: number
  tone?: Tone
  /** Text at the right of the label row. Defaults to the rounded percentage. */
  valueLabel?: string
  /** Optional benchmark marker (same unit as `value`), e.g. the senior target. */
  target?: number
  targetLabel?: string
}

/** Labelled linear progress / score bar with an optional target marker. */
export function ProgressBar({
  label,
  value,
  max = 100,
  tone = 'primary',
  valueLabel,
  target,
  targetLabel = 'Target',
}: ProgressBarProps) {
  const labelId = useId()
  const theme = useTheme()
  const reduced = useReducedMotion()
  const fraction = Math.min(Math.max(value, 0), max) / max
  const percent = fraction * 100

  return (
    <Box>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.75 }}
      >
        <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="monoSmall" color="text.secondary">
          {valueLabel ?? `${Math.round(percent)}%`}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Box
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
          sx={{
            height: 6,
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: alpha(theme.palette.text.primary, 0.08),
          }}
        >
          <motion.div
            style={{
              height: '100%',
              width: '100%',
              originX: 0,
              borderRadius: 3,
              backgroundColor: toneColors(theme, tone).solid,
            }}
            initial={{ scaleX: reduced ? fraction : 0 }}
            animate={{ scaleX: fraction }}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0, 0, 1] }}
          />
        </Box>
        {target !== undefined && (
          <Box
            title={`${targetLabel}: ${target}`}
            sx={{
              position: 'absolute',
              top: -3,
              bottom: -3,
              left: `${(Math.min(Math.max(target, 0), max) / max) * 100}%`,
              width: 2,
              borderRadius: 1,
              backgroundColor: theme.palette.text.primary,
            }}
          />
        )}
      </Box>
    </Box>
  )
}
