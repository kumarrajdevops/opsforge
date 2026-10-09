import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { LearningPhase, PrepPlanItem } from '@opsforge/types'
import { Panel, ToneChip } from '@opsforge/ui'
import { Link as RouterLink } from 'react-router-dom'
import { ACTION_LABEL, STATUS_LABEL, statusTone } from '../presentation'

export function LearningPathView({ phases }: { phases: LearningPhase[] }) {
  if (phases.length === 0) {
    return (
      <Alert severity="success">
        Every measurable requirement is demonstrated. There is nothing to learn from this posting.
      </Alert>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Typography variant="body2" color="text.secondary">
        The same gaps as the Readiness gap tab, ordered as work to do: gaps first, then claims to
        defend, then anything partly covered, then the nice-to-haves. Each step opens the module
        that does the work.
      </Typography>
      {phases.map((phase, index) => (
        <Panel
          key={phase.id}
          title={`${index + 1}. ${phase.title}`}
          subtitle={`${phase.items.length} item${phase.items.length === 1 ? '' : 's'} · about ${phase.minutes} minutes`}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {phase.description}
          </Typography>
          <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 2.5 }}>
            {phase.items.map((item) => (
              <PathItem key={item.id} item={item} />
            ))}
          </Box>
        </Panel>
      ))}
    </Box>
  )
}

function PathItem({ item }: { item: PrepPlanItem }) {
  return (
    <Box
      component="li"
      sx={{ display: 'grid', gap: 0.75, pb: 2, borderBottom: 1, borderColor: 'divider' }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 160 }}>
          {item.label}
        </Typography>
        <ToneChip tone={statusTone(item.status)} label={STATUS_LABEL[item.status]} />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {item.reason}
      </Typography>
      {item.options && (
        <Typography variant="caption" color="text.secondary">
          Pick one to prepare. The steps below follow the option you are closest on.
        </Typography>
      )}
      <Box component="ol" sx={{ m: 0, pl: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
        {item.actions.map((action, i) => (
          <Box
            component="li"
            key={`${action.kind}-${i}`}
            sx={{ display: 'grid', gap: 0.5, pl: 1.5, borderLeft: 2, borderColor: 'divider' }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <ToneChip tone="primary" label={ACTION_LABEL[action.kind]} />
              <Typography variant="body2" sx={{ flex: 1, minWidth: 160 }}>
                {action.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {action.minutes} min
              </Typography>
              {action.path && (
                <Button size="small" component={RouterLink} to={action.path}>
                  Open
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">
              {action.detail}
            </Typography>
            {action.checklist && (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {action.checklist.map((c) => (
                  <Typography component="li" variant="caption" key={c}>
                    {c}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
