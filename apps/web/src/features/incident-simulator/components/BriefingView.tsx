import PlayArrow from '@mui/icons-material/PlayArrow'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { IncidentScenario } from '@opsforge/types'
import { Panel, ToneChip } from '@opsforge/ui'

const difficultyLabel = { intermediate: 'Intermediate', senior: 'Senior', staff: 'Staff' } as const

export function BriefingView({
  scenario,
  onBegin,
}: {
  scenario: IncidentScenario
  onBegin: () => void
}) {
  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        p: { xs: 2, md: 4 },
        display: 'grid',
        placeItems: { md: 'center' },
      }}
    >
      <Box sx={{ maxWidth: 720, width: '100%' }}>
        <Panel
          title="Incident briefing"
          subtitle="Read this, then take the page."
          actions={
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <ToneChip tone="primary" label="ForgeOps" />
              <ToneChip tone="neutral" label={difficultyLabel[scenario.difficulty]} />
              <ToneChip
                tone="neutral"
                label={scenario.kind === 'security' ? 'Security' : 'Outage'}
              />
            </Box>
          }
        >
          <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
            {scenario.title}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {scenario.summary}
          </Typography>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 3,
              rowGap: 1,
              mb: 2.5,
            }}
          >
            <Typography component="dt" variant="body2" color="text.secondary">
              Your role
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {scenario.role}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Objective
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {scenario.objective}
            </Typography>
            <Typography component="dt" variant="body2" color="text.secondary">
              Time-box
            </Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0 }}>
              {scenario.timeboxMinutes} minutes. The clock runs while the incident is live.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            You start with the page and a service map, not the answer. Telemetry, logs, traces and
            the terminal reveal evidence only when you look. What you check, in what order, and what
            you conclude from it is what gets assessed. Metrics and outputs are scripted for this
            exercise.
          </Typography>
          <Button variant="contained" size="large" startIcon={<PlayArrow />} onClick={onBegin}>
            Take the page
          </Button>
        </Panel>
      </Box>
    </Box>
  )
}
