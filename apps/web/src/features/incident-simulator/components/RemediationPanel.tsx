import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { RemediationAction } from '@opsforge/types'
import { ConfirmDialog, ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { formatElapsed } from '../engine'
import { riskTone } from '../presentation'

export interface RemediationPanelProps {
  actions: RemediationAction[]
  applied: Map<string, { at: number }>
  resolved: boolean
  disabled: boolean
  onApply: (actionId: string) => void
}

/** Mitigations. Applying one is recorded and judged against the evidence gathered before it. */
export function RemediationPanel({
  actions,
  applied,
  resolved,
  disabled,
  onApply,
}: RemediationPanelProps) {
  const [pending, setPending] = useState<RemediationAction | null>(null)

  return (
    <Box sx={{ p: 2, display: 'grid', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        Pick the least risky action that the evidence supports. Some options only appear once you
        know enough to propose them.
      </Typography>
      {resolved && (
        <Typography variant="body2" role="status" sx={{ color: 'success.main', fontWeight: 600 }}>
          Service has recovered. Verify, communicate, then write the RCA.
        </Typography>
      )}
      {actions.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No actions available yet. Keep investigating.
        </Typography>
      )}
      <Box
        component="ul"
        aria-label="Remediation actions"
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}
      >
        {actions.map((action) => {
          const done = applied.get(action.id)
          return (
            <Box
              component="li"
              key={action.id}
              sx={(theme) => ({
                p: 1.5,
                borderRadius: `${theme.opsforge.radius.md}px`,
                border: `1px solid ${theme.palette.border.subtle}`,
                display: 'grid',
                gap: 0.75,
              })}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                  {action.label}
                </Typography>
                <ToneChip tone={riskTone[action.risk]} label={`${action.risk} risk`} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {action.description}
              </Typography>
              {done ? (
                <>
                  <Typography variant="caption" color="text.secondary">
                    Applied at {formatElapsed(done.at)}
                  </Typography>
                  <Typography
                    variant="monoSmall"
                    component="pre"
                    sx={{ m: 0, whiteSpace: 'pre-wrap' }}
                  >
                    {action.result}
                  </Typography>
                </>
              ) : (
                <Box>
                  <Button
                    size="small"
                    variant="outlined"
                    color={action.risk === 'high' ? 'error' : 'primary'}
                    disabled={disabled || resolved}
                    onClick={() => setPending(action)}
                  >
                    Apply
                  </Button>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Apply: ${pending.label}?` : ''}
        description={
          pending
            ? `${pending.description} This is recorded in the session and reviewed in the debrief.`
            : ''
        }
        confirmLabel="Apply"
        destructive={pending?.risk === 'high'}
        onClose={() => setPending(null)}
        onConfirm={() => {
          if (pending) onApply(pending.id)
          setPending(null)
        }}
      />
    </Box>
  )
}
