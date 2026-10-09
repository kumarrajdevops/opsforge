import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { DimensionScore, EvidenceEvent, IncidentRecord } from '@opsforge/types'
import { Panel, Reveal, ToneChip } from '@opsforge/ui'
import {
  formatClock,
  formatRelative,
  incidentOutcomeTone,
  outcomeLabel,
  outcomeTone,
  bandTone,
} from '../presentation'
import { bandFor } from '../../readiness/scoring'

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
      subtitle="Every scored answer, incident and design. This is what readiness is built from."
    >
      {events.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No scored evidence yet.
        </Typography>
      )}
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
                    label={`${outcomeLabel[event.outcome]} ${event.score}`}
                  />
                  <Typography
                    variant="monoSmall"
                    color="text.secondary"
                    title={formatClock(event.at)}
                  >
                    {formatRelative(event.at, now)} · {event.source}
                  </Typography>
                  <Box sx={{ ml: 'auto' }}>
                    <ToneChip
                      tone="neutral"
                      mono
                      label={`${Math.round(event.share * 100)}% of ${label(event.dimension)}`}
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
      {incidents.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No incident has been run yet.
        </Typography>
      )}
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
        {incidents.map((incident, i) => (
          <Box component="li" key={incident.id}>
            <Reveal delay={0.05 * i}>
              <Box
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  border: `1px solid ${theme.palette.border.default}`,
                  borderLeft: `3px solid ${theme.palette[bandTone[bandFor(incident.score)] as 'error'].main}`,
                })}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <ToneChip tone={incidentOutcomeTone[incident.outcome]} label={incident.outcome} />
                  <ToneChip tone="neutral" mono label={`score ${incident.score}`} />
                  <Typography variant="monoSmall" color="text.secondary" sx={{ ml: 'auto' }}>
                    {formatRelative(incident.at, now)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75 }}>
                  {incident.title}
                </Typography>
              </Box>
            </Reveal>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
