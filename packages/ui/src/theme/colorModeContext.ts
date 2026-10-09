import { createContext } from 'react'
import type { ColorMode } from './createOpsforgeTheme'

export type ColorModePreference = ColorMode | 'system'

export interface ColorModeContextValue {
  preference: ColorModePreference
  resolved: ColorMode
  setPreference: (next: ColorModePreference) => void
}

export const ColorModeContext = createContext<ColorModeContextValue | null>(null)
