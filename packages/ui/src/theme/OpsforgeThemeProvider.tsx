import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ColorModeContext, type ColorModePreference } from './colorModeContext'
import { createOpsforgeTheme } from './createOpsforgeTheme'
import './fonts'

const STORAGE_KEY = 'opsforge.color-mode'
const DARK_QUERY = '(prefers-color-scheme: dark)'

function readStoredPreference(fallback: ColorModePreference): ColorModePreference {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : fallback
  } catch {
    return fallback
  }
}

function subscribeToSystemMode(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const systemPrefersDark = () => window.matchMedia(DARK_QUERY).matches

export interface OpsforgeThemeProviderProps {
  children: ReactNode
  /** Light is the product default; "system" follows the OS. */
  defaultPreference?: ColorModePreference
}

export function OpsforgeThemeProvider({
  children,
  defaultPreference = 'light',
}: OpsforgeThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ColorModePreference>(() =>
    readStoredPreference(defaultPreference),
  )
  const prefersDark = useSyncExternalStore(subscribeToSystemMode, systemPrefersDark, () => false)

  const resolved = preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference

  const setPreference = useCallback((next: ColorModePreference) => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* storage unavailable (private mode): preference lasts for this session only */
    }
  }, [])

  const theme = useMemo(() => createOpsforgeTheme(resolved), [resolved])
  const ctx = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  )

  return (
    <ColorModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}
