import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { DimensionScore, EvidenceEvent, IncidentRecord } from '@opsforge/types'
import { Panel, Reveal, ToneChip } from '@opsforge/ui'
import {
  deltaTone,
  formatClock,
  formatRelative,
  formatSigned,
  incidentOutcomeTone,
  outcomeLabel,
  outcomeTone,
  severityTone,
} from '../presentation'

interface EvidenceFeedProps {
  events: EvidenceEvent[]
  dimensions: DimensionScore[]
  now: Date
}

export function EvidenceFeed({ events, dimensions, now }: EvidenceFeedProps) {
  const label = (id: EvidenceEvent['dimension']) => dimensions.find((d) => d.id === id)?.label ?? id
  return (
    <Panel
      title="Recent interview evidence"
      subtitle="Every scored answer, lab and drill. This is what readiness is built from."
    >
      <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {events.map((event, i) => (
          <Box component="li" key={event.id}>
            <Reveal delay={0.04 * i}>
              <Box
                sx={(theme) => ({
                  py: 1.25,
                  borderBottom: `1px solid ${theme.palette.border.subtle}`,
                })}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <ToneChip
                    tone={outcomeTone[event.outcome]}
                    mono
                    label={outcomeLabel[event.outcome]}
                  />
                  <Typography
                    variant="monoSmall"
                    color="text.secondary"
                    title={formatClock(event.at)}
                  >
                    {formatRelative(event.at, now)} · {event.mode}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <ToneChip
                      tone={deltaTone(event.impact)}
                      mono
                      label={`${formatSigned(event.impact, 1)} ${label(event.dimension)}`}
                    />
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75 }}>
                  {event.subject}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label(event.dimension)} · {event.note}
                </Typography>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}

export function RecentIncidents({ incidents, now }: { incidents: IncidentRecord[]; now: Date }) {
  return (
    <Panel title="Recent incidents" subtitle="Simulated, scored on mitigation and root cause.">
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
        {incidents.map((incident, i) => (
          <Box component="li" key={incident.id}>
            <Reveal delay={0.05 * i}>
              <Box
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  border: `1px solid ${theme.palette.border.default}`,
                  borderLeft: `3px solid ${theme.palette[severityTone[incident.severity] as 'error'].main}`,
                })}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <ToneChip tone={severityTone[incident.severity]} mono label={incident.severity} />
                  <ToneChip tone={incidentOutcomeTone[incident.outcome]} label={incident.outcome} />
                  <Typography variant="monoSmall" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatRelative(incident.at, now)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75 }}>
                  {incident.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {incident.minutesToMitigate === null
                    ? 'Not mitigated'
                    : `Mitigated in ${incident.minutesToMitigate} min`}
                  {' · '}
                  {incident.rootCauseFound ? 'root cause found' : 'root cause missed'}
                </Typography>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
