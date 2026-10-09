import { OpsforgeThemeProvider } from '@opsforge/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app/App'
import { AccountProvider } from './features/account/AccountProvider'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <OpsforgeThemeProvider>
      <BrowserRouter>
        <AccountProvider>
          <App />
        </AccountProvider>
      </BrowserRouter>
    </OpsforgeThemeProvider>
  </StrictMode>,
)
