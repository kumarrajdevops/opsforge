import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { findActiveId } from './modules'

describe('shell', () => {
  beforeEach(() => {
    // Desktop viewport so the permanent sidebar renders.
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }))
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ status: 'ok', service: 'api', version: 'x', dependencies: [] }),
          ),
      ),
    )
  })
  afterEach(() => vi.unstubAllGlobals())

  function renderAt(path: string) {
    return render(
      <OpsforgeThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <App />
        </MemoryRouter>
      </OpsforgeThemeProvider>,
    )
  }

  it('renders navigation, main region and a module page', async () => {
    renderAt('/incidents')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Incidents', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('ForgeOps')).toBeInTheDocument()
  })

  it('marks the active nav item', () => {
    renderAt('/labs')
    expect(screen.getAllByRole('link', { name: /Hands-on Labs/ })[0]).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

describe('findActiveId', () => {
  it('matches root exactly and nested paths by prefix', () => {
    expect(findActiveId('/')).toBe('command-center')
    expect(findActiveId('/knowledge/linux')).toBe('knowledge')
    expect(findActiveId('/nope')).toBeUndefined()
  })
})
