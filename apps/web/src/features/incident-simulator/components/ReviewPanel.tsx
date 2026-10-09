import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import { ToneChip } from '@opsforge/ui'
import { DIMENSION_LABELS } from '../evaluator'
import type { IncidentReviewState } from '../useIncidentReview'

/** A provider adds qualitative observations. It never changes a score. */
export function ReviewPanel({ review }: { review: IncidentReviewState }) {
  const { providers, run } = review
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Alert severity="info" icon={<AutoAwesomeOutlined fontSize="inherit" />}>
        An interviewer or AI reviewer can add strengths, gaps and follow-up questions. Scores come
        only from the deterministic checks above.
      </Alert>
      {providers.length === 0 ? (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2">No review provider is configured</Typography>
          <Typography variant="body2" color="text.secondary">
            The contract is in place: a provider receives the scenario, your recorded session and
            the deterministic result, and returns observations that are validated before they are
            shown. Nothing is simulated here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {providers.map((p) => (
            <Button
              key={p.id}
              variant="outlined"
              disabled={run?.status === 'loading'}
              onClick={() => review.start(p.id)}
            >
              Review with {p.label}
            </Button>
          ))}
        </Box>
      )}
      {run?.status === 'loading' && (
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Reviewing…</Typography>
          <Button size="small" onClick={review.cancel}>
            Cancel
          </Button>
        </Box>
      )}
      {run?.status === 'error' && <Alert severity="error">{run.message}</Alert>}
      {run?.status === 'ready' && (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="body2">{run.result.summary}</Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
            {run.result.observations.map((o, i) => (
              <Box
                component="li"
                key={i}
                sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}
              >
                <ToneChip
                  tone={o.kind === 'strength' ? 'success' : 'warning'}
                  label={o.kind === 'strength' ? 'Strength' : 'Gap'}
                />
                <Typography variant="body2">
                  <strong>{DIMENSION_LABELS[o.dimension]}.</strong> {o.note}
                </Typography>
              </Box>
            ))}
          </Box>
          {run.result.followUps.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" component="h3">
                Follow-up questions
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {run.result.followUps.map((q, i) => (
                  <li key={i}>
                    <Typography variant="body2">{q}</Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
