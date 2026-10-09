import ListAltOutlined from '@mui/icons-material/ListAltOutlined'
import MenuOpen from '@mui/icons-material/MenuOpen'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { IncidentScenario, IncidentSeverity } from '@opsforge/types'
import { StatusIndicator, ToneChip } from '@opsforge/ui'
import { formatElapsed, formatIncidentTime, incidentMinute } from '../engine'
import { severityMeta, severityOrder } from '../presentation'
import type { SessionStatus } from '../useIncidentSession'

export interface ConsoleHeaderProps {
  scenario: IncidentScenario
  scenarios: IncidentScenario[]
  onScenarioChange: (id: string) => void
  status: SessionStatus
  resolved: boolean
  severity: IncidentSeverity
  onSeverityChange: (severity: IncidentSeverity) => void
  elapsed: number
  progress: { done: number; total: number }
  compact: boolean
  onOpenOverview: () => void
  onSubmit: () => void
  onRestart: () => void
}

/** Incident bar: identity, live state, severity, clocks and the two session-level actions. */
export function ConsoleHeader({
  scenario,
  scenarios,
  onScenarioChange,
  status,
  resolved,
  severity,
  onSeverityChange,
  elapsed,
  progress,
  compact,
  onOpenOverview,
  onSubmit,
  onRestart,
}: ConsoleHeaderProps) {
  const live = status === 'running'
  const overTime = elapsed > scenario.timeboxMinutes * 60
  const state = !live
    ? { status: 'info' as const, label: 'Debrief' }
    : resolved
      ? { status: 'healthy' as const, label: 'Mitigated: verify and write up' }
      : { status: 'critical' as const, label: 'Active incident' }

  return (
    <Box
      component="header"
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: { xs: 1, md: 2 },
        px: { xs: 2, md: 2.5 },
        py: 1,
        minHeight: 56,
        borderBottom: `1px solid ${theme.palette.border.default}`,
        backgroundColor: theme.palette.background.paper,
      })}
    >
      {compact && (
        <Button
          size="small"
          variant="outlined"
          color="inherit"
          startIcon={<MenuOpen />}
          onClick={onOpenOverview}
          aria-label="Open incident overview"
        >
          Overview
        </Button>
      )}
      <Box sx={{ minWidth: 0, flex: '1 1 220px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <ToneChip tone="primary" label="ForgeOps" />
          <StatusIndicator variant="pill" pulse={live && !resolved} {...state} />
        </Box>
        <Typography variant="subtitle1" component="h1" noWrap sx={{ mt: 0.25 }}>
          {scenario.title}
        </Typography>
      </Box>

      <TextField
        select
        size="small"
        label="Scenario"
        value={scenario.id}
        onChange={(event) => onScenarioChange(event.target.value)}
        disabled={live}
        sx={{ minWidth: 190 }}
        helperText={live ? 'Finish or restart to switch' : undefined}
        slotProps={{ formHelperText: { sx: { display: 'none' } } }}
      >
        {scenarios.map((s) => (
          <MenuItem key={s.id} value={s.id}>
            {s.title}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        size="small"
        label="Severity"
        value={severity}
        onChange={(event) => onSeverityChange(event.target.value as IncidentSeverity)}
        disabled={!live}
        sx={{ minWidth: 120 }}
      >
        {severityOrder.map((s) => (
          <MenuItem key={s} value={s}>
            {severityMeta[s].label} · {severityMeta[s].meaning.split(':')[0]}
          </MenuItem>
        ))}
      </TextField>

      <Box
        role="timer"
        aria-label={`Incident time ${formatIncidentTime(incidentMinute(scenario, elapsed))}, ${formatElapsed(elapsed)} elapsed of ${scenario.timeboxMinutes} minutes`}
        sx={{ textAlign: 'right' }}
      >
        <Typography variant="mono" component="div" sx={{ fontWeight: 700 }}>
          {formatIncidentTime(incidentMinute(scenario, elapsed))}
        </Typography>
        <Typography variant="caption" color={overTime ? 'warning.main' : 'text.secondary'}>
          {formatElapsed(elapsed)} / {scenario.timeboxMinutes}:00
          {overTime ? ' · over time-box' : ''}
        </Typography>
      </Box>

      {!compact && (
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {progress.done}/{progress.total} objectives
        </Typography>
      )}

      {live && (
        <Button variant="contained" size="small" startIcon={<ListAltOutlined />} onClick={onSubmit}>
          Submit for debrief
        </Button>
      )}
      <Button variant="outlined" color="inherit" size="small" onClick={onRestart}>
        Restart
      </Button>
    </Box>
  )
}
