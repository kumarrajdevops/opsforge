import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { CommandCenterSnapshot, FailureRisk } from '@opsforge/types'
import { LevelLadder, Panel, Reveal, ScoreRing, Sparkline, ToneChip } from '@opsforge/ui'
import { LEVELS } from '../../readiness/config'
import {
  confidenceLabel,
  confidenceTone,
  formatPercent,
  trendLabel,
} from '../../readiness/presentation'
import { bandTone, deltaTone, formatSigned, likelihoodTone } from '../presentation'
import { Eyebrow } from './Eyebrow'
import { ModuleButton } from './ModuleButton'

function RiskRow({
  risk,
  index,
  dimensionLabel,
}: {
  risk: FailureRisk
  index: number
  dimensionLabel: string
}) {
  const tone = likelihoodTone[risk.likelihood]
  return (
    <Box component="li">
      <Reveal delay={0.08 + index * 0.07}>
        <Box
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
            gap: 1.5,
            alignItems: 'center',
            p: 2,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${theme.palette.border.default}`,
            borderLeft: `3px solid ${theme.palette[tone === 'neutral' ? 'info' : tone].main}`,
            backgroundColor: theme.palette.background.paper,
          })}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="monoSmall" sx={{ color: 'text.secondary' }}>
              RISK-{String(index + 1).padStart(2, '0')}
            </Typography>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
              {risk.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              {risk.reason}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              <ToneChip tone={tone} label={`${risk.likelihood} risk`} />
              <ToneChip tone="neutral" label={dimensionLabel} />
              <ToneChip tone="neutral" mono label={`${risk.evidenceCount} evidence events`} />
            </Box>
          </Box>
          {risk.action.available && (
            <ModuleButton module={risk.action.module} variant="outlined" size="small">
              {risk.action.label}
            </ModuleButton>
          )}
        </Box>
      </Reveal>
    </Box>
  )
}

function trendRange(scores: number[]): { min: number; max: number } {
  return {
    min: Math.max(0, Math.floor(Math.min(...scores) / 10) * 10 - 10),
    max: Math.min(100, Math.ceil(Math.max(...scores) / 10) * 10 + 10),
  }
}

export function ReadinessHero({ snapshot }: { snapshot: CommandCenterSnapshot }) {
  const { overall, failureRisks, dimensions } = snapshot
  const tone = overall.band ? bandTone[overall.band] : 'neutral'
  const dimensionLabel = (id: FailureRisk['dimension']) =>
    dimensions.find((d) => d.id === id)?.label ?? id
  const range = overall.trend.length >= 2 ? trendRange(overall.trend.map((p) => p.score)) : null

  return (
    <Panel flush aria-label="Interview readiness and failure forecast">
      <Box
        sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(320px, 400px) 1fr' } }}
      >
        <Box
          sx={(theme) => ({
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            backgroundColor: theme.palette.background.sunken,
            borderRight: { lg: `1px solid ${theme.palette.border.subtle}` },
            borderBottom: { xs: `1px solid ${theme.palette.border.subtle}`, lg: 'none' },
          })}
        >
          <Eyebrow>Interview readiness</Eyebrow>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            {overall.score === null ? (
              <Box
                sx={{
                  width: 168,
                  height: 168,
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                }}
              >
                <Box>
                  <Typography variant="metric" sx={{ fontSize: 40 }}>
                    —
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="p">
                    No evidence yet
                  </Typography>
                </Box>
              </Box>
            ) : (
              <ScoreRing
                value={overall.score}
                label="Overall readiness score"
                caption="of 100"
                tone={tone}
                size={168}
                thickness={12}
              />
            )}
            <Box>
              <ToneChip tone="primary" mono label={`L${overall.level.value}`} />
              <Typography variant="h4" component="p" sx={{ mt: 0.75 }}>
                {overall.level.label}
              </Typography>
              <Typography variant="monoSmall" component="p" sx={{ mt: 0.5 }} color="text.secondary">
                Target {overall.target}
                {overall.score !== null && ` · gap ${Math.max(0, overall.target - overall.score)}`}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {overall.delta === null ? (
                  <ToneChip tone="neutral" label={trendLabel[overall.direction]} />
                ) : (
                  <ToneChip
                    tone={deltaTone(overall.delta)}
                    mono
                    label={`${formatSigned(overall.delta)} recent`}
                  />
                )}
                <ToneChip
                  tone={confidenceTone[overall.confidence]}
                  label={confidenceLabel[overall.confidence]}
                />
              </Box>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatPercent(overall.coverage)} of the readiness weight has evidence.{' '}
            {overall.confidenceReason}
          </Typography>
          <Box>
            <LevelLadder
              label="Readiness levels"
              steps={LEVELS}
              current={overall.level.value}
              tone="primary"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {overall.level.reason}
            </Typography>
            {overall.level.next && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Next: {overall.level.next.label}.</strong>
                </Typography>
                <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
                  {overall.level.next.requirements.map((requirement) => (
                    <Typography
                      key={requirement}
                      component="li"
                      variant="caption"
                      color="text.secondary"
                    >
                      {requirement}
                    </Typography>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
          {range && (
            <Box sx={{ mt: 'auto' }}>
              <Eyebrow>Readiness trend</Eyebrow>
              <Box sx={{ mt: 1 }}>
                <Sparkline
                  label="Overall readiness over time"
                  points={overall.trend.map((p) => ({
                    label: new Date(p.date).toLocaleDateString('en', {
                      month: 'short',
                      day: 'numeric',
                    }),
                    value: p.score,
                  }))}
                  target={overall.target}
                  min={range.min}
                  max={range.max}
                  tone={tone}
                  height={88}
                />
              </Box>
            </Box>
          )}
        </Box>

        <Box sx={{ p: 3 }}>
          <Eyebrow>Failure forecast</Eyebrow>
          {failureRisks.length > 0 ? (
            <>
              <Typography variant="h3" component="h2" sx={{ mt: 0.5, mb: 0.5 }}>
                If you interviewed today, you would most likely fail here
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Largest gap to target first, from your evidence, not your self-assessment.
              </Typography>
              <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
                {failureRisks.map((risk, i) => (
                  <RiskRow
                    key={risk.id}
                    risk={risk}
                    index={i}
                    dimensionLabel={dimensionLabel(risk.dimension)}
                  />
                ))}
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h3" component="h2" sx={{ mt: 0.5, mb: 0.5 }}>
                {overall.score === null
                  ? 'Nothing to forecast yet'
                  : 'No area is below its target on current evidence'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {overall.score === null
                  ? 'Run a mock interview, an incident or an architecture review. Readiness is built only from scored attempts, so there is no estimate until one exists.'
                  : 'This reflects only the areas that have evidence. Areas without evidence are shown as unscored below, not as passed.'}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Panel>
  )
}
