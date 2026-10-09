import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { buildNavGroups, findActiveId, MODULES } from './modules'

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
    renderAt('/labs')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Hands-on Labs', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('ForgeLab').length).toBeGreaterThan(0)
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

describe('navigation structure', () => {
  it('has the six groups and 16 items in the approved order', () => {
    const groups = buildNavGroups().map((g) => [g.label, g.items.map((i) => i.label)])
    expect(groups).toEqual([
      ['Command', ['Command Center']],
      ['Learn', ['Knowledge', 'Documents', 'Flashcards']],
      ['Practice', ['Questions', 'Scenarios', 'Incidents', 'Hands-on Labs']],
      ['Design', ['Architecture Studio', 'Patterns']],
      ['Interview', ['AI Interviewer', 'Resume Interrogation', 'JD Analyzer', 'Behavioral']],
      ['Analytics', ['Readiness', 'Interview Replay']],
    ])
  })

  it('gives every item a unique route', () => {
    const paths = MODULES.map((m) => m.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(MODULES).toHaveLength(16)
  })

  it('shows roadmap facts on every module that has no page yet', () => {
    const real = [
      'command-center',
      'architecture',
      'incidents',
      'interviewer',
      'resume',
      'jd',
      'readiness',
    ]
    const placeholders = MODULES.filter((m) => !real.includes(m.id))
    expect(placeholders.map((m) => m.id)).toEqual([
      'knowledge',
      'documents',
      'flashcards',
      'questions',
      'scenarios',
      'labs',
      'patterns',
      'behavioral',
      'replay',
    ])
    for (const m of placeholders) expect(m.planned?.phase, m.id).toBeTruthy()
    for (const m of MODULES.filter((x) => real.includes(x.id)))
      expect(m.planned, m.id).toBeUndefined()
  })
})
