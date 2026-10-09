import Chip, { type ChipProps } from '@mui/material/Chip'
import { toneColors, type Tone } from '../theme/tones'
import { fontFamily } from '../theme/tokens'
import { mergeSx } from '../utils/sx'

export interface ToneChipProps extends Omit<ChipProps, 'color' | 'variant'> {
  tone?: Tone
  /** Render the label in the technical monospace face (technologies, versions, metrics). */
  mono?: boolean
}

/** Semantic chip: status, category, technology and level tags. */
export function ToneChip({ tone = 'neutral', mono = false, sx, ...props }: ToneChipProps) {
  return (
    <Chip
      size="small"
      {...props}
      sx={mergeSx((theme) => {
        const c = toneColors(theme, tone)
        return {
          backgroundColor: c.bg,
          color: c.fg,
          border: `1px solid ${c.border}`,
          fontFamily: mono ? fontFamily.mono : undefined,
          '& .MuiChip-icon': { color: 'inherit' },
        }
      }, sx)}
    />
  )
}
