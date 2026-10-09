import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { ToneChip } from '@opsforge/ui'
import { DIMENSIONS } from '../evaluator'
import { severityLabel, severityTone } from '../presentation'
import type { ArchitectureReviewState } from '../useArchitectureReview'

const dimensionLabel: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d.label]),
)

export interface ReviewPanelProps {
  review: ArchitectureReviewState
  nodeCount: number
  onSelectNodes: (nodeIds: string[]) => void
}

/** AI review adds qualitative evidence. It never changes a score. */
export function ReviewPanel({ review, nodeCount, onSelectNodes }: ReviewPanelProps) {
  const { providers, run, stale } = review

  return (
    <Box sx={{ display: 'grid', gap: 2, p: 2 }}>
      <Alert severity="info" icon={<AutoAwesomeOutlined fontSize="inherit" />}>
        AI review adds findings and strength/gap notes. Scores come only from the deterministic
        checks.
      </Alert>

      {providers.length === 0 ? (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2">No review provider is configured</Typography>
          <Typography variant="body2" color="text.secondary">
            The review contract is in place: a provider receives the scenario, the design and the
            deterministic result, and returns findings and signals that are validated before they
            are shown. Register a provider to enable this panel. Nothing is simulated here.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Would be sent for review: {nodeCount} component{nodeCount === 1 ? '' : 's'}, the
            scenario requirements and the {review.request.evaluation.checks.length} deterministic
            check results.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {providers.map((p) => (
            <Button
              key={p.id}
              variant={providers.length === 1 ? 'contained' : 'outlined'}
              disabled={nodeCount === 0 || run?.status === 'loading'}
              onClick={() => review.start(p.id)}
            >
              Review with {p.name}
            </Button>
          ))}
        </Box>
      )}

      {run?.status === 'loading' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }} role="status">
          <CircularProgress size={18} />
          <Typography variant="body2">Reviewing…</Typography>
          <Button size="small" onClick={review.cancel}>
            Cancel
          </Button>
        </Box>
      )}

      {run?.status === 'error' && <Alert severity="error">{run.message}</Alert>}

      {run?.status === 'ready' && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {stale && (
            <Alert severity="warning">
              The design changed after this review. Run it again for current results.
            </Alert>
          )}
          <Typography variant="body2">{run.result.summary}</Typography>

          {run.result.signals.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" component="h3">
                Signals
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}
              >
                {run.result.signals.map((s, i) => (
                  <Box
                    component="li"
                    key={i}
                    sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
                  >
                    <ToneChip
                      tone={s.strength === 'strength' ? 'success' : 'warning'}
                      label={s.strength === 'strength' ? 'Strength' : 'Gap'}
                    />
                    <Typography variant="body2">
                      <strong>{dimensionLabel[s.dimension]}.</strong> {s.note}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="overline" color="text.secondary" component="h3">
              Findings ({run.result.findings.length})
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
              {run.result.findings.map((f) => (
                <Box
                  component="li"
                  key={f.id}
                  sx={(theme) => ({
                    p: 1.25,
                    borderRadius: `${theme.opsforge.radius.md}px`,
                    border: `1px solid ${theme.palette.border.subtle}`,
                  })}
                >
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
                    <ToneChip tone={severityTone[f.severity]} label={severityLabel[f.severity]} />
                    <ToneChip tone="ai" label={dimensionLabel[f.dimension] ?? f.dimension} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.detail}
                  </Typography>
                  {f.recommendation && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      <strong>Recommendation:</strong> {f.recommendation}
                    </Typography>
                  )}
                  {f.nodeIds.length > 0 && (
                    <Button size="small" sx={{ mt: 0.5 }} onClick={() => onSelectNodes(f.nodeIds)}>
                      Show on canvas
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
