import PlayArrow from '@mui/icons-material/PlayArrow'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { InterviewMode, InterviewSession } from '@opsforge/types'
import { Panel, PageHeader, ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { MODE_LABELS, ROUND_LABELS, ROUND_ORDER, planRounds } from '../modes'
import { DIMENSION_LABELS } from '../scoring'
import { bandTone, evaluatedAreas } from '../presentation'
import { DEFAULT_SETUP, type SetupInput } from '../setup'

export interface SetupViewProps {
  disclosure: string
  weakTopics: string[]
  history: InterviewSession[]
  busy: boolean
  error: string | null
  onStart: (input: SetupInput) => void
  onOpen: (id: string) => void
  onFinish: (id: string) => void
  onRemove: (id: string) => void
}

const MODES: InterviewMode[] = ['interview-day', 'emergency', 'single-round']

export function SetupView({
  disclosure,
  weakTopics,
  history,
  busy,
  error,
  onStart,
  onOpen,
  onFinish,
  onRemove,
}: SetupViewProps) {
  const [input, setInput] = useState<SetupInput>(DEFAULT_SETUP)
  const patch = (next: Partial<SetupInput>) => setInput((previous) => ({ ...previous, ...next }))
  const plan = planRounds(input.mode, input.round)
  const totalMinutes = plan.reduce((sum, r) => sum + r.timeboxMinutes, 0)

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeInterview"
        title="AI Interviewer"
        description="A structured interview that follows up on what you actually say. Scores stay hidden until you finish."
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 3fr) minmax(0, 2fr)' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel
            title="Interview format"
            subtitle={`${plan.length} round${plan.length === 1 ? '' : 's'}, about ${totalMinutes} minutes`}
          >
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={input.mode}
              onChange={(_, value: InterviewMode | null) => value && patch({ mode: value })}
              aria-label="Interview mode"
              sx={{ mb: 2 }}
            >
              {MODES.map((mode) => (
                <ToggleButton key={mode} value={mode}>
                  {MODE_LABELS[mode].label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {MODE_LABELS[input.mode].description}
            </Typography>

            <Box
              sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
            >
              {input.mode === 'single-round' && (
                <TextField
                  select
                  size="small"
                  label="Round"
                  value={input.round}
                  onChange={(e) => patch({ round: e.target.value as SetupInput['round'] })}
                >
                  {ROUND_ORDER.map((kind) => (
                    <MenuItem key={kind} value={kind}>
                      {ROUND_LABELS[kind]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                size="small"
                label="Level"
                value={input.level}
                onChange={(e) => patch({ level: e.target.value as SetupInput['level'] })}
              >
                <MenuItem value="senior">Senior</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
              </TextField>
              <TextField
                size="small"
                label="Target role (optional)"
                placeholder="Senior SRE"
                value={input.targetRole}
                onChange={(e) => patch({ targetRole: e.target.value })}
              />
            </Box>

            <Box
              component="ol"
              sx={{
                m: 0,
                mt: 2,
                p: 0,
                listStyle: 'none',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.75,
              }}
            >
              {plan.map((r, i) => (
                <li key={`${r.kind}-${i}`}>
                  <ToneChip
                    tone="neutral"
                    label={`${ROUND_LABELS[r.kind]} · ${r.timeboxMinutes} min`}
                  />
                </li>
              ))}
            </Box>
          </Panel>

          <Panel
            title="Tailor it (optional)"
            subtitle="Paste your resume and the job description. Questions will interrogate your claims and the stated requirements."
          >
            <Box sx={{ display: 'grid', gap: 2 }}>
              <TextField
                multiline
                minRows={4}
                maxRows={10}
                size="small"
                label="Resume"
                placeholder="One achievement per line, for example: Cut deploy time by 60% by moving CI to GitHub Actions"
                value={input.resume}
                onChange={(e) => patch({ resume: e.target.value })}
              />
              <TextField
                multiline
                minRows={4}
                maxRows={10}
                size="small"
                label="Job description"
                placeholder="Requirements, one per line"
                value={input.jd}
                onChange={(e) => patch({ jd: e.target.value })}
              />
              <Typography variant="caption" color="text.secondary">
                Everything stays in this browser unless a language model is configured; the note
                below says which.
              </Typography>
              {weakTopics.length > 0 && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={input.focusWeakTopics}
                      onChange={(e) => patch({ focusWeakTopics: e.target.checked })}
                    />
                  }
                  label={`Prioritise weak topics from earlier sessions (${weakTopics.join(', ')})`}
                />
              )}
            </Box>
          </Panel>

          <Alert severity="info" variant="outlined">
            <strong>How answers are analysed.</strong> {disclosure}
          </Alert>

          <Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              disabled={busy}
              onClick={() => onStart(input)}
            >
              {busy ? 'Starting…' : 'Start interview'}
            </Button>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 3 }}>
          <Panel title="What will be evaluated" subtitle="Hidden until the interview ends.">
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
              {evaluatedAreas.map((area) => (
                <Box
                  component="li"
                  key={area.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                    alignItems: 'baseline',
                  }}
                >
                  <Box>
                    <Typography variant="body2">{DIMENSION_LABELS[area.id]}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {area.hint}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.disabled" aria-label="Score hidden">
                    —
                  </Typography>
                </Box>
              ))}
            </Box>
          </Panel>

          <Panel title="Past interviews" subtitle={history.length === 0 ? 'None yet.' : undefined}>
            {history.length > 0 && (
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
                {history.map((s) => (
                  <Box
                    component="li"
                    key={s.id}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}
                  >
                    <Box sx={{ flex: 1, minWidth: 160 }}>
                      <Typography variant="body2">
                        {MODE_LABELS[s.config.mode].label} ·{' '}
                        {new Date(s.startedAt).toLocaleDateString()}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
                        {s.status === 'completed' && s.evaluation ? (
                          <ToneChip
                            mono
                            tone={bandTone(s.evaluation.band)}
                            label={
                              s.evaluation.overall === null
                                ? 'No score'
                                : `${s.evaluation.overall}/100`
                            }
                          />
                        ) : (
                          <ToneChip tone="warning" label="Unfinished" />
                        )}
                      </Box>
                    </Box>
                    {s.status === 'completed' ? (
                      <Button size="small" onClick={() => onOpen(s.id)}>
                        Debrief
                      </Button>
                    ) : (
                      <Button size="small" disabled={busy} onClick={() => onFinish(s.id)}>
                        Finish and score
                      </Button>
                    )}
                    <Button size="small" color="inherit" onClick={() => onRemove(s.id)}>
                      Delete
                    </Button>
                  </Box>
                ))}
              </Box>
            )}
          </Panel>
        </Box>
      </Box>
    </Box>
  )
}
