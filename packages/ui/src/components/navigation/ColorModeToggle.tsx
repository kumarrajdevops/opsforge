import BrightnessAutoIcon from '@mui/icons-material/BrightnessAuto'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useColorMode } from '../../theme/useColorMode'
import type { ColorModePreference } from '../../theme/colorModeContext'

const NEXT: Record<ColorModePreference, ColorModePreference> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const LABEL: Record<ColorModePreference, string> = {
  light: 'Light theme',
  dark: 'Dark theme',
  system: 'System theme',
}

const ICON: Record<ColorModePreference, typeof LightModeIcon> = {
  light: LightModeIcon,
  dark: DarkModeIcon,
  system: BrightnessAutoIcon,
}

/** Cycles light → dark → system. Announces the current and next mode. */
export function ColorModeToggle() {
  const { preference, setPreference } = useColorMode()
  const Icon = ICON[preference]
  const title = `${LABEL[preference]} (switch to ${LABEL[NEXT[preference]].toLowerCase()})`
  return (
    <Tooltip title={title}>
      <IconButton aria-label={title} onClick={() => setPreference(NEXT[preference])}>
        <Icon fontSize="small" />
      </IconButton>
    </Tooltip>
  )
}
