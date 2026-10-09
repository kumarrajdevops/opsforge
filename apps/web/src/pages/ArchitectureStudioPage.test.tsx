import { OpsforgeThemeProvider } from '@opsforge/ui'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ArchitectureStudioPage } from './ArchitectureStudioPage'

function renderPage() {
  return render(
    <OpsforgeThemeProvider>
      <ArchitectureStudioPage />
    </OpsforgeThemeProvider>,
  )
}

/** The studio switches to drawers below the lg breakpoint; pretend the viewport is wide. */
function useWideViewport() {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList
}

describe('ArchitectureStudioPage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWideViewport()
  })

  it('shows the toolbar, palette and a deterministic score for the starter design', async () => {
    renderPage()
    expect(await screen.findByRole('toolbar', { name: /architecture studio/i })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /architecture canvas/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /component palette/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /simulate failure/i })).toBeInTheDocument()
    expect(await screen.findByLabelText(/architecture score/i)).toBeInTheDocument()
  })

  it('lists all twelve dimensions on the evaluation tab', async () => {
    renderPage()
    await screen.findByLabelText(/architecture score/i)
    for (const label of [
      'Requirements',
      'Scalability',
      'Availability',
      'Reliability',
      'Security',
      'Networking',
      'Data',
      'Disaster recovery',
      'Observability',
      'CI/CD',
      'Cost',
      'Operational complexity',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('does not fake an AI review when no provider is registered', async () => {
    renderPage()
    await screen.findByLabelText(/architecture score/i)
    fireEvent.click(screen.getByRole('button', { name: /^review$/i }))
    expect(await screen.findByText(/no review provider is configured/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /review with/i })).not.toBeInTheDocument()
  })

  it('adds a component from the palette and saves a version', async () => {
    renderPage()
    await screen.findByLabelText(/architecture score/i)

    fireEvent.change(screen.getByRole('searchbox', { name: /search components/i }), {
      target: { value: 'kafka' },
    })
    const add = await screen.findAllByRole('button', { name: /^add .*kafka/i })
    fireEvent.click(add[0]!)

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^save version$/i }))
    await waitFor(() => expect(screen.getByText(/Saved · v1/)).toBeInTheDocument())
  })
})
