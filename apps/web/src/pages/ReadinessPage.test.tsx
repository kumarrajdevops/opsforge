import type { ReadinessEvidence } from '@opsforge/types'
import { OpsforgeThemeProvider } from '@opsforge/ui'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LocalStorageSnapshotRepository } from '../features/readiness/snapshots'
import type { EvidenceSource } from '../features/readiness/sources'
import { ReadinessPage } from './ReadinessPage'

const NOW = new Date('2026-06-30T12:00:00Z')

function item(factor: ReadinessEvidence['factor'], score: number, id: string): ReadinessEvidence {
  return {
    id: `${id}:${factor}`,
    attemptId: id,
    origin: 'interview',
    factor,
    score,
    at: '2026-06-29T10:00:00.000Z',
    label: `Interview, ${factor}`,
    topic: 'Terraform',
    basis: 'deterministic',
    gaps: score < 60 ? ['Missed state locking'] : undefined,
  }
}

function renderPage(evidence: ReadinessEvidence[], fail = false) {
  const sources: EvidenceSource[] = [
    {
      origin: 'interview',
      load: async () => {
        if (fail) throw new Error('boom')
        return evidence
      },
    },
    { origin: 'lab', load: async () => [] },
  ]
  return render(
    <OpsforgeThemeProvider>
      <MemoryRouter>
        <ReadinessPage
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

describe('ReadinessPage', { timeout: 20_000 }, () => {
  it('shows an honest empty state with no evidence', async () => {
    renderPage([])
    expect(await screen.findByText(/level 1, learner/i)).toBeInTheDocument()
    expect(screen.getAllByText('No evidence').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/module not built yet/i).length).toBeGreaterThan(0)
  })

  it('does not raise the level from one strong result', async () => {
    renderPage([item('knowledge', 100, 'a'), item('interviews', 100, 'a')])
    expect(await screen.findByText(/level 1, learner/i)).toBeInTheDocument()
    expect(screen.getByText(/what the next level|to reach level 2/i, { exact: false })).toBeTruthy()
  })

  it('shows score, evidence, weaknesses, confidence, trend and next action per factor', async () => {
    renderPage([
      item('knowledge', 40, 'a'),
      item('knowledge', 45, 'b'),
      item('knowledge', 42, 'f'),
      item('confidence', 90, 'c'),
      item('confidence', 88, 'd'),
      item('confidence', 91, 'e'),
    ])
    const factors = await screen.findByRole('region', { name: /readiness factors/i })
    expect(within(factors).getByRole('table', { name: /knowledge evidence/i })).toBeInTheDocument()
    expect(within(factors).getAllByText(/contributing evidence/i).length).toBeGreaterThan(0)
    expect(within(factors).getAllByText(/weaknesses/i).length).toBeGreaterThan(0)
    expect(within(factors).getAllByText(/recommended next action/i).length).toBe(11)
    expect(
      within(factors).getAllByText(/not enough history|improving|declining|steady/i).length,
    ).toBeGreaterThan(0)
    expect(screen.getAllByText(/possible overconfidence/i).length).toBeGreaterThan(0)
  })

  it('names the engine and weights version for audit', async () => {
    renderPage([item('knowledge', 70, 'a')])
    expect(await screen.findByText(/engine 1\.0\.0/i)).toBeInTheDocument()
  })

  it('shows a failing module as unavailable without blanking the page', async () => {
    renderPage([], true)
    expect(await screen.findByText(/could not read saved results/i)).toBeInTheDocument()
    expect(screen.getByText(/level 1, learner/i)).toBeInTheDocument()
  })
})
