import type { TypographyVariantsOptions } from '@mui/material/styles'
import { fontFamily } from './tokens'

const tabularNums = { fontVariantNumeric: 'tabular-nums' } as const

export const typography: TypographyVariantsOptions = {
  fontFamily: fontFamily.sans,
  fontWeightRegular: 400,
  fontWeightMedium: 600,
  fontWeightBold: 700,
  h1: { fontSize: '2rem', lineHeight: 1.2, fontWeight: 800, letterSpacing: '-0.02em' },
  h2: { fontSize: '1.5rem', lineHeight: 1.25, fontWeight: 800, letterSpacing: '-0.015em' },
  h3: { fontSize: '1.25rem', lineHeight: 1.3, fontWeight: 700, letterSpacing: '-0.01em' },
  h4: { fontSize: '1.0625rem', lineHeight: 1.35, fontWeight: 700 },
  h5: { fontSize: '0.9375rem', lineHeight: 1.4, fontWeight: 700 },
  h6: { fontSize: '0.8125rem', lineHeight: 1.4, fontWeight: 700 },
  subtitle1: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 600 },
  subtitle2: { fontSize: '0.875rem', lineHeight: 1.45, fontWeight: 600 },
  body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
  caption: { fontSize: '0.75rem', lineHeight: 1.4 },
  overline: {
    fontSize: '0.6875rem',
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
  },
  button: { fontSize: '0.8125rem', fontWeight: 700, textTransform: 'none', letterSpacing: 0 },
  mono: { fontFamily: fontFamily.mono, fontSize: '0.8125rem', lineHeight: 1.6, ...tabularNums },
  monoSmall: { fontFamily: fontFamily.mono, fontSize: '0.75rem', lineHeight: 1.5, ...tabularNums },
  metric: {
    fontFamily: fontFamily.mono,
    fontSize: '1.5rem',
    lineHeight: 1.1,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    ...tabularNums,
  },
}
