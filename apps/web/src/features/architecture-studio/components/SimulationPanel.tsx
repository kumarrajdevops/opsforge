import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { ArchitectureDocument, Scenario, SimulationResult } from '@opsforge/types'
import { StatusIndicator, ToneChip } from '@opsforge/ui'
import { formatMinutes, impactLabel, userImpactLabel, userImpactTone } from '../presentation'
import { FAILURE_LABELS } from '../simulation'

export interface SimulationPanelProps {
  simulation: SimulationResult | null
  scenario: Scenario
  document: ArchitectureDocument
  onClear: () => void
}

function describeFailure(sim: SimulationResult, document: ArchitectureDocument): string {
  const base = FAILURE_LABELS[sim.failure.kind]
  if (sim.failure.kind === 'node-loss' || sim.failure.kind === 'dependency-slow') {
    const id = sim.failure.nodeId
    const label = document.nodes.find((n) => n.id === id)?.label ?? id
    return `${base}: ${label}`
  }
  return base
}

export function SimulationPanel({ simulation, scenario, document, onClear }: SimulationPanelProps) {
  if (!simulation) {
    return (
      <Box sx={{ p: 2, display: 'grid', gap: 1 }}>
        <Typography variant="subtitle2">No failure running</Typography>
        <Typography variant="body2" color="text.secondary">
          Use Simulate failure in the toolbar to lose the selected component, slow a dependency,
          lose an availability zone or lose the primary region. Impact is traced through synchronous
          dependencies in your design.
        </Typography>
        <Typography variant="caption" color="text.secondary">
          A heuristic walk of the graph, not a load test.
        </Typography>
      </Box>
    )
  }

  const { recovery } = simulation
  const impacted = document.nodes.filter((n) => (simulation.nodeImpact[n.id] ?? 'ok') !== 'ok')

  return (
    <Box sx={{ display: 'grid', gap: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2">{describeFailure(simulation, document)}</Typography>
        <Button size="small" onClick={onClear}>
          Clear
        </Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">
          User impact
        </Typography>
        <ToneChip
          tone={userImpactTone[simulation.userImpact]}
          label={userImpactLabel[simulation.userImpact]}
        />
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Affected components ({impacted.length})
        </Typography>
        {impacted.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No component is affected.
          </Typography>
        ) : (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
            {impacted.map((n) => {
              const impact = simulation.nodeImpact[n.id]!
              return (
                <Box
                  component="li"
                  key={n.id}
                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
                >
                  <Typography variant="body2" noWrap>
                    {n.label}
                  </Typography>
                  <StatusIndicator
                    status={impact === 'down' ? 'critical' : 'degraded'}
                    label={impactLabel[impact]}
                  />
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      {simulation.observations.length > 0 && (
        <Box>
          <Typography variant="overline" color="text.secondary" component="h3">
            What happens
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5, display: 'grid', gap: 0.5 }}>
            {simulation.observations.map((o, i) => (
              <Typography component="li" variant="body2" key={i}>
                {o}
              </Typography>
            ))}
          </Box>
        </Box>
      )}

      {recovery && (
        <Box>
          <Typography variant="overline" color="text.secondary" component="h3">
            Recovery vs targets
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" component="div">
                RTO (target {scenario.workload.rtoMinutes} min)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatMinutes(recovery.estimatedRtoMinutes)}
              </Typography>
              {recovery.meetsRto !== null && (
                <ToneChip
                  tone={recovery.meetsRto ? 'success' : 'error'}
                  label={recovery.meetsRto ? 'Meets' : 'Misses'}
                />
              )}
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" component="div">
                RPO (target {scenario.workload.rpoMinutes} min)
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {recovery.estimatedRpoMinutes === null
                  ? 'data would be lost'
                  : formatMinutes(recovery.estimatedRpoMinutes)}
              </Typography>
              {recovery.meetsRpo !== null && (
                <ToneChip
                  tone={recovery.meetsRpo ? 'success' : 'error'}
                  label={recovery.meetsRpo ? 'Meets' : 'Misses'}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
