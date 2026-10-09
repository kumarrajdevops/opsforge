import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { DimensionScore } from '@opsforge/types'
import { Panel, ProgressBar, RadarChart, Reveal, ToneChip } from '@opsforge/ui'
import { bandLabel, bandTone, deltaTone, formatSigned } from '../presentation'

const SHORT_LABELS: Partial<Record<DimensionScore['id'], string>> = {
  'incident-response': 'Incident resp.',
  troubleshooting: 'Troubleshoot',
}

function DimensionTile({ dimension, index }: { dimension: DimensionScore; index: number }) {
  const tone = bandTone[dimension.band]
  return (
    <Box component="li" sx={{ listStyle: 'none' }}>
      <Reveal delay={0.05 + index * 0.04}>
        <Box
          data-testid={`dimension-${dimension.id}`}
          sx={(theme) => ({
            p: 1.75,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${theme.palette.border.default}`,
            backgroundColor: theme.palette.background.paper,
          })}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="metric" sx={{ fontSize: 28, lineHeight: 1 }}>
              {dimension.score}
            </Typography>
            <ToneChip tone={tone} label={bandLabel[dimension.band]} />
          </Box>
          <Box sx={{ mt: 1.25 }}>
            <ProgressBar
              label={dimension.label}
              value={dimension.score}
              tone={tone}
              valueLabel={`/ ${dimension.target}`}
              target={dimension.target}
              targetLabel="Senior target"
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="monoSmall" color="text.secondary">
              {dimension.evidenceCount} events
            </Typography>
            <Typography
              variant="monoSmall"
              sx={(theme) => ({
                color:
                  deltaTone(dimension.weeklyDelta) === 'neutral'
                    ? theme.palette.text.secondary
                    : theme.palette[deltaTone(dimension.weeklyDelta) as 'success' | 'error'].main,
              })}
            >
              {formatSigned(dimension.weeklyDelta)} wk
            </Typography>
          </Box>
        </Box>
      </Reveal>
    </Box>
  )
}

export function DimensionsSection({ dimensions }: { dimensions: DimensionScore[] }) {
  return (
    <Panel
      title="Readiness profile"
      subtitle="Nine evidence dimensions against the Senior target (dashed)."
    >
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(300px, 0.9fr) 1.4fr' },
          alignItems: 'center',
        }}
      >
        <RadarChart
          label="Readiness profile"
          axes={dimensions.map((d) => ({
            label: SHORT_LABELS[d.id] ?? d.label,
            value: d.score,
            target: d.target,
          }))}
        />
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
