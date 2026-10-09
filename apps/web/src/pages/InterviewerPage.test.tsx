import { OpsforgeThemeProvider } from '@opsforge/ui'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createInterviewerRuntime } from '../features/interviewer/factory'
import { LocalStorageInterviewRepository } from '../features/interviewer/repository'
import { InterviewerPage } from './InterviewerPage'

function renderPage() {
  const runtime = createInterviewerRuntime({
    provider: null,
    repository: new LocalStorageInterviewRepository(null),
  })
  return render(
    <OpsforgeThemeProvider>
      <InterviewerPage runtime={runtime} />
    </OpsforgeThemeProvider>,
  )
}

describe('InterviewerPage', { timeout: 20_000 }, () => {
  it('opens on setup and says how answers will be analysed', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /start interview/i })).toBeInTheDocument()
    expect(screen.getByText(/no language model is configured/i)).toBeInTheDocument()
  })

  it('shows no score while the interview is running', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /start interview/i }))
    const answer = await screen.findByLabelText(/your answer/i)
    expect(screen.getByRole('timer')).toBeInTheDocument()
    fireEvent.change(answer, {
      target: {
        value:
          'I would check the rollout status first, then compare the failing pods against the last good revision before deciding to roll back.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    await waitFor(() => expect(screen.getByLabelText(/your answer/i)).toHaveValue(''))
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument()
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
  })

  it('ends the interview on request and opens the debrief, then the replay', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /start interview/i }))
    const answer = await screen.findByLabelText(/your answer/i)
    fireEvent.change(answer, {
      target: {
        value:
          'I would start with the rollout history and the error rate, then roll back to the previous revision and confirm health checks recover.',
      },
    })
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }))
    await screen.findByLabelText(/your answer/i)

    fireEvent.click(screen.getByRole('button', { name: /end interview/i }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      Array.from(dialog.querySelectorAll('button')).find((b) =>
        /end interview/i.test(b.textContent ?? ''),
      )!,
    )

    expect(await screen.findByText(/interview debrief/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: /replay interview/i }))
    expect(await screen.findByText(/interview replay/i)).toBeInTheDocument()
    expect(screen.getAllByText(/your answer/i).length).toBeGreaterThan(0)
  })
})
