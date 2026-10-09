import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type {
  ClaimQuestion,
  Defensibility,
  DrillAttempt,
  InterrogationCategory,
  ResumeClaimItem,
} from '@opsforge/types'
import { Panel, ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { technologyLabel } from '../../technologies/catalog'
import { DEFENSIBILITY_LABEL } from '../../drills/defensibility'
import { CATEGORIES } from '../../drills/questions/generic'
import { scoreTone } from '../../interviewer/presentation'
import { defensibilityTone, FLAG_HINT, KIND_LABEL } from '../presentation'

export interface ClaimDrillProps {
  claim: ResumeClaimItem
  questions: ClaimQuestion[]
  attempts: DrillAttempt[]
  defensibility: Defensibility
  disclosure: string
  busy: boolean
  onAnswer: (question: ClaimQuestion, text: string) => Promise<DrillAttempt | null>
}

export function ClaimDrill({
  claim,
  questions,
  attempts,
  defensibility,
  disclosure,
  busy,
  onAnswer,
}: ClaimDrillProps) {
  const [category, setCategory] = useState<InterrogationCategory>(
    questions[0]?.category ?? 'architecture',
  )
  const [draft, setDraft] = useState('')
  const question = questions.find((q) => q.category === category) ?? questions[0]
  if (!question) return null

  const mine = attempts.filter((a) => a.category === question.category)
  const last = mine[mine.length - 1]
  const result = defensibility.categories.find((c) => c.category === question.category)

  const submit = async () => {
    if (draft.trim().length === 0 || busy) return
    const attempt = await onAnswer(question, draft)
    if (attempt) setDraft('')
  }

  return (
    <Box sx={{ display: 'grid', gap: 2.5 }}>
      <Panel
        title={claim.text}
        subtitle={[KIND_LABEL[claim.kind], claim.context].filter(Boolean).join(' · ')}
        actions={
          <ToneChip
            tone={defensibilityTone(defensibility.level)}
            label={`${DEFENSIBILITY_LABEL[defensibility.level]}${defensibility.score === null ? '' : ` · ${defensibility.score}/100`}`}
          />
        }
      >
        {claim.technologies.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
            {claim.technologies.map((id) => (
              <ToneChip key={id} tone="primary" label={technologyLabel(id)} />
            ))}
          </Box>
        )}
        <Typography variant="body2" color="text.secondary">
          {defensibility.reason}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {defensibility.covered} of {defensibility.total} angles answered.
        </Typography>
        {claim.flags.length > 0 && (
          <Box component="ul" sx={{ m: 0, mt: 1.5, pl: 2.5 }}>
            {claim.flags.map((flag) => (
              <Typography component="li" variant="caption" color="text.secondary" key={flag}>
                {FLAG_HINT[flag]}
              </Typography>
            ))}
          </Box>
        )}
      </Panel>

      <Panel title="Interrogation" subtitle="Pick an angle. Answer as you would in the interview.">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={question.category}
          onChange={(_, value: InterrogationCategory | null) => {
            if (value) {
              setCategory(value)
              setDraft('')
            }
          }}
          aria-label="Question category"
          sx={{
            flexWrap: 'wrap',
            gap: 0.5,
            mb: 2,
            '& .MuiToggleButton-root': { border: 1, borderRadius: 1 },
          }}
        >
          {questions.map((q) => {
            const done = defensibility.categories.find((c) => c.category === q.category)?.best
            return (
              <ToggleButton key={q.category} value={q.category}>
                {CATEGORIES[q.category].label}
                {done !== null && done !== undefined ? ` · ${done}` : ''}
              </ToggleButton>
            )
          })}
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary">
          {CATEGORIES[question.category].blurb}
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, mb: 2 }}>
          {question.spec.prompt}
        </Typography>

        <TextField
          multiline
          minRows={5}
          maxRows={14}
          fullWidth
          label="Your answer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={busy}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', mt: 1.5 }}>
          <Button
            variant="contained"
            disabled={busy || draft.trim().length === 0}
            onClick={() => void submit()}
          >
            {busy ? 'Scoring…' : 'Submit answer'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {question.rubric === 'technology-pack'
              ? 'Scored against a rubric written for this technology.'
              : 'No rubric exists for this technology yet. Scored against a general rubric, so treat the score as rough.'}
          </Typography>
        </Box>
        {result && result.attempts > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {result.attempts} attempt{result.attempts === 1 ? '' : 's'}; best {result.best}. The
            best attempt counts.
          </Typography>
        )}
      </Panel>

      {last && <AttemptResult attempt={last} />}

      <Alert severity="info" variant="outlined">
        <strong>How answers are analysed.</strong> {disclosure}
      </Alert>
    </Box>
  )
}

function AttemptResult({ attempt }: { attempt: DrillAttempt }) {
  const e = attempt.evaluation
  return (
    <Panel
      title="Latest result"
      subtitle={`Analysed by ${attempt.analyzerId}`}
      actions={<ToneChip mono tone={scoreTone(e.score)} label={`${e.score}/100`} />}
    >
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Concepts
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
            {e.concepts.map((c) => (
              <Box
                component="li"
                key={c.conceptId}
                sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}
              >
                <ToneChip
                  tone={
                    c.status === 'explained'
                      ? 'success'
                      : c.status === 'named'
                        ? 'warning'
                        : 'neutral'
                  }
                  label={
                    c.status === 'explained'
                      ? 'Explained'
                      : c.status === 'named'
                        ? 'Named'
                        : 'Missed'
                  }
                />
                <Typography variant="body2">{c.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Dimensions
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
            {e.dimensions
              .filter((d) => d.score !== null)
              .map((d) => (
                <Box
                  component="li"
                  key={d.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
                >
                  <Typography variant="body2">{d.id.replace(/-/g, ' ')}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {d.score}
                  </Typography>
                </Box>
              ))}
          </Box>
        </Box>
      </Box>
      {e.redFlags.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {e.redFlags.map((r) => r.label).join(', ')}
        </Alert>
      )}
    </Panel>
  )
}
