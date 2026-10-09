import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ContinueItem, PlanItem, TodayPlan } from '@opsforge/types'
import { Panel, ProgressBar, Reveal, ToneChip } from '@opsforge/ui'
import { formatRelative, moduleLabel } from '../presentation'
import { ModuleButton } from './ModuleButton'

function StatusIcon({ status }: { status: PlanItem['status'] }) {
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
      subtitle="Ranked by the largest expected gain. It changes when your evidence changes."
      actions={<ToneChip tone="neutral" mono label={`${plan.totalMinutes} min`} />}
    >
      {plan.items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No actions yet.
        </Typography>
      )}
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
                  })}
                >
                  <StatusIcon status={item.status} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                    {!item.available && <ToneChip tone="warning" label="Not built yet" />}
                    {isNext && item.available && (
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
    <Panel title="Continue training" subtitle="Your latest attempt in each module.">
      {items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nothing to continue. Finish a scored attempt in any module and it appears here.
        </Typography>
      )}
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
                <ProgressBar
                  label="Last score"
                  value={item.score}
                  tone="primary"
                  valueLabel={`${item.score} / 100`}
                />
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                  <ModuleButton module={item.module} size="small" variant="outlined">
                    Open
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
