import { useTheme } from '@mui/material/styles'
import { toneColors, type Tone } from '@opsforge/ui'
import { useMemo } from 'react'

/** Colours handed to scenes as plain strings: the Canvas is a separate React root without the theme. */
export interface ScenePalette {
  text: string
  muted: string
  surface: string
  border: string
  tones: Record<Tone, string>
}

const TONES: Tone[] = ['neutral', 'primary', 'ai', 'success', 'warning', 'error', 'info']

export function useScenePalette(): ScenePalette {
  const theme = useTheme()
  return useMemo(
    () => ({
      text: theme.palette.text.primary,
      muted: theme.palette.text.secondary,
      surface: theme.palette.background.paper,
      border: theme.palette.border.default,
      tones: Object.fromEntries(TONES.map((t) => [t, toneColors(theme, t).solid])) as Record<
        Tone,
        string
      >,
    }),
    [theme],
  )
}
