import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { PrepPlanAction, PreparationPlan } from '@opsforge/types'
import { Panel, ToneChip } from '@opsforge/ui'
import { Link as RouterLink } from 'react-router-dom'
import type { PlanSettings } from '../useJd'
import { ACTION_LABEL, STATUS_LABEL, statusTone } from '../presentation'

export interface PlanViewProps {
  plan: PreparationPlan
  settings: PlanSettings
  onSettings: (settings: PlanSettings) => void
}

const DAY_OPTIONS = [3, 5, 7, 10, 14]
const MINUTE_OPTIONS = [20, 30, 45, 60, 90, 120]

export function PlanView({ plan, settings, onSettings }: PlanViewProps) {
  const labelOf = (id: string) => plan.items.find((i) => i.id === id)?.label ?? id

  if (plan.items.length === 0) {
    return (
      <Alert severity="success">
        Every measurable requirement is demonstrated. Nothing to prepare from this comparison.
      </Alert>
    )
  }

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Panel
        title="Your time"
        subtitle="The plan fills these days greedily, most urgent gaps first."
      >
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            select
            size="small"
            label="Days until the interview"
            value={settings.days}
            onChange={(e) => onSettings({ ...settings, days: Number(e.target.value) })}
          >
            {DAY_OPTIONS.map((d) => (
              <MenuItem key={d} value={d}>
                {d} days
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Minutes per day"
            value={settings.minutesPerDay}
            onChange={(e) => onSettings({ ...settings, minutesPerDay: Number(e.target.value) })}
          >
            {MINUTE_OPTIONS.map((m) => (
              <MenuItem key={m} value={m}>
                {m} minutes
              </MenuItem>
            ))}
          </TextField>
        </Box>
      </Panel>

      <Panel title="Priority order" subtitle="Priority weight times gap severity.">
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
          {plan.items.map((item, i) => (
            <Box
              component="li"
              key={item.id}
              sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ width: 20 }}>
                {i + 1}.
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, minWidth: 140 }}>
                {item.label}
              </Typography>
              <ToneChip
                tone="neutral"
                label={item.priority === 'required' ? 'Required' : 'Preferred'}
              />
              <ToneChip tone={statusTone(item.status)} label={STATUS_LABEL[item.status]} />
              <ToneChip mono tone="neutral" label={`urgency ${item.urgency}`} />
            </Box>
          ))}
        </Box>
      </Panel>

      {plan.schedule.map((day) => (
        <Panel key={day.day} title={`Day ${day.day}`} subtitle={`${day.minutes} minutes`}>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 2 }}>
            {day.slots.map((slot, i) => (
              <Box component="li" key={`${slot.itemId}-${i}`}>
                <ActionRow action={slot.action} context={labelOf(slot.itemId)} />
              </Box>
            ))}
          </Box>
        </Panel>
      ))}

      {plan.unscheduled.length > 0 && (
        <Alert severity="warning">
          Not enough time for: {plan.unscheduled.map(labelOf).join(', ')}. Add days or minutes, or
          accept the risk on these.
        </Alert>
      )}
    </Box>
  )
}

function ActionRow({ action, context }: { action: PrepPlanAction; context: string }) {
  return (
    <Box sx={{ display: 'grid', gap: 0.5 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <ToneChip tone="primary" label={ACTION_LABEL[action.kind]} />
        <Typography variant="body2" sx={{ fontWeight: 500, flex: 1, minWidth: 160 }}>
          {action.label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {action.minutes} min · for {context}
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
  )
}
