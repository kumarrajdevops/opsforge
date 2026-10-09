import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { buildSampleSnapshot } from '../features/command-center/sampleSnapshot'
import { formatRelative, formatSigned } from '../features/command-center/presentation'
import { CommandCenterPage } from './CommandCenterPage'

function renderPage() {
  return render(
    <OpsforgeThemeProvider>
      <MemoryRouter>
        <CommandCenterPage />
      </MemoryRouter>
    </OpsforgeThemeProvider>,
  )
}

describe('CommandCenterPage', { timeout: 20_000 }, () => {
  it('renders every required section', async () => {
    renderPage()
    expect(
      await screen.findByRole('heading', { name: /where would you fail/i, level: 1 }),
    ).toBeInTheDocument()

    expect(screen.getByRole('meter', { name: 'Overall readiness score' })).toHaveAttribute(
      'aria-valuenow',
      '63',
    )
    expect(screen.getAllByText('Interview Ready').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: /you would most likely fail here/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Readiness profile' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Skill matrix' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Recommended next action' })).toBeInTheDocument()
    for (const name of [
      'Weakest skills',
      'Today’s adaptive plan',
      'Continue training',
      'Recent interview evidence',
      'Recent incidents',
      'Architecture progress',
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })

  it('shows all nine evidence dimensions', async () => {
    renderPage()
    const list = await screen.findByRole('list', { name: 'Dimension scores' })
    const labels = [
      'Knowledge',
      'Practice',
      'Hands-on',
      'Troubleshooting',
      'Architecture',
      'Security',
      'Communication',
      'Confidence',
      'Incident response',
    ]
    for (const label of labels) {
      expect(within(list).getByText(label)).toBeInTheDocument()
    }
    expect(within(list).getAllByRole('listitem')).toHaveLength(9)
  })

  it('labels the data as sample data while the engine is not connected', async () => {
    renderPage()
    expect(await screen.findByText('Readiness engine not connected')).toBeInTheDocument()
    expect(screen.getByText('Sample data')).toBeInTheDocument()
  })

  it('never renders a missing skill cell as zero', async () => {
    renderPage()
    const table = await screen.findByRole('table', { name: 'Skill matrix' })
    expect(within(table).getAllByRole('img', { name: /no evidence yet/ }).length).toBeGreaterThan(0)
    expect(within(table).queryByRole('img', { name: /: 0$/ })).not.toBeInTheDocument()
  })

  it('links the recommended action to its module', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /start now/i })).toHaveAttribute(
      'href',
      '/questions',
    )
  })
})

describe('sample snapshot', () => {
  it('is internally consistent', () => {
    const snapshot = buildSampleSnapshot(new Date('2026-01-01T12:00:00Z'))
    expect(snapshot.dimensions).toHaveLength(9)
    expect(snapshot.overall.trend.at(-1)?.score).toBe(snapshot.overall.score)
    expect(
      snapshot.plan.items.filter((i) => i.status === 'done').reduce((n, i) => n + i.minutes, 0),
    ).toBe(snapshot.plan.completedMinutes)
    expect(snapshot.plan.items.reduce((n, i) => n + i.minutes, 0)).toBe(snapshot.plan.totalMinutes)
    for (const skill of snapshot.weakestSkills) {
      expect(snapshot.skills.some((s) => s.id === skill.skillId)).toBe(true)
    }
  })
})

describe('presentation helpers', () => {
  it('formats signed deltas', () => {
    expect(formatSigned(2)).toBe('+2')
    expect(formatSigned(-1)).toBe('−1')
    expect(formatSigned(0)).toBe('±0')
    expect(formatSigned(-0.6, 1)).toBe('−0.6')
  })

  it('formats relative time', () => {
    const now = new Date('2026-01-02T12:00:00Z')
    expect(formatRelative('2026-01-02T11:42:00Z', now)).toBe('18m ago')
    expect(formatRelative('2026-01-02T06:00:00Z', now)).toBe('6h ago')
    expect(formatRelative('2025-12-30T12:00:00Z', now)).toBe('3d ago')
  })
})
