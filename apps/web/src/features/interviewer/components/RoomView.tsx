import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Panel, ToneChip, visuallyHidden } from '@opsforge/ui'
import { useState, type KeyboardEvent } from 'react'
import { ROUND_LABELS } from '../modes'
import { formatClock } from '../presentation'
import type { CandidateView } from '../view'
import { InterviewerOrb } from './InterviewerOrb'

export interface RoomViewProps {
  view: CandidateView
  remainingSeconds: number | null
  busy: boolean
  error: string | null
  onSubmit: (text: string) => void
  onSkip: () => void
  onEndRound: () => void
  onEndInterview: () => void
}

function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function RoomView({
  view,
  remainingSeconds,
  busy,
  error,
  onSubmit,
  onSkip,
  onEndRound,
  onEndInterview,
}: RoomViewProps) {
  const question = view.question
  const [draft, setDraft] = useState('')
  const round = view.rounds.find((r) => r.id === view.activeRoundId)
  if (!question || !round) return null

  const words = wordCount(draft)
  const timeUp = remainingSeconds !== null && remainingSeconds <= 0
  const submit = () => {
    if (words === 0 || busy) return
    onSubmit(draft.trim())
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <Box sx={{ maxWidth: 860, mx: 'auto', width: '100%', display: 'grid', gap: 2.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box
          component="ol"
          aria-label="Interview rounds"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
        >
          {view.rounds.map((r) => (
            <li key={r.id} aria-current={r.id === round.id ? 'step' : undefined}>
              <ToneChip
                tone={
                  r.status === 'active'
                    ? 'primary'
                    : r.status === 'completed'
                      ? 'success'
                      : 'neutral'
                }
                label={ROUND_LABELS[r.kind]}
              />
            </li>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Question {Math.min(question.number, question.total)} of {question.total}
          </Typography>
          {remainingSeconds !== null && (
            <Typography
              role="timer"
              aria-label={`Time left in ${ROUND_LABELS[round.kind]} round`}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontVariantNumeric: 'tabular-nums',
                color: timeUp ? 'error.main' : 'text.primary',
              }}
            >
              {formatClock(remainingSeconds)}
            </Typography>
          )}
        </Box>
      </Box>

      {timeUp && (
        <Alert severity="warning" variant="outlined">
          Time is up for this round. It will end after this answer.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Panel>
        {question.exchanges.length > 0 && (
          <Box
            component="ol"
            aria-label="Earlier in this question"
            sx={{ m: 0, mb: 2.5, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}
          >
            {question.exchanges.map((exchange, i) => (
              <li key={i}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Interviewer
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.75 }}>
                  {exchange.prompt}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  You
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ whiteSpace: 'pre-wrap', borderLeft: 2, borderColor: 'divider', pl: 1.5 }}
                >
                  {exchange.skipped ? 'Skipped' : exchange.answer}
                </Typography>
              </li>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <InterviewerOrb active={!busy} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {question.followUp ? 'Follow-up' : 'Interviewer'}
            </Typography>
            <Typography
              variant="h6"
              component="p"
              aria-live="polite"
              sx={{ fontWeight: 500, lineHeight: 1.45 }}
            >
              {question.prompt}
            </Typography>
          </Box>
        </Box>
      </Panel>

      <Box sx={{ display: 'grid', gap: 1.5 }}>
        <TextField
          multiline
          minRows={7}
          maxRows={16}
          fullWidth
          autoFocus
          label="Your answer"
          placeholder="Answer as you would out loud. Press Ctrl+Enter to submit."
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          slotProps={{ htmlInput: { 'aria-describedby': 'answer-words' } }}
        />
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
          }}
        >
          <Typography id="answer-words" variant="caption" color="text.secondary">
            {words} {words === 1 ? 'word' : 'words'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" variant="outlined" disabled={busy} onClick={onSkip}>
              Skip
            </Button>
            <Button variant="contained" disabled={busy || words === 0} onClick={submit}>
              {busy ? 'Thinking…' : 'Submit answer'}
            </Button>
          </Box>
        </Box>
        <Box component="span" role="status" sx={visuallyHidden}>
          {busy ? 'The interviewer is considering your answer.' : ''}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end',
          borderTop: 1,
          borderColor: 'divider',
          pt: 1.5,
        }}
      >
        <Button size="small" color="inherit" disabled={busy} onClick={onEndRound}>
          End round
        </Button>
        <Button size="small" color="error" disabled={busy} onClick={onEndInterview}>
          End interview
        </Button>
      </Box>
    </Box>
  )
}
