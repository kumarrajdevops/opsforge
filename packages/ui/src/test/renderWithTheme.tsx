import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { OpsforgeThemeProvider } from '../theme/OpsforgeThemeProvider'

export function renderWithTheme(ui: ReactElement) {
  return render(<OpsforgeThemeProvider>{ui}</OpsforgeThemeProvider>)
}
