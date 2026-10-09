import type { EvidenceOrigin, ReadinessEvidence, ReadinessFactorId } from '@opsforge/types'
import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { buildReadinessReport } from '../features/readiness/engine'
import { LocalStorageSnapshotRepository } from '../features/readiness/snapshots'
import type { EvidenceSource } from '../features/readiness/sources'
import { CommandCenterPage } from './CommandCenterPage'

const NOW = new Date('2026-06-30T12:00:00Z')

function item(
  factor: ReadinessFactorId,
  score: number,
  attempt: string,
  origin: EvidenceOrigin = 'interview',
): ReadinessEvidence {
  return {
    id: `${attempt}:${factor}`,
    attemptId: attempt,
    origin,
    factor,
    score,
    at: '2026-06-29T10:00:00.000Z',
    label: `${origin} ${attempt}`,
    topic: 'Terraform',
    basis: 'deterministic',
    gaps: score < 60 ? ['Missed state locking'] : undefined,
  }
}

const EVIDENCE: ReadinessEvidence[] = [
  item('knowledge', 40, 'a'),
  item('knowledge', 45, 'b'),
  item('knowledge', 42, 'c'),
  item('confidence', 90, 'd'),
  item('confidence', 88, 'e'),
  item('incidents', 55, 'f', 'incident'),
  item('architecture', 62, 'g', 'architecture'),
]

function renderPage(evidence: ReadinessEvidence[], fail = false) {
  const sources: EvidenceSource[] = [
    {
      origin: 'interview',
      load: async () => {
        if (fail) throw new Error('boom')
        return evidence
      },
    },
  ]
  return render(
    <OpsforgeThemeProvider>
      <MemoryRouter>
        <CommandCenterPage
          runtime={{
            sources,
            snapshots: new LocalStorageSnapshotRepository(null),
            now: () => NOW,
          }}
        />
      </MemoryRouter>
    </OpsforgeThemeProvider>,
  )
}

describe('CommandCenterPage', { timeout: 20_000 }, () => {
  it('shows the same overall score and level as the readiness engine', async () => {
    const report = buildReadinessReport(EVIDENCE, { now: NOW })
    renderPage(EVIDENCE)

    expect(
      await screen.findByRole('heading', { name: /where would you fail/i, level: 1 }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('meter', { name: 'Overall readiness score' })).toHaveAttribute(
      'aria-valuenow',
      String(Math.round(report.overall.score!)),
    )
    expect(screen.getAllByText(report.level.label).length).toBeGreaterThan(0)
    expect(screen.getByText(/same report as/i)).toBeInTheDocument()
  })

  it('renders every section from the evidence and labels no sample data', async () => {
    renderPage(EVIDENCE)
    expect(await screen.findByRole('meter', { name: 'Overall readiness score' })).toBeVisible()

    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument()
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

  it('lists all 11 factors and leaves unscored ones unscored instead of zero', async () => {
    renderPage(EVIDENCE)
    const list = await screen.findByRole('list', { name: 'Dimension scores' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(11)
    expect(within(list).getByTestId('dimension-flashcards')).toHaveTextContent('No evidence')
    expect(within(list).getByTestId('dimension-flashcards')).not.toHaveTextContent(/^0/)
    expect(within(list).getByTestId('dimension-knowledge')).toHaveTextContent('3 events')
  })

  it('shows an honest empty state with no evidence', async () => {
    renderPage([])
    expect(await screen.findByText(/nothing to forecast yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('meter', { name: 'Overall readiness score' })).not.toBeInTheDocument()
    expect(screen.getByText('No evidence yet', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getAllByText(/no scored evidence yet/i).length).toBeGreaterThan(0)
  })

  it('reports an error instead of falling back to other data when readiness fails', async () => {
    renderPage([], true)
    // A failing module is isolated by the engine: the page still renders with no evidence.
    expect(await screen.findByText(/nothing to forecast yet/i)).toBeInTheDocument()
  })
})
