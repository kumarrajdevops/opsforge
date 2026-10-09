import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Panel, ToneChip } from '@opsforge/ui'
import { ROUND_LABELS } from '../modes'
import type { CandidateView } from '../view'
import { InterviewerOrb } from './InterviewerOrb'

export interface BetweenRoundsViewProps {
  view: CandidateView
  busy: boolean
  error: string | null
  onContinue: () => void
  onEndInterview: () => void
}

/** A pause between rounds. It confirms progress and reveals nothing about performance. */
export function BetweenRoundsView({
  view,
  busy,
  error,
  onContinue,
  onEndInterview,
}: BetweenRoundsViewProps) {
  const done = view.rounds.filter((r) => r.status === 'completed').length
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%', display: 'grid', gap: 2.5 }}>
      {error && <Alert severity="error">{error}</Alert>}
      <Panel>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <InterviewerOrb />
          <Box>
            <Typography variant="h6" component="h1" sx={{ mb: 0.5 }}>
              {view.justFinished
                ? `${ROUND_LABELS[view.justFinished]} round complete.`
                : 'Round complete.'}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {view.nextRound
                ? `Next up: ${ROUND_LABELS[view.nextRound]}. Take a moment if you need one. Your results will be shared at the end.`
                : 'That was the last round.'}
            </Typography>
            <Box
              component="ol"
              aria-label="Rounds"
              sx={{
                m: 0,
                mb: 2.5,
                p: 0,
                listStyle: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
              }}
            >
              {view.rounds.map((r) => (
                <li key={r.id}>
                  <ToneChip
                    tone={r.status === 'completed' ? 'success' : 'neutral'}
                    label={ROUND_LABELS[r.kind]}
                  />
                </li>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {done} of {view.rounds.length} rounds done
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" disabled={busy} onClick={onContinue}>
                {view.nextRound ? `Start ${ROUND_LABELS[view.nextRound]}` : 'See results'}
              </Button>
              <Button color="inherit" disabled={busy} onClick={onEndInterview}>
                End interview
              </Button>
            </Box>
          </Box>
        </Box>
      </Panel>
    </Box>
  )
}
