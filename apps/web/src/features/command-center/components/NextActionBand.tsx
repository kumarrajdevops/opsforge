import BoltOutlined from '@mui/icons-material/BoltOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { RecommendedAction } from '@opsforge/types'
import { Reveal, ToneChip } from '@opsforge/ui'
import { moduleLabel } from '../presentation'
import { Eyebrow } from './Eyebrow'
import { ModuleButton } from './ModuleButton'

export function NextActionBand({ action }: { action: RecommendedAction }) {
  return (
    <Reveal delay={0.1}>
      <Box
        component="section"
        aria-label="Recommended next action"
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
          gap: { xs: 1.5, md: 3 },
          alignItems: 'center',
          p: 2.5,
          borderRadius: `${theme.opsforge.radius.lg}px`,
          border: `1px solid ${theme.palette.primary.main}`,
          backgroundColor: theme.palette.background.paper,
          boxShadow: `inset 4px 0 0 ${theme.palette.primary.main}`,
        })}
      >
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 44,
            height: 44,
            borderRadius: `${theme.opsforge.radius.md}px`,
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          })}
        >
          <BoltOutlined />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Eyebrow>Recommended next action</Eyebrow>
          <Typography variant="h4" component="h2" sx={{ my: 0.25 }}>
            {action.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 760, mb: 1.25 }}>
            {action.why}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <ToneChip tone="neutral" mono label={`${action.estimatedMinutes} min`} />
            <ToneChip tone="success" mono label={action.expectedImpact} />
            <ToneChip tone="neutral" label={moduleLabel[action.module]} />
          </Box>
        </Box>
        <ModuleButton module={action.module} variant="contained" size="large">
          Start now
        </ModuleButton>
      </Box>
    </Reveal>
  )
}
