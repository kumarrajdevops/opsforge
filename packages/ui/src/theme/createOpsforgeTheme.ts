import { alpha, createTheme, type Theme } from '@mui/material/styles'
import './augment'
import { createComponents } from './components'
import { createShadows } from './shadows'
import { darkTokens, layout, lightTokens, motion, radius, type ModeTokens } from './tokens'
import { typography } from './typography'

export type ColorMode = 'light' | 'dark'

function buildBase(mode: ColorMode, t: ModeTokens): Theme {
  return createTheme({
    palette: {
      mode,
      primary: t.primary,
      secondary: t.ai,
      ai: t.ai,
      success: t.success,
      warning: t.warning,
      error: t.error,
      info: t.info,
      background: t.background,
      text: t.text,
      border: t.border,
      divider: t.border.subtle,
      action: {
        hover: alpha(t.text.primary, mode === 'light' ? 0.04 : 0.06),
        selected: alpha(t.primary.main, mode === 'light' ? 0.1 : 0.18),
      },
    },
    typography,
    shape: { borderRadius: radius.md },
    spacing: 8,
    shadows: createShadows(t.shadowRgb, t.shadowStrength),
    opsforge: { radius, motion, layout },
  })
}

export function createOpsforgeTheme(mode: ColorMode): Theme {
  const base = buildBase(mode, mode === 'light' ? lightTokens : darkTokens)
  return createTheme(base, { components: createComponents(base) })
}
