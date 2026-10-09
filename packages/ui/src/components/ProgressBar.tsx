import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { useId } from 'react'
import { toneColors, type Tone } from '../theme/tones'
import { useMountedFlag } from './useMountedFlag'

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
  const percent = (Math.min(Math.max(value, 0), max) / max) * 100
  const mounted = useMountedFlag()

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
        <LinearProgress
          variant="determinate"
          value={percent}
          aria-labelledby={labelId}
          sx={(theme) => ({
            '& .MuiLinearProgress-bar': {
              backgroundColor: toneColors(theme, tone).solid,
              transform: `translateX(-${100 - (mounted ? percent : 0)}%) !important`,
              transition: `transform ${theme.opsforge.motion.duration.slow}ms ${theme.opsforge.motion.easing.emphasized}`,
            },
          })}
        />
        {target !== undefined && (
          <Box
            title={`${targetLabel}: ${target}`}
            sx={(theme) => ({
              position: 'absolute',
              top: -3,
              bottom: -3,
              left: `${(Math.min(Math.max(target, 0), max) / max) * 100}%`,
              width: 2,
              borderRadius: 1,
              backgroundColor: theme.palette.text.primary,
            })}
          />
        )}
      </Box>
    </Box>
  )
}
