import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithTheme } from '../test/renderWithTheme'
import { createOpsforgeTheme } from '../theme/createOpsforgeTheme'
import { toneColors } from '../theme/tones'
import { CodeBlock } from './CodeBlock'
import { ConfirmDialog } from './DialogShell'
import { ProgressBar } from './ProgressBar'
import { ScoreRing } from './ScoreRing'
import { SectionTabs } from './SectionTabs'
import { StatusIndicator } from './StatusIndicator'

describe('theme', () => {
  it('uses Manrope for UI and Roboto Mono for technical text', () => {
    const theme = createOpsforgeTheme('light')
    expect(theme.typography.fontFamily).toContain('Manrope')
    expect(theme.typography.mono.fontFamily).toContain('Roboto Mono')
    expect(theme.typography.metric.fontFamily).toContain('Roboto Mono')
  })

  it('is light-first with a complete dark alternative', () => {
    expect(createOpsforgeTheme('light').palette.background.default).toBe('#F4F6FA')
    expect(createOpsforgeTheme('dark').palette.background.default).toBe('#0B0F14')
  })

  it('derives every tone from the palette', () => {
    const theme = createOpsforgeTheme('light')
    for (const tone of [
      'neutral',
      'primary',
      'ai',
      'success',
      'warning',
      'error',
      'info',
    ] as const) {
      const c = toneColors(theme, tone)
      expect(c.solid).toBeTruthy()
      expect(c.fg).toBeTruthy()
    }
  })
})

describe('ScoreRing', () => {
  it('exposes an accessible meter and clamps out-of-range values', () => {
    renderWithTheme(<ScoreRing label="Interview readiness" value={140} />)
    const meter = screen.getByRole('meter', { name: 'Interview readiness' })
    expect(meter).toHaveAttribute('aria-valuenow', '100')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
  })
})

describe('ProgressBar', () => {
  it('labels the progressbar and shows the percentage', () => {
    renderWithTheme(<ProgressBar label="Kubernetes" value={64} />)
    expect(screen.getByRole('progressbar', { name: 'Kubernetes' })).toHaveAttribute(
      'aria-valuenow',
      '64',
    )
    expect(screen.getByText('64%')).toBeInTheDocument()
  })
})

describe('StatusIndicator', () => {
  it('conveys state with text, not colour alone', () => {
    renderWithTheme(<StatusIndicator status="degraded" />)
    expect(screen.getByRole('status')).toHaveTextContent('Degraded')
  })
})

describe('CodeBlock', () => {
  it('renders lines, a labelled scroll region and copies the raw code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderWithTheme(
      <CodeBlock language="bash" prompt="$" code={'kubectl get pods\nkubectl describe pod api'} />,
    )
    expect(screen.getByLabelText('bash code')).toHaveAttribute('tabindex', '0')
    await userEvent.click(screen.getByRole('button', { name: /copy code/i }))
    expect(writeText).toHaveBeenCalledWith('kubectl get pods\nkubectl describe pod api')
  })
})

describe('SectionTabs', () => {
  it('switches panels and wires aria relationships', async () => {
    renderWithTheme(
      <SectionTabs
        label="Sections"
        items={[
          { id: 'a', label: 'Alpha', content: <p>alpha body</p> },
          { id: 'b', label: 'Beta', content: <p>beta body</p> },
        ]}
      />,
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent('alpha body')
    await userEvent.click(screen.getByRole('tab', { name: 'Beta' }))
    expect(screen.getByRole('tabpanel')).toHaveTextContent('beta body')
  })
})

describe('ConfirmDialog', () => {
  it('invokes confirm and cancel handlers', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    renderWithTheme(
      <ConfirmDialog
        open
        title="Reset sandbox"
        description="This discards changes."
        destructive
        confirmLabel="Reset"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    )
    expect(screen.getByRole('dialog', { name: 'Reset sandbox' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
