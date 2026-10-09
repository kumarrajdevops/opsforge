import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { keyframes } from '@mui/material/styles'
import { toneColors, type Tone } from '../theme/tones'

export type Status = 'healthy' | 'degraded' | 'critical' | 'info' | 'unknown'

const STATUS: Record<Status, { tone: Tone; label: string }> = {
  healthy: { tone: 'success', label: 'Healthy' },
  degraded: { tone: 'warning', label: 'Degraded' },
  critical: { tone: 'error', label: 'Critical' },
  info: { tone: 'info', label: 'Info' },
  unknown: { tone: 'neutral', label: 'Unknown' },
}

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 var(--pulse-color); }
  70% { box-shadow: 0 0 0 6px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`

export interface StatusIndicatorProps {
  status: Status
  /** Overrides the default text. State is always conveyed by text, never colour alone. */
  label?: string
  /** Animate the dot to signal a live, changing state (disabled under reduced motion). */
  pulse?: boolean
  /** `dot` is inline; `pill` adds a tinted container. */
  variant?: 'dot' | 'pill'
}

export function StatusIndicator({
  status,
  label,
  pulse: pulsing = false,
  variant = 'dot',
}: StatusIndicatorProps) {
  const { tone, label: defaultLabel } = STATUS[status]
  return (
    <Box
      role="status"
      sx={(theme) => {
        const c = toneColors(theme, tone)
        return {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          ...(variant === 'pill' && {
            px: 1,
            py: 0.25,
            borderRadius: `${theme.opsforge.radius.pill}px`,
            backgroundColor: c.bg,
            border: `1px solid ${c.border}`,
          }),
        }
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => {
          const c = toneColors(theme, tone)
          return {
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: c.solid,
            flexShrink: 0,
            '--pulse-color': c.border,
            animation: pulsing ? `${pulse} 1.8s ease-out infinite` : 'none',
          }
        }}
      />
      <Typography
        variant="caption"
        sx={(theme) => ({ fontWeight: 700, color: toneColors(theme, tone).fg })}
      >
        {label ?? defaultLabel}
      </Typography>
    </Box>
  )
}
