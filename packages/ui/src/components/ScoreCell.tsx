import Box from '@mui/material/Box'
import { toneColors, type Tone } from '../theme/tones'

export interface ScoreCellProps {
  /** null renders "no evidence", never zero. */
  value: number | null
  tone?: Tone
  /** Accessible name, e.g. "Terraform, hands-on". */
  label: string
}

/** One cell of a skill matrix: tinted by tone with a mono value; dashed when there is no evidence. */
export function ScoreCell({ value, tone = 'neutral', label }: ScoreCellProps) {
  const empty = value === null
  return (
    <Box
      role="img"
      aria-label={empty ? `${label}: no evidence yet` : `${label}: ${Math.round(value)}`}
      sx={(theme) => {
        const c = toneColors(theme, tone)
        return {
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: `${theme.opsforge.radius.sm}px`,
          border: `1px ${empty ? 'dashed' : 'solid'} ${empty ? theme.palette.border.default : c.border}`,
          backgroundColor: empty ? 'transparent' : c.bg,
          color: empty ? theme.palette.text.disabled : c.fg,
          ...theme.typography.monoSmall,
          fontWeight: 700,
        }
      }}
    >
      {empty ? '—' : Math.round(value)}
    </Box>
  )
}
