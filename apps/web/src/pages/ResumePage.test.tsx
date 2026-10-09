import { OpsforgeThemeProvider } from '@opsforge/ui'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LocalStorageInterviewRepository } from '../features/interviewer/repository'
import { createResumeRuntime } from '../features/resume/factory'
import { LocalStorageResumeRepository } from '../features/resume/repository'
import { ResumePage } from './ResumePage'

const RESUME = `EXPERIENCE
Acme Corp, Senior DevOps Engineer
- Implemented Kubernetes for 40 services across 3 regions
- Reduced deploy time from 45 to 8 minutes by moving CI to GitHub Actions
- Helped with on-call

SKILLS
Terraform, AWS, Prometheus
`

function renderPage(repository = new LocalStorageResumeRepository(null)) {
  const runtime = createResumeRuntime({
    provider: null,
    repository,
    interviewRepository: new LocalStorageInterviewRepository(null),
  })
  return render(
    <OpsforgeThemeProvider>
      <ResumePage runtime={runtime} />
    </OpsforgeThemeProvider>,
  )
}

describe('ResumePage', { timeout: 20_000 }, () => {
  it('opens on import and says how answers are analysed', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /extract claims/i })).toBeDisabled()
    expect(screen.getByText(/no language model is configured/i)).toBeInTheDocument()
  })

  it('rejects text that is too short', async () => {
    renderPage()
    fireEvent.change(await screen.findByLabelText(/paste resume text/i), {
      target: { value: 'hello' },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract claims/i }))
    expect(await screen.findByText(/too short to be a resume/i)).toBeInTheDocument()
  })

  it('extracts claims, drills a category and shows a scored result', async () => {
    const repository = new LocalStorageResumeRepository(null)
    renderPage(repository)
    fireEvent.change(await screen.findByLabelText(/paste resume text/i), {
      target: { value: RESUME },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract claims/i }))

    const list = await screen.findByRole('list', { name: /resume claims/i })
    const items = within(list).getAllByRole('listitem')
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(within(list).getAllByText('Untested').length).toBeGreaterThan(0)

    const tools = screen.getByRole('table', { name: /tools on your resume/i })
    expect(within(tools).getByText('Kubernetes')).toBeInTheDocument()
    expect(within(tools).getByText('Terraform')).toBeInTheDocument()
    expect(within(tools).getAllByText('Claimed, untested').length).toBeGreaterThan(0)
    const rows = within(tools).getAllByRole('row').length - 1
    expect(
      screen.getByText(`Final count: ${rows} consolidated tools and technologies.`),
    ).toBeInTheDocument()

    fireEvent.click(within(list).getByText(/implemented kubernetes/i))
    expect(screen.getByText(/on your resume: “implemented kubernetes/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /security/i })).toBeInTheDocument()
    expect(
      screen.getByText(/scored against a rubric written for this technology/i),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^security/i }))
    fireEvent.change(screen.getByLabelText(/your answer/i), {
      target: {
        value:
          'We used RBAC with least privilege roles per namespace, network policies for default deny, pod security standards, and secrets from Vault with image scanning.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))

    expect(await screen.findByText(/latest result/i)).toBeInTheDocument()
    expect(screen.getAllByText(/\/100/).length).toBeGreaterThan(0)
    await waitFor(async () => expect((await repository.load())?.attempts).toHaveLength(1))
  })

  it('restores a saved resume and can replace it', async () => {
    const repository = new LocalStorageResumeRepository(null)
    const first = renderPage(repository)
    fireEvent.change(await screen.findByLabelText(/paste resume text/i), {
      target: { value: RESUME },
    })
    fireEvent.click(screen.getByRole('button', { name: /extract claims/i }))
    await screen.findByRole('list', { name: /resume claims/i })
    first.unmount()

    renderPage(repository)
    expect(await screen.findByRole('list', { name: /resume claims/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /replace resume/i }))
    fireEvent.click(await screen.findByRole('button', { name: /^replace$/i }))
    expect(await screen.findByRole('button', { name: /extract claims/i })).toBeInTheDocument()
    expect(await repository.load()).toBeNull()
  })
})
