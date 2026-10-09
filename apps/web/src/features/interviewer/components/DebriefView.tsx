import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { Finding, InterviewSession } from '@opsforge/types'
import { PageHeader, Panel, ProgressBar, ScoreRing, ToneChip } from '@opsforge/ui'
import { analysisNotes } from '../debrief'
import { MODE_LABELS, ROUND_LABELS } from '../modes'
import { basisLabel, bandTone, confidenceLabel, formatDuration, scoreTone } from '../presentation'
import { BAND_LABELS, DIMENSION_LABELS, DIMENSION_ORDER } from '../scoring'

export interface DebriefViewProps {
  session: InterviewSession
  onReplay: () => void
  onNew: () => void
}

function FindingList({
  title,
  findings,
  empty,
}: {
  title: string
  findings: Finding[]
  empty: string
}) {
  return (
    <Panel title={title}>
      {findings.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {empty}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
          {findings.map((f, i) => (
            <li key={i}>
              <Typography variant="body2">{f.text}</Typography>
              {f.quote && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', borderLeft: 2, borderColor: 'divider', pl: 1.5, mt: 0.5 }}
                >
                  “{f.quote}”
                </Typography>
              )}
            </li>
          ))}
        </Box>
      )}
    </Panel>
  )
}

export function DebriefView({ session, onReplay, onNew }: DebriefViewProps) {
  const evaluation = session.evaluation
  if (!evaluation) return null
  const notes = analysisNotes(session)
  const overall = evaluation.overall

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeInterview"
        title="Interview debrief"
        description={`${MODE_LABELS[session.config.mode].label} · ${new Date(session.startedAt).toLocaleString()}`}
        actions={
          <>
            <Button variant="outlined" color="inherit" onClick={onReplay}>
              Replay interview
            </Button>
            <Button variant="contained" onClick={onNew}>
              New interview
            </Button>
          </>
        }
      />

      <Panel>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
          {overall === null ? (
            <Typography variant="h6">Not enough answers to score.</Typography>
          ) : (
            <ScoreRing
              value={overall}
              label="Interview performance"
              caption="Overall"
              tone={bandTone(evaluation.band)}
              size={132}
            />
          )}
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {evaluation.band && (
                <ToneChip tone={bandTone(evaluation.band)} label={BAND_LABELS[evaluation.band]} />
              )}
              <ToneChip
                tone={evaluation.confidence === 'low' ? 'warning' : 'neutral'}
                label={confidenceLabel[evaluation.confidence]}
              />
              <ToneChip tone="neutral" label={basisLabel[evaluation.basis]} />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
              {notes.answers} analysed answers. Scores come from fixed, versioned rules (
              {evaluation.scoringVersion}) applied to evidence found in what you said.
            </Typography>
          </Box>
        </Box>
      </Panel>

      {evaluation.basis !== 'llm-assisted' && (
        <Alert severity="info" variant="outlined">
          {evaluation.basis === 'rule-based'
            ? 'This run used keyword and pattern matching. A correct answer in unusual wording can be under-credited, so treat the score as a guide and read the replay to see what was and was not recognised.'
            : 'Part of this run used model analysis and part fell back to keyword matching. Confidence is reduced accordingly.'}
        </Alert>
      )}
      {notes.fellBack > 0 && (
        <Alert severity="warning" variant="outlined">
          Model analysis failed for {notes.fellBack} of {notes.answers} answers, so rule-based
          analysis was used for them.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Panel title="By round">
          <Box sx={{ display: 'grid', gap: 2 }}>
            {evaluation.rounds.map((r) => (
              <ProgressBar
                key={r.roundId}
                label={ROUND_LABELS[r.kind]}
                value={r.score ?? 0}
                tone={scoreTone(r.score)}
                valueLabel={
                  r.score === null
                    ? 'Not assessed'
                    : `${r.score} · ${r.answered}/${r.threads} answered · ${formatDuration(r.usedSeconds)}`
                }
              />
            ))}
          </Box>
        </Panel>

        <Panel
          title="By dimension"
          subtitle="Dimensions your answers gave no evidence for are not scored."
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            {DIMENSION_ORDER.map((id) => {
              const d = evaluation.dimensions.find((x) => x.id === id)
              return (
                <ProgressBar
                  key={id}
                  label={DIMENSION_LABELS[id]}
                  value={d?.score ?? 0}
                  tone={scoreTone(d?.score ?? null)}
                  valueLabel={
                    d?.score === null || d?.score === undefined ? 'Not assessed' : String(d.score)
                  }
                />
              )
            })}
          </Box>
        </Panel>
      </Box>

      {evaluation.topics.length > 0 && (
        <Panel title="By topic" subtitle="Weak topics are prioritised in your next interview.">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[...evaluation.topics]
              .sort((a, b) => a.score - b.score)
              .map((t) => (
                <ToneChip
                  key={t.topic}
                  tone={t.weak ? 'warning' : 'success'}
                  label={`${t.topic} · ${t.score}`}
                  mono
                />
              ))}
          </Box>
        </Panel>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <FindingList
          title="Strengths"
          findings={evaluation.strengths}
          empty="No standout strengths were evidenced."
        />
        <FindingList title="Gaps" findings={evaluation.gaps} empty="No clear gaps were found." />
      </Box>
    </Box>
  )
}
