import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ArchitectureProgress } from '@opsforge/types'
import { Panel, ProgressBar, ToneChip } from '@opsforge/ui'
import { bandLabel, bandTone } from '../presentation'
import { ModuleButton } from './ModuleButton'

export function ArchitectureSection({ architecture }: { architecture: ArchitectureProgress }) {
  const { latest } = architecture
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
        <Box sx={{ display: 'grid', gap: 1.5, alignContent: 'start' }}>
          {latest ? (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {latest.title}
              </Typography>
              <ProgressBar
                label="Latest design review score"
                value={latest.score}
                tone={bandTone[latest.band]}
                valueLabel={`${latest.score} / 100 · ${bandLabel[latest.band]}`}
              />
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No design has been reviewed yet. Pick a scenario and run the checks to start.
            </Typography>
          )}
          <Box>
            <ModuleButton module="architecture" variant="outlined" size="small">
              Open design studio
            </ModuleButton>
          </Box>
        </Box>
        {latest && (
          <Box sx={{ display: 'grid', gap: 1, alignContent: 'start' }}>
            <Typography
              variant="monoSmall"
              color="text.secondary"
              sx={{ textTransform: 'uppercase' }}
            >
              Gaps in the latest review
            </Typography>
            {latest.gaps.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No gaps recorded.
              </Typography>
            ) : (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {latest.gaps.map((gap) => (
                  <Typography key={gap} component="li" variant="body2">
                    {gap}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Panel>
  )
}
