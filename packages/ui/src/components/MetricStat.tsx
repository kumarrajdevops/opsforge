import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { toneColors, type Tone } from '../theme/tones'

export interface MetricStatProps {
  label: string
  value: ReactNode
  unit?: string
  /** Change vs a previous period, e.g. "+4 pts". Text is required so colour is never the only signal. */
  delta?: { text: string; tone: Tone }
  helper?: string
}

/** Headline number with label, unit and optional delta (monospace, tabular figures). */
export function MetricStat({ label, value, unit, delta, helper }: MetricStatProps) {
  return (
    <Box>
      <Typography variant="overline" color="text.secondary" component="div">
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mt: 0.5 }}>
        <Typography variant="metric" component="div">
          {value}
        </Typography>
        {unit && (
          <Typography variant="monoSmall" color="text.secondary">
            {unit}
          </Typography>
        )}
        {delta && (
          <Typography
            variant="monoSmall"
            sx={(theme) => ({ fontWeight: 600, color: toneColors(theme, delta.tone).fg })}
          >
            {delta.text}
          </Typography>
        )}
      </Box>
      {helper && (
        <Typography variant="caption" color="text.secondary">
          {helper}
        </Typography>
      )}
    </Box>
  )
}
