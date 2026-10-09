import { OpsforgeThemeProvider } from '@opsforge/ui'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { IncidentSimulatorPage } from './IncidentSimulatorPage'

function renderPage() {
  return render(
    <OpsforgeThemeProvider>
      <IncidentSimulatorPage />
    </OpsforgeThemeProvider>,
  )
}

/** The console is three columns from xl; pretend the viewport is wide. */
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

async function begin() {
  renderPage()
  fireEvent.click(await screen.findByRole('button', { name: /take the page/i }))
}

describe('IncidentSimulatorPage', { timeout: 20_000 }, () => {
  beforeEach(() => {
    window.localStorage.clear()
    useWideViewport()
  })

  it('opens on a briefing that does not reveal the cause', async () => {
    renderPage()
    expect(await screen.findByText(/incident briefing/i)).toBeInTheDocument()
    expect(screen.queryByRole('log', { name: /terminal output/i })).not.toBeInTheDocument()
  })

  it('shows the operations console once the page is taken', async () => {
    await begin()
    expect(
      await screen.findByRole('complementary', { name: /incident overview/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: /terminal/i })).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: /investigation workspace/i }),
    ).toBeInTheDocument()
  })

  it('reveals evidence only after the candidate investigates', async () => {
    await begin()
    const workspace = await screen.findByRole('complementary', { name: /investigation workspace/i })
    expect(within(workspace).queryByText(/pods are 8 minutes old/i)).not.toBeInTheDocument()

    const input = screen.getByLabelText(/terminal command/i)
    fireEvent.change(input, { target: { value: 'kubectl get pods -n payments' } })
    fireEvent.submit(input.closest('form')!)

    expect(
      (await within(workspace).findAllByText(/pods are 8 minutes old/i)).length,
    ).toBeGreaterThan(0)
  })

  it('does not score an untouched session on submit', async () => {
    await begin()
    fireEvent.click(await screen.findByRole('button', { name: /submit/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^submit$/i, hidden: false }))
    expect((await screen.findAllByText(/not attempted/i)).length).toBeGreaterThan(0)
  })
})
