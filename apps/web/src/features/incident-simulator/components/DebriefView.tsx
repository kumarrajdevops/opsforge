import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { IncidentEvaluation, IncidentScenario } from '@opsforge/types'
import { Panel, ProgressBar, ScoreRing, ToneChip } from '@opsforge/ui'
import { findHypothesisSpec, formatElapsed, type SessionState } from '../engine'
import { categoryLabel, channelLabel, qualityMeta, roleMeta, scoreTone } from '../presentation'
import type { IncidentReviewState } from '../useIncidentReview'
import { ReviewPanel } from './ReviewPanel'
import { ServiceMap } from './ServiceMap'
import { rootCauseServiceId } from '../visual/serviceGraph'

const verdictLabel = {
  'root-cause': 'Root cause',
  mechanism: 'Mechanism',
  contributing: 'Contributing factor',
  symptom: 'Symptom, not a cause',
  'ruled-out': 'Ruled out',
} as const

export interface DebriefViewProps {
  scenario: IncidentScenario
  state: SessionState
  evaluation: IncidentEvaluation
  review: IncidentReviewState
  onRestart: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title}>
      <Box sx={{ display: 'grid', gap: 1.5 }}>{children}</Box>
    </Panel>
  )
}

/** Shown only after submit: this is where roles, hints and the model answer finally appear. */
export function DebriefView({ scenario, state, evaluation, review, onRestart }: DebriefViewProps) {
  const { overall, stats } = evaluation
  const serviceName = (id: string | undefined) => scenario.services.find((s) => s.id === id)?.name
  const applied = new Set(state.applied.map((a) => a.actionId))
  const chosen = new Set(state.prevention?.optionIds ?? [])

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: { xs: 2, md: 3 } }}>
      <Box sx={{ maxWidth: 1040, mx: 'auto', display: 'grid', gap: 2 }}>
        <Panel
          title="Incident debrief"
          subtitle={scenario.title}
          actions={
            <Button variant="outlined" size="small" onClick={onRestart}>
              Run it again
            </Button>
          }
        >
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            {overall === null ? (
              <Box>
                <Typography variant="h6">Not attempted</Typography>
                <Typography variant="body2" color="text.secondary">
                  Nothing was recorded, so there is nothing to score.
                </Typography>
              </Box>
            ) : (
              <ScoreRing
                value={overall}
                label="Incident response"
                caption={evaluation.complete ? 'overall' : 'attempted parts'}
                tone={scoreTone(overall)}
                size={132}
              />
            )}
            <Box
              component="dl"
              sx={{
                m: 0,
                display: 'grid',
                gridTemplateColumns: 'auto auto',
                columnGap: 3,
                rowGap: 0.5,
              }}
            >
              {[
                ['Evidence found', `${stats.evidenceFound} of ${stats.evidenceTotal}`],
                ['Key evidence', `${stats.keyEvidenceFound} of ${stats.keyEvidenceTotal}`],
                ['Time on incident', formatElapsed(stats.elapsedSeconds)],
                [
                  'Recovered',
                  stats.resolved && stats.resolvedAtSeconds !== null
                    ? `at ${formatElapsed(stats.resolvedAtSeconds)}`
                    : 'No',
                ],
              ].map(([k, v]) => (
                <Box key={k} sx={{ display: 'contents' }}>
                  <Typography component="dt" variant="body2" color="text.secondary">
                    {k}
                  </Typography>
                  <Typography component="dd" variant="body2" sx={{ m: 0, fontWeight: 600 }}>
                    {v}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          {!evaluation.complete && overall !== null && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mt: 1.5, mb: 0 }}
            >
              Some parts were never attempted and are not counted. They show as "Not attempted", not
              as zero.
            </Typography>
          )}
        </Panel>

        <Section title="How you did, by dimension">
          {evaluation.dimensions.map((d) => (
            <Box key={d.id} sx={{ display: 'grid', gap: 0.75 }}>
              <ProgressBar
                label={d.label}
                value={d.score ?? 0}
                tone={scoreTone(d.score)}
                valueLabel={d.score === null ? 'Not attempted' : `${Math.round(d.score)}`}
              />
              <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
                {d.checks.map((c) => (
                  <Box
                    component="li"
                    key={c.id}
                    sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}
                  >
                    <ToneChip
                      tone={c.credit >= 0.75 ? 'success' : c.credit >= 0.4 ? 'warning' : 'error'}
                      label={`${Math.round(c.credit * 100)}%`}
                      mono
                    />
                    <Typography variant="body2">
                      <strong>{c.label}.</strong> {c.detail}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Section>

        <Section title="Troubleshooting skills">
          <Box
            sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
          >
            {evaluation.skills.map((s) => (
              <ProgressBar
                key={s.id}
                label={s.label}
                value={s.score ?? 0}
                tone={scoreTone(s.score)}
                valueLabel={s.score === null ? 'No evidence' : `${Math.round(s.score)}`}
              />
            ))}
          </Box>
        </Section>

        <Section title="The model answer">
          <Typography variant="body2">{scenario.rootCause.statement}</Typography>
          {state.rca ? (
            <Typography variant="body2" color="text.secondary">
              Your RCA: {state.rca.draft.statement}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              You did not write an RCA.
            </Typography>
          )}
        </Section>

        <Section title="How the incident spread">
          <Typography variant="body2" color="text.secondary">
            The outage starts at the failing dependency and reaches the services that call it.
          </Typography>
          <ServiceMap
            replay
            services={scenario.services}
            rootCauseId={rootCauseServiceId(scenario)}
          />
        </Section>

        <Section title="Evidence map">
          <Typography variant="body2" color="text.secondary">
            Every piece of evidence in this scenario, what it meant, and how to find it. Items you
            missed are marked.
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
            {scenario.evidence.map((node) => {
              const found = state.revealedIds.has(node.id)
              return (
                <Box
                  component="li"
                  key={node.id}
                  sx={(theme) => ({
                    p: 1.25,
                    borderRadius: `${theme.opsforge.radius.md}px`,
                    border: `1px solid ${theme.palette.border.subtle}`,
                    opacity: found ? 1 : 0.85,
                  })}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.75,
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      mb: 0.5,
                    }}
                  >
                    <ToneChip
                      tone={found ? 'success' : 'warning'}
                      label={found ? 'Found' : 'Missed'}
                    />
                    <ToneChip tone={roleMeta[node.role].tone} label={roleMeta[node.role].label} />
                    <ToneChip tone="neutral" label={channelLabel[node.channel]} />
                    {serviceName(node.serviceId) && (
                      <ToneChip tone="neutral" mono label={serviceName(node.serviceId)!} />
                    )}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {node.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div">
                    How to find it: {node.hint}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        </Section>

        <Section title="Hypotheses">
          {state.hypotheses.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              You did not record a hypothesis. Naming a theory early is what separates investigating
              from poking around.
            </Typography>
          )}
          {state.hypotheses.map((h) => {
            const spec = findHypothesisSpec(scenario, h.category, h.serviceId)
            return (
              <Box
                key={h.id}
                sx={(theme) => ({
                  p: 1.25,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  border: `1px solid ${theme.palette.border.subtle}`,
                })}
              >
                <Box
                  sx={{
                    display: 'flex',
                    gap: 0.75,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    mb: 0.5,
                  }}
                >
                  <ToneChip tone="neutral" label={categoryLabel[h.category]} />
                  <ToneChip tone="neutral" mono label={serviceName(h.serviceId) ?? h.serviceId} />
                  {spec ? (
                    <ToneChip
                      tone={
                        spec.verdict === 'root-cause'
                          ? 'success'
                          : spec.verdict === 'ruled-out'
                            ? 'info'
                            : 'warning'
                      }
                      label={verdictLabel[spec.verdict]}
                    />
                  ) : (
                    <ToneChip tone="neutral" label="Not in the scenario" />
                  )}
                </Box>
                <Typography variant="body2">{h.statement}</Typography>
                {spec && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="div"
                    sx={{ mt: 0.5 }}
                  >
                    {spec.explanation}
                  </Typography>
                )}
              </Box>
            )
          })}
        </Section>

        <Section title="Mitigation">
          {scenario.remediation.map((a) => (
            <Box key={a.id} sx={{ display: 'grid', gap: 0.25 }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {a.label}
                </Typography>
                <ToneChip
                  tone={applied.has(a.id) ? 'primary' : 'neutral'}
                  label={applied.has(a.id) ? 'You applied this' : 'Not applied'}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {a.rationale}
              </Typography>
            </Box>
          ))}
        </Section>

        <Section title="Prevention">
          {scenario.prevention.map((p) => (
            <Box key={p.id} sx={{ display: 'grid', gap: 0.25 }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {p.label}
                </Typography>
                <ToneChip tone={qualityMeta[p.quality].tone} label={qualityMeta[p.quality].label} />
                {chosen.has(p.id) && <ToneChip tone="primary" label="You chose this" />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {p.rationale}
              </Typography>
            </Box>
          ))}
        </Section>

        <Panel title="Qualitative review">
          <ReviewPanel review={review} />
        </Panel>
      </Box>
    </Box>
  )
}
