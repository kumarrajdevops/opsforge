import { alpha, type Theme } from '@mui/material/styles'

/** Semantic tone shared by every status, score and tag component. */
export type Tone = 'neutral' | 'primary' | 'ai' | 'success' | 'warning' | 'error' | 'info'

export interface ToneColors {
  /** Saturated fill (dots, bars, rings). */
  solid: string
  /** Text/icon colour with AA contrast against `bg` and the page background. */
  fg: string
  /** Soft tinted background. */
  bg: string
  border: string
  /** Text colour when `solid` is used as a background. */
  contrastText: string
}

export function toneColors(theme: Theme, tone: Tone): ToneColors {
  const isLight = theme.palette.mode === 'light'
  if (tone === 'neutral') {
    return {
      solid: theme.palette.text.secondary,
      fg: theme.palette.text.secondary,
      bg: theme.palette.action.hover,
      border: theme.palette.border.default,
      contrastText: theme.palette.background.paper,
    }
  }
  const ramp = theme.palette[tone]
  return {
    solid: ramp.main,
    fg: isLight ? ramp.dark : ramp.light,
    bg: alpha(ramp.main, isLight ? 0.08 : 0.16),
    border: alpha(ramp.main, isLight ? 0.3 : 0.4),
    contrastText: ramp.contrastText,
  }
}
