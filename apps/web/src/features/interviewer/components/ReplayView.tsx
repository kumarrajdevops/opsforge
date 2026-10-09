import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel, ScoreBadge, ToneChip } from '@opsforge/ui'
import type { ReplayThread } from '../replay'
import { InterviewTimeline } from './InterviewTimeline'
import { ROUND_LABELS } from '../modes'
import {
  closeReasonLabel,
  formatDuration,
  originLabel,
  probeLabel,
  scoreTone,
} from '../presentation'
import { DIMENSION_LABELS } from '../scoring'

export interface ReplayViewProps {
  threads: ReplayThread[]
  onBack: () => void
}

function ThreadCard({ thread, index }: { thread: ReplayThread; index: number }) {
  const evaluation = thread.evaluation
  return (
    <Panel
      title={`${index + 1}. ${ROUND_LABELS[thread.round]} · ${thread.topic}`}
      subtitle={thread.intent}
      actions={
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <ToneChip
            tone="neutral"
            label={originLabel[thread.origin as keyof typeof originLabel] ?? thread.origin}
          />
          {evaluation && (
            <ScoreBadge
              score={evaluation.score}
              suffix="/100"
              tone={scoreTone(evaluation.score)}
              label="Question score"
            />
          )}
        </Box>
      }
    >
      <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
        {thread.exchanges.map((e) => (
          <li key={e.turnId}>
            <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {e.kind === 'question' ? 'Question' : 'Follow-up'}
              </Typography>
              {e.probe && <ToneChip tone="info" label={probeLabel[e.probe]} />}
              {e.phrasedBy && <ToneChip tone="ai" label={`Worded by ${e.phrasedBy}`} />}
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {e.prompt}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Your answer · {formatDuration(e.durationSeconds)}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: 'pre-wrap', borderLeft: 2, borderColor: 'divider', pl: 1.5 }}
            >
              {e.skipped ? 'Skipped' : e.answer}
            </Typography>
          </li>
        ))}
      </Box>

      {evaluation && (
        <Panel
          recessed
          title="Evaluation"
          subtitle={`${closeReasonLabel[thread.closeReason]} · ${evaluation.followUps.asked} follow-up${evaluation.followUps.asked === 1 ? '' : 's'}`}
          sx={{ mt: 2.5 }}
        >
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {evaluation.concepts.map((c) => (
                <ToneChip
                  key={c.conceptId}
                  tone={
                    c.status === 'explained'
                      ? 'success'
                      : c.status === 'named'
                        ? 'warning'
                        : c.required
                          ? 'error'
                          : 'neutral'
                  }
                  label={`${c.label}: ${c.status}`}
                />
              ))}
            </Box>
            {evaluation.redFlags.map((r) => (
              <Typography key={r.redFlagId} variant="body2" color="error.main">
                {r.label}. {r.note} “{r.quote}”
              </Typography>
            ))}
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
              {evaluation.dimensions
                .filter((d) => d.score !== null)
                .map((d) => (
                  <li key={d.id}>
                    <Typography variant="body2">
                      <strong>{DIMENSION_LABELS[d.id]}</strong> {d.score}. {d.note}
                    </Typography>
                  </li>
                ))}
            </Box>
          </Box>
        </Panel>
      )}
    </Panel>
  )
}

export function ReplayView({ threads, onBack }: ReplayViewProps) {
  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <PageHeader
        eyebrow="ForgeInterview"
        title="Interview replay"
        description="Every question, answer and follow-up, with how each was evaluated."
        actions={
          <Button variant="outlined" color="inherit" onClick={onBack}>
            Back to debrief
          </Button>
        }
      />
      <Panel title="Timeline" subtitle="Where the time went, question by question.">
        <InterviewTimeline threads={threads} />
      </Panel>
      {threads.map((thread, i) => (
        <ThreadCard key={thread.threadId} thread={thread} index={i} />
      ))}
    </Box>
  )
}
