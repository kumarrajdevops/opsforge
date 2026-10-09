import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ContinueItem, PlanItem, TodayPlan } from '@opsforge/types'
import { Panel, ProgressBar, Reveal, ToneChip } from '@opsforge/ui'
import { formatRelative, moduleLabel } from '../presentation'
import { ModuleButton } from './ModuleButton'

function StatusIcon({ status }: { status: PlanItem['status'] }) {
  if (status === 'done')
    return <CheckCircleIcon fontSize="small" color="success" titleAccess="Done" />
  if (status === 'next') {
    return <PlayCircleFilledIcon fontSize="small" color="primary" titleAccess="Up next" />
  }
  return (
    <RadioButtonUncheckedIcon
      fontSize="small"
      sx={{ color: 'text.disabled' }}
      titleAccess="To do"
    />
  )
}

export function TodayPlanSection({ plan }: { plan: TodayPlan }) {
  return (
    <Panel
      title="Today’s adaptive plan"
      subtitle="Built from your weakest evidence. It re-plans after each session."
      actions={
        <ToneChip
          tone="neutral"
          mono
          label={`${plan.completedMinutes} / ${plan.totalMinutes} min`}
        />
      }
    >
      <Box sx={{ mb: 2 }}>
        <ProgressBar
          label="Plan progress"
          value={plan.completedMinutes}
          max={plan.totalMinutes}
          valueLabel={`${Math.round((plan.completedMinutes / plan.totalMinutes) * 100)}%`}
          tone="primary"
        />
      </Box>
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {plan.items.map((item, i) => {
          const isNext = item.status === 'next'
          return (
            <Box component="li" key={item.id}>
              <Reveal delay={0.04 * i}>
                <Box
                  aria-current={isNext ? 'step' : undefined}
                  sx={(theme) => ({
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 1.5,
                    alignItems: 'center',
                    py: 1.25,
                    px: 1.25,
                    mx: -1.25,
                    borderRadius: `${theme.opsforge.radius.md}px`,
                    borderBottom: isNext ? 'none' : `1px solid ${theme.palette.border.subtle}`,
                    backgroundColor: isNext ? theme.palette.action.hover : 'transparent',
                    opacity: item.status === 'done' ? 0.7 : 1,
                  })}
                >
                  <StatusIcon status={item.status} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 600,
                        textDecoration: item.status === 'done' ? 'line-through' : 'none',
                      }}
                    >
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.reason}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="monoSmall" color="text.secondary">
                      {item.minutes}m
                    </Typography>
                    {isNext && (
                      <ModuleButton module={item.module} size="small" variant="contained">
                        Start
                      </ModuleButton>
                    )}
                  </Box>
                </Box>
              </Reveal>
            </Box>
          )
        })}
      </Box>
    </Panel>
  )
}

export function ContinueTraining({ items, now }: { items: ContinueItem[]; now: Date }) {
  return (
    <Panel title="Continue training" subtitle="Pick up where you left off.">
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.5 }}>
        {items.map((item, i) => (
          <Box component="li" key={item.id}>
            <Reveal delay={0.05 * i}>
              <Box
                sx={(theme) => ({
                  p: 1.75,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  border: `1px solid ${theme.palette.border.default}`,
                })}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="monoSmall" color="text.secondary">
                    {moduleLabel[item.module]} · {formatRelative(item.lastActive, now)}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {item.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 1 }}>
                  {item.detail}
                </Typography>
                <ProgressBar label="Progress" value={item.progress} tone="primary" />
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <ModuleButton module={item.module} size="small" variant="outlined">
                    Resume
                  </ModuleButton>
                </Box>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
