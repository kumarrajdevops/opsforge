import CheckCircle from '@mui/icons-material/CheckCircle'
import LockOutlined from '@mui/icons-material/LockOutlined'
import RadioButtonUnchecked from '@mui/icons-material/RadioButtonUnchecked'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import type { IncidentScenario, IncidentSeverity } from '@opsforge/types'
import { Panel, ProgressBar, StatusIndicator, ToneChip, toneColors } from '@opsforge/ui'
import type { ImpactView, ServiceView } from '../engine'
import {
  healthLabel,
  healthStatus,
  metricTone,
  serviceKindLabel,
  severityMeta,
} from '../presentation'
import type { Objective } from '../progress'

export interface ImpactPanelProps {
  scenario: IncidentScenario
  severity: IncidentSeverity
  impact: ImpactView[]
}

export function ImpactPanel({ scenario, severity, impact }: ImpactPanelProps) {
  const meta = severityMeta[severity]
  return (
    <Panel
      title="Impact"
      actions={
        <ToneChip tone={meta.tone} label={meta.label} aria-label={`Severity ${meta.label}`} />
      }
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {meta.meaning}
      </Typography>
      <Box
        component="blockquote"
        sx={(theme) => ({
          m: 0,
          mb: 2,
          px: 1.5,
          py: 1,
          borderLeft: `3px solid ${theme.palette.border.strong}`,
          backgroundColor: theme.palette.background.sunken,
          borderRadius: `${theme.opsforge.radius.sm}px`,
        })}
      >
        <Typography variant="monoSmall">{scenario.page}</Typography>
      </Box>
      <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.25 }}>
        {impact.map((fact) => (
          <Box key={fact.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {fact.label}
            </Typography>
            <Typography
              component="dd"
              variant="body2"
              sx={{ m: 0, textAlign: 'right', fontWeight: 600 }}
            >
              {fact.locked || fact.value === null ? (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'text.secondary',
                    fontWeight: 400,
                  }}
                >
                  <LockOutlined sx={{ fontSize: 14 }} aria-hidden />
                  Unknown: investigate
                </Box>
              ) : (
                <Box
                  component="span"
                  sx={(theme) => ({
                    color: fact.state ? toneColors(theme, metricTone[fact.state]).solid : undefined,
                  })}
                >
                  {fact.value}
                </Box>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}

export interface ServicesPanelProps {
  services: ServiceView[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ServicesPanel({ services, selectedId, onSelect }: ServicesPanelProps) {
  return (
    <Panel title="Affected services" subtitle="Select a service to open its logs" flush>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {services.map((service) => (
          <Box
            component="li"
            key={service.id}
            sx={(theme) => ({
              borderBottom: `1px solid ${theme.palette.border.subtle}`,
              '&:last-child': { borderBottom: 0 },
            })}
          >
            <ButtonBase
              onClick={() => onSelect(service.id)}
              aria-pressed={service.id === selectedId}
              aria-label={`${service.name}, ${healthLabel[service.health]}`}
              sx={(theme) => ({
                display: 'block',
                width: '100%',
                textAlign: 'left',
                px: 2.5,
                py: 1.25,
                backgroundColor:
                  service.id === selectedId ? theme.palette.action.selected : 'transparent',
                '&:hover': { backgroundColor: theme.palette.action.hover },
              })}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {service.name}
                </Typography>
                <StatusIndicator
                  status={healthStatus[service.health]}
                  label={healthLabel[service.health]}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" component="div">
                {serviceKindLabel[service.kind]} · {service.note}
              </Typography>
              {service.headline.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
                  {service.headline.map((metric) => (
                    <ToneChip
                      key={metric.id}
                      mono
                      tone={metricTone[metric.state]}
                      label={`${metric.label} ${metric.value}`}
                    />
                  ))}
                </Box>
              )}
            </ButtonBase>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}

export interface MissionPanelProps {
  scenario: IncidentScenario
  objectives: Objective[]
  progress: { done: number; total: number }
}

export function MissionPanel({ scenario, objectives, progress }: MissionPanelProps) {
  const next = objectives.find((o) => !o.done)
  return (
    <Panel title="Mission" subtitle={scenario.role}>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {scenario.objective}
      </Typography>
      <ProgressBar
        label="Objectives"
        value={progress.done}
        max={progress.total}
        valueLabel={`${progress.done} of ${progress.total}`}
        tone={progress.done === progress.total ? 'success' : 'primary'}
      />
      <Box component="ul" sx={{ m: 0, mt: 2, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}>
        {objectives.map((objective) => (
          <Box
            component="li"
            key={objective.id}
            sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
          >
            {objective.done ? (
              <CheckCircle color="success" sx={{ fontSize: 18 }} titleAccess="Done" />
            ) : (
              <RadioButtonUnchecked
                sx={{ fontSize: 18, color: 'text.disabled' }}
                titleAccess="Not done"
              />
            )}
            <Typography
              variant="body2"
              sx={{
                color: objective.done ? 'text.secondary' : 'text.primary',
                textDecoration: objective.done ? 'line-through' : 'none',
              }}
            >
              {objective.label}
            </Typography>
          </Box>
        ))}
      </Box>
      {next && (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5, mb: 0 }}>
          Next: {next.hint}
        </Typography>
      )}
    </Panel>
  )
}
