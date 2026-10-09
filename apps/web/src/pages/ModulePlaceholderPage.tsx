import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { PageHeader, Panel, ToneChip } from '@opsforge/ui'
import type { ModuleDefinition } from '../app/modules'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Box component="div">
      <Typography component="dt" variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography component="dd" variant="body2" sx={{ m: 0 }}>
        {value}
      </Typography>
    </Box>
  )
}

/** Temporary page for modules whose feature work has not started. Contains no feature logic. */
export function ModulePlaceholderPage({ module }: { module: ModuleDefinition }) {
  const { planned } = module
  return (
    <>
      <PageHeader
        eyebrow={module.forge ?? 'OPSFORGE'}
        title={module.label}
        description={module.summary}
        actions={<ToneChip tone="neutral" label="Not implemented" />}
      />
      <Panel title="Planned">
        <Typography variant="body1" color="text.secondary">
          This module is part of the approved product scope and will be built in its roadmap phase.
          Nothing here is scored or saved yet.
        </Typography>
        {planned && (
          <Box
            component="dl"
            sx={{
              m: 0,
              mt: 2,
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            }}
          >
            <Fact label="Roadmap" value={planned.phase} />
            <Fact label="Feeds readiness" value={planned.feeds ?? 'No factor of its own'} />
            <Fact label="Needs first" value={planned.needs ?? 'Nothing'} />
          </Box>
        )}
      </Panel>
    </>
  )
}
