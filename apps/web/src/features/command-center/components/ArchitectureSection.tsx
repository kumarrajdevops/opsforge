import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ArchitectureProgress } from '@opsforge/types'
import { Panel, ProgressBar, ToneChip, toneColors, type Tone } from '@opsforge/ui'
import { bandTone } from '../presentation'
import { ModuleButton } from './ModuleButton'

const stageTone: Record<ArchitectureProgress['stages'][number]['status'], Tone> = {
  done: 'success',
  current: 'primary',
  todo: 'neutral',
}

const stageText = { done: 'complete', current: 'in progress', todo: 'not started' } as const

export function ArchitectureSection({ architecture }: { architecture: ArchitectureProgress }) {
  const { current, stages, rubric } = architecture
  return (
    <Panel
      title="Architecture progress"
      subtitle="Design reviews are scored against a rubric, not by length."
      actions={
        <ToneChip
          tone="neutral"
          mono
          label={`${architecture.scenariosCompleted} / ${architecture.scenariosTotal} scenarios`}
        />
      }
    >
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' } }}>
        <Box>
          {current && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              {current.title}
            </Typography>
          )}
          <Box
            component="ol"
            aria-label="Design stages"
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: `repeat(${stages.length}, 1fr)` },
              gap: 1,
            }}
          >
            {stages.map((stage, i) => (
              <Box
                component="li"
                key={stage.id}
                aria-current={stage.status === 'current' ? 'step' : undefined}
              >
                <Box
                  sx={(theme) => ({
                    height: 6,
                    borderRadius: 999,
                    mb: 0.75,
                    backgroundColor:
                      stage.status === 'todo'
                        ? theme.palette.border.default
                        : toneColors(theme, stageTone[stage.status]).solid,
                  })}
                />
                <Typography variant="monoSmall" color="text.secondary" component="p">
                  {String(i + 1).padStart(2, '0')}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: stage.status === 'current' ? 700 : 500 }}
                >
                  {stage.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                  {stageText[stage.status]}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ mt: 2.5 }}>
            <ModuleButton module="architecture" variant="outlined" size="small">
              Open design studio
            </ModuleButton>
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gap: 1.75, alignContent: 'start' }}>
          <Typography
            variant="monoSmall"
            color="text.secondary"
            sx={{ textTransform: 'uppercase' }}
          >
            Latest review rubric
          </Typography>
          {rubric.map((r) => (
            <ProgressBar
              key={r.id}
              label={r.label}
              value={r.score}
              target={r.target}
              tone={bandTone[r.band]}
              valueLabel={`${r.score} / ${r.target}`}
            />
          ))}
        </Box>
      </Box>
    </Panel>
  )
}
