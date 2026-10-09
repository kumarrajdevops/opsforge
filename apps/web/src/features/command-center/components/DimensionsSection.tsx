import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { DimensionScore } from '@opsforge/types'
import { Panel, ProgressBar, RadarChart, Reveal, ToneChip } from '@opsforge/ui'
import { confidenceLabel } from '../../readiness/presentation'
import { bandLabel, bandTone, deltaTone, formatSigned } from '../presentation'

function DimensionTile({ dimension, index }: { dimension: DimensionScore; index: number }) {
  const { score, band } = dimension
  const scored = score !== null && band !== null
  const tone = scored ? bandTone[band] : 'neutral'
  const delta = dimension.delta
  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <Reveal delay={0.05 + index * 0.04}>
        <Box
          data-testid={`dimension-${dimension.id}`}
          sx={(theme) => ({
            p: 1.75,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px ${scored ? 'solid' : 'dashed'} ${theme.palette.border.default}`,
            backgroundColor: theme.palette.background.paper,
          })}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="metric" sx={{ fontSize: 28, lineHeight: 1 }}>
              {scored ? score : '—'}
            </Typography>
            <ToneChip tone={tone} label={scored ? bandLabel[band] : 'No evidence'} />
          </Box>
          <Box sx={{ mt: 1.25 }}>
            {scored ? (
              <ProgressBar
                label={dimension.label}
                value={score}
                tone={tone}
                valueLabel={`/ ${dimension.target}`}
                target={dimension.target}
                targetLabel="Target"
              />
            ) : (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {dimension.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Target {dimension.target}. Not scored yet.
                </Typography>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, gap: 1 }}>
            <Typography
              variant="monoSmall"
              color="text.secondary"
              title={confidenceLabel[dimension.confidence]}
            >
              {dimension.evidenceCount} {dimension.evidenceCount === 1 ? 'event' : 'events'}
            </Typography>
            {delta !== null && (
              <Typography
                variant="monoSmall"
                sx={(theme) => ({
                  color:
                    deltaTone(delta) === 'neutral'
                      ? theme.palette.text.secondary
                      : theme.palette[deltaTone(delta) as 'success' | 'error'].main,
                })}
              >
                {formatSigned(delta)} recent
              </Typography>
            )}
          </Box>
        </Box>
      </Reveal>
    </Box>
  )
}

export function DimensionsSection({ dimensions }: { dimensions: DimensionScore[] }) {
  const scored = dimensions.filter((d) => d.score !== null)
  return (
    <Panel
      title="Readiness profile"
      subtitle={`${dimensions.length} evidence dimensions against their targets (dashed). Dimensions without evidence are left off the chart, not drawn as zero.`}
    >
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 0.9fr) 1.4fr' },
          alignItems: 'center',
        }}
      >
        {scored.length >= 3 ? (
          <RadarChart
            label="Readiness profile"
            axes={scored.map((d) => ({ label: d.label, value: d.score!, target: d.target }))}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            The profile chart needs at least three scored dimensions. {scored.length} so far.
          </Typography>
        )}
        <Box
          component="ul"
          aria-label="Dimension scores"
          sx={{
            m: 0,
            p: 0,
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
          }}
        >
          {dimensions.map((d, i) => (
            <DimensionTile key={d.id} dimension={d} index={i} />
          ))}
        </Box>
      </Box>
    </Panel>
  )
}
