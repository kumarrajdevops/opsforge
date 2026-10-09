import { PageHeader, Panel, ToneChip } from '@opsforge/ui'
import Typography from '@mui/material/Typography'
import type { ModuleDefinition } from '../app/modules'

/** Temporary page for modules whose feature work has not started. Contains no feature logic. */
export function ModulePlaceholderPage({ module }: { module: ModuleDefinition }) {
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
          The shell, navigation and design system are ready for it.
        </Typography>
      </Panel>
    </>
  )
}
