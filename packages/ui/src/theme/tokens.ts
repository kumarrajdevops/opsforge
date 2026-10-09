/**
 * OPSFORGE design tokens. Single source of truth for colour, radius, motion and type.
 * Components must read these via the MUI theme (never import hex values directly).
 *
 * Spacing: MUI default 8px unit. Dense technical layouts use halves (0.5 = 4px, 1.5 = 12px).
 * Light values are tuned for WCAG AA on white / #F4F6FA; dark values follow the product spec.
 */

export const fontFamily = {
  sans: '"Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
} as const

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const

export const motion = {
  duration: { instant: 90, fast: 140, base: 220, slow: 360 },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const

export const layout = {
  sidebarWidth: 264,
  topBarHeight: 56,
  contentMaxWidth: 1360,
} as const

interface ColorRamp {
  main: string
  light: string
  dark: string
  contrastText: string
}

export interface ModeTokens {
  background: { default: string; paper: string; raised: string; sunken: string }
  border: { subtle: string; default: string; strong: string }
  text: { primary: string; secondary: string; disabled: string }
  primary: ColorRamp
  ai: ColorRamp
  success: ColorRamp
  warning: ColorRamp
  error: ColorRamp
  info: ColorRamp
  shadowRgb: string
  shadowStrength: number
}

export const lightTokens: ModeTokens = {
  background: { default: '#F4F6FA', paper: '#FFFFFF', raised: '#FFFFFF', sunken: '#EDF0F5' },
  border: { subtle: '#E4E8EF', default: '#D5DBE5', strong: '#B3BDCC' },
  text: { primary: '#0F1722', secondary: '#4B5568', disabled: '#8A94A6' },
  primary: { main: '#2563EB', light: '#60A5FA', dark: '#1D4ED8', contrastText: '#FFFFFF' },
  ai: { main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9', contrastText: '#FFFFFF' },
  success: { main: '#047857', light: '#10B981', dark: '#065F46', contrastText: '#FFFFFF' },
  warning: { main: '#B45309', light: '#F59E0B', dark: '#92400E', contrastText: '#FFFFFF' },
  error: { main: '#DC2626', light: '#EF4444', dark: '#B91C1C', contrastText: '#FFFFFF' },
  info: { main: '#0E7490', light: '#22D3EE', dark: '#155E75', contrastText: '#FFFFFF' },
  shadowRgb: '15, 23, 34',
  shadowStrength: 1,
}

export const darkTokens: ModeTokens = {
  background: { default: '#0B0F14', paper: '#111820', raised: '#161E28', sunken: '#0B0F14' },
  border: { subtle: '#1E2733', default: '#26313D', strong: '#3A4859' },
  text: { primary: '#F1F5F9', secondary: '#94A3B8', disabled: '#5B6779' },
  primary: { main: '#3B82F6', light: '#93C5FD', dark: '#2563EB', contrastText: '#0B0F14' },
  ai: { main: '#8B5CF6', light: '#C4B5FD', dark: '#7C3AED', contrastText: '#0B0F14' },
  success: { main: '#10B981', light: '#6EE7B7', dark: '#059669', contrastText: '#0B0F14' },
  warning: { main: '#F59E0B', light: '#FCD34D', dark: '#D97706', contrastText: '#0B0F14' },
  error: { main: '#EF4444', light: '#FCA5A5', dark: '#DC2626', contrastText: '#0B0F14' },
  info: { main: '#22D3EE', light: '#67E8F9', dark: '#0891B2', contrastText: '#0B0F14' },
  shadowRgb: '0, 0, 0',
  shadowStrength: 3,
}
