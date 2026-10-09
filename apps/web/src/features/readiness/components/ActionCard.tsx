import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ReadinessAction } from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { ModuleButton } from '../../command-center/components/ModuleButton'
import { moduleLabel } from '../../command-center/presentation'
import { formatScore } from '../presentation'

/** One recommended next step: what to do, why, what it should move, and where to do it. */
export function ActionCard({ action }: { action: ReadinessAction }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
        gap: 1.5,
        alignItems: 'center',
        p: 1.75,
        borderRadius: `${theme.opsforge.radius.md}px`,
        border: `1px solid ${theme.palette.border.default}`,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
          {action.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {action.why}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <ToneChip tone="neutral" label={moduleLabel[action.module]} />
          <ToneChip tone="neutral" mono label={`~${action.minutes} min`} />
          {action.projection && (
            <ToneChip
              tone="info"
              mono
              label={`A strong result: ${formatScore(action.projection.from)} → ${action.projection.to}`}
            />
          )}
          {!action.available && <ToneChip tone="warning" label="Module not built yet" />}
        </Box>
      </Box>
      {action.available && (
        <ModuleButton module={action.module} variant="outlined" size="small">
          Open
        </ModuleButton>
      )}
    </Box>
  )
}
