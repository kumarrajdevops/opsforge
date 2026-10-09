import { OpsforgeThemeProvider } from '@opsforge/ui'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { createJdRuntime } from '../features/jd/factory'
import { LocalStorageJdRepository } from '../features/jd/repository'
import { LocalStorageInterviewRepository } from '../features/interviewer/repository'
import { buildResumeRecord } from '../features/resume/claims'
import { LocalStorageResumeRepository } from '../features/resume/repository'
import { JdPage } from './JdPage'

const JD = `Senior Site Reliability Engineer

Responsibilities
- Design and operate our Kubernetes platform
- Mentor engineers and own incident response

Requirements
- 6+ years running production systems
- Strong experience with Kubernetes and Terraform
- Hands-on AWS experience

Nice to have
- Familiarity with Vault
`

async function renderPage(withResume: boolean) {
  const resumeRepository = new LocalStorageResumeRepository(null)
  if (withResume) {
    await resumeRepository.save(
      buildResumeRecord({
        id: 'r',
        text: 'EXPERIENCE\n- Implemented Kubernetes for 40 services\n- Wrote Terraform modules for AWS\n',
        format: 'paste',
        now: '2026-01-01T00:00:00.000Z',
      }),
    )
  }
  const runtime = createJdRuntime({
    jdRepository: new LocalStorageJdRepository(null),
    resumeRepository,
    interviewRepository: new LocalStorageInterviewRepository(null),
  })
  return render(
    <OpsforgeThemeProvider>
      <MemoryRouter>
        <JdPage runtime={runtime} />
      </MemoryRouter>
    </OpsforgeThemeProvider>,
  )
}

async function analyze(text = JD) {
  fireEvent.change(await screen.findByLabelText(/paste the posting/i), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: /^analyze$/i }))
}

describe('JdPage', { timeout: 20_000 }, () => {
  it('warns when no resume is saved', async () => {
    await renderPage(false)
    expect(await screen.findByText(/no resume is saved yet/i)).toBeInTheDocument()
  })

  it('rejects text that is too short', async () => {
    await renderPage(false)
    fireEvent.change(await screen.findByLabelText(/paste the posting/i), {
      target: { value: 'need a dev' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^analyze$/i }))
    expect(await screen.findByText(/too short to be a job description/i)).toBeInTheDocument()
  })

  it('analyses the posting and compares it with the resume without overstating', async () => {
    await renderPage(true)
    await analyze()
    expect(
      await screen.findByRole('heading', { name: /senior site reliability engineer/i }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /analysis/i }))
    expect(await screen.findByText(/signals point to: senior/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /readiness gap/i }))
    const required = await screen.findByRole('list', { name: /required requirements/i })
    expect(within(required).getAllByText('Claimed, untested').length).toBeGreaterThan(0)
    expect(screen.queryByText('Demonstrated · 0')).toBeInTheDocument()
    expect(screen.getByText(/no scored answers exist yet/i)).toBeInTheDocument()
  })

  it('shows "at least one of" alternatives as one requirement and a learning path', async () => {
    await renderPage(true)
    await analyze(
      [
        'Cloud Engineer',
        '',
        'Requirements',
        '- Hands-on experience with at least one of AWS, Azure or GCP',
        '- Strong Kubernetes experience',
      ].join('\n'),
    )
    fireEvent.click(await screen.findByRole('tab', { name: /readiness gap/i }))
    const required = await screen.findByRole('list', { name: /required requirements/i })
    expect(within(required).getByText('One of AWS / Azure / GCP')).toBeInTheDocument()
    expect(within(required).queryByText('Azure')).not.toBeInTheDocument()
    const options = within(required).getByRole('list', { name: /options for one of aws/i })
    expect(within(options).getAllByRole('listitem')).toHaveLength(3)

    fireEvent.click(screen.getByRole('tab', { name: /learning path/i }))
    expect(await screen.findByText(/^1. /)).toBeInTheDocument()
    expect(screen.getByText(/pick one to prepare/i)).toBeInTheDocument()
  })

  it('lists the tools in the posting with a readiness bar for each', async () => {
    await renderPage(true)
    await analyze()
    fireEvent.click(await screen.findByRole('tab', { name: /^tools/i }))
    const table = await screen.findByRole('table', { name: /tools in the job description/i })
    expect(within(table).getByText('Kubernetes')).toBeInTheDocument()
    expect(within(table).getAllByRole('progressbar').length).toBeGreaterThanOrEqual(3)
    expect(within(table).getByText('HashiCorp Vault')).toBeInTheDocument()
    expect(within(table).getAllByText('Preferred').length).toBeGreaterThan(0)
    const rows = within(table).getAllByRole('row').length - 1
    expect(
      screen.getByText(`Final count: ${rows} consolidated tools and technologies.`),
    ).toBeInTheDocument()
  })

  it('builds a plan with links only to existing modules', async () => {
    await renderPage(true)
    await analyze()
    fireEvent.click(await screen.findByRole('tab', { name: /preparation plan/i }))
    expect(await screen.findByText('Day 1')).toBeInTheDocument()
    const links = screen.getAllByRole('link', { name: /open/i })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(['/resume', '/interviewer', '/incidents', '/architecture']).toContain(
        link.getAttribute('href'),
      )
    }
  })
})
