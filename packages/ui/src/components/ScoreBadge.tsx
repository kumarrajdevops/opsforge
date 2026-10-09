import type { Tone } from '../theme/tones'
import { ToneChip } from './ToneChip'

export interface ScoreBadgeProps {
  score: number | string
  suffix?: string
  tone?: Tone
  /** Accessible description, e.g. "Architecture score". */
  label?: string
}

/** Compact monospace score pill for tables, cards and lists. */
export function ScoreBadge({ score, suffix = '', tone = 'neutral', label }: ScoreBadgeProps) {
  return (
    <ToneChip
      mono
      tone={tone}
      label={`${score}${suffix}`}
      aria-label={label ? `${label}: ${score}${suffix}` : undefined}
      role={label ? 'img' : undefined}
    />
  )
}
