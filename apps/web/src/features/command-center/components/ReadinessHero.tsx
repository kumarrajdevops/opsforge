import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { CommandCenterSnapshot, FailureRisk } from '@opsforge/types'
import { LevelLadder, Panel, Reveal, ScoreRing, Sparkline, ToneChip } from '@opsforge/ui'
import { bandTone, deltaTone, formatSigned, likelihoodTone } from '../presentation'
import { Eyebrow } from './Eyebrow'
import { ModuleButton } from './ModuleButton'

const LEVELS = [
  { value: 1, label: 'Learner' },
  { value: 2, label: 'Practitioner' },
  { value: 3, label: 'Interview Ready' },
  { value: 4, label: 'Senior Ready' },
  { value: 5, label: 'Strong Senior' },
  { value: 6, label: 'Architect' },
]

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
          <ModuleButton module={risk.action.module} variant="outlined" size="small">
            {risk.action.label}
          </ModuleButton>
        </Box>
      </Reveal>
    </Box>
  )
}

export function ReadinessHero({ snapshot }: { snapshot: CommandCenterSnapshot }) {
  const { overall, failureRisks, dimensions } = snapshot
  const tone = bandTone[overall.band]
  const dimensionLabel = (id: FailureRisk['dimension']) =>
    dimensions.find((d) => d.id === id)?.label ?? id

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
            <ScoreRing
              value={overall.score}
              label="Overall readiness score"
              caption="of 100"
              tone={tone}
              size={168}
              thickness={12}
            />
            <Box>
              <ToneChip tone="primary" mono label={`L${overall.level.value}`} />
              <Typography variant="h4" component="p" sx={{ mt: 0.75 }}>
                {overall.level.label}
              </Typography>
              <Typography variant="monoSmall" component="p" sx={{ mt: 0.5 }} color="text.secondary">
                Senior target {overall.seniorTarget} · gap {overall.seniorTarget - overall.score}
              </Typography>
              <Box sx={{ mt: 1 }}>
                <ToneChip
                  tone={deltaTone(overall.weeklyDelta)}
                  mono
                  label={`${formatSigned(overall.weeklyDelta)} this week`}
                />
              </Box>
            </Box>
          </Box>
          <Box>
            <LevelLadder
              label="Readiness levels"
              steps={LEVELS}
              current={overall.level.value}
              tone="primary"
            />
            {overall.level.next && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                <strong>Next: {overall.level.next.label}.</strong> {overall.level.next.requirement}
              </Typography>
            )}
          </Box>
          <Box sx={{ mt: 'auto' }}>
            <Eyebrow>8-week trend</Eyebrow>
            <Box sx={{ mt: 1 }}>
              <Sparkline
                label="Overall readiness over eight weeks"
                points={overall.trend.map((p) => ({
                  label: new Date(p.date).toLocaleDateString('en', {
                    month: 'short',
                    day: 'numeric',
                  }),
                  value: p.score,
                }))}
                target={overall.seniorTarget}
                min={40}
                max={90}
                tone={tone}
                height={88}
              />
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 3 }}>
          <Eyebrow>Failure forecast</Eyebrow>
          <Typography variant="h3" component="h2" sx={{ mt: 0.5, mb: 0.5 }}>
            If you interviewed today, you would most likely fail here
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Ranked by likelihood from your evidence, not your self-assessment.
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
        </Box>
      </Box>
    </Panel>
  )
}
