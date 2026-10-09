import type { PaletteColor, PaletteColorOptions } from '@mui/material/styles'
import type { CSSProperties } from 'react'
import type { layout, motion, radius } from './tokens'

declare module '@mui/material/styles' {
  interface Palette {
    ai: PaletteColor
    border: { subtle: string; default: string; strong: string }
  }
  interface PaletteOptions {
    ai?: PaletteColorOptions
    border?: { subtle: string; default: string; strong: string }
  }
  interface TypeBackground {
    raised: string
    sunken: string
  }
  interface Theme {
    opsforge: {
      radius: typeof radius
      motion: typeof motion
      layout: typeof layout
    }
  }
  interface ThemeOptions {
    opsforge?: Theme['opsforge']
  }
  interface TypographyVariants {
    mono: CSSProperties
    monoSmall: CSSProperties
    metric: CSSProperties
  }
  interface TypographyVariantsOptions {
    mono?: CSSProperties
    monoSmall?: CSSProperties
    metric?: CSSProperties
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    mono: true
    monoSmall: true
    metric: true
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    ai: true
  }
}
declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    ai: true
  }
}
declare module '@mui/material/LinearProgress' {
  interface LinearProgressPropsColorOverrides {
    ai: true
  }
}
declare module '@mui/material/Badge' {
  interface BadgePropsColorOverrides {
    ai: true
  }
}

export {}
