import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReadinessReport } from '@opsforge/types'
import { LevelLadder, Panel, ScoreRing, Sparkline, ToneChip } from '@opsforge/ui'
import { LEVELS } from '../config'
import {
  bandLabel,
  bandTone,
  confidenceLabel,
  confidenceTone,
  formatPercent,
  formatScore,
  formatSigned,
  trendLabel,
  trendTone,
} from '../presentation'

export function ReadinessHero({ report }: { report: ReadinessReport }) {
  const { overall, level } = report
  const tone = overall.band ? bandTone[overall.band] : 'neutral'
  const trendPoints = overall.trend.points.map((p) => ({
    label: p.at.slice(0, 10),
    value: p.score,
  }))

  return (
    <Panel aria-label="Overall readiness and level">
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'auto 1fr' },
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1 }}>
          <ScoreRing
            value={overall.score ?? 0}
            label="Overall readiness"
            caption="Evidence-weighted"
            tone={tone}
            size={168}
            thickness={12}
            display={formatScore(overall.score)}
          />
          {overall.band && <ToneChip tone={tone} label={bandLabel[overall.band]} />}
        </Box>

        <Box sx={{ display: 'grid', gap: 2, minWidth: 0 }}>
          <Box>
            <Typography variant="overline" color="text.secondary" component="p" sx={{ m: 0 }}>
              Readiness level
            </Typography>
            <Typography variant="h2" component="h2" sx={{ fontSize: '1.75rem' }}>
              Level {level.value}, {level.label}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {level.reason}
            </Typography>
          </Box>

          <LevelLadder
            steps={LEVELS}
            current={level.value}
            tone="primary"
            label="Readiness levels"
          />

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            <ToneChip
              tone={confidenceTone[overall.evidenceConfidence]}
              label={confidenceLabel[overall.evidenceConfidence]}
            />
            <ToneChip tone="neutral" mono label={`Coverage ${formatPercent(overall.coverage)}`} />
            <ToneChip tone="neutral" mono label={`${report.evidenceCount} observations`} />
            <ToneChip
              tone={trendTone[overall.trend.direction]}
              label={`${trendLabel[overall.trend.direction]}${
                overall.trend.delta !== null ? ` ${formatSigned(overall.trend.delta)} pts` : ''
              }`}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {overall.confidenceReason}
          </Typography>

          {trendPoints.length >= 2 && (
            <Box sx={{ maxWidth: 360 }}>
              <Sparkline
                points={trendPoints}
                label="Overall readiness trend"
                tone={tone}
                target={overall.target}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Panel>
  )
}
