import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import RadioButtonUncheckedOutlined from '@mui/icons-material/RadioButtonUncheckedOutlined'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ArchitectureEvaluation, Scenario } from '@opsforge/types'
import { InlineCode, SideDrawer, ToneChip } from '@opsforge/ui'
import { formatUsd } from '../presentation'

export interface RequirementsDrawerProps {
  open: boolean
  onClose: () => void
  scenario: Scenario
  evaluation: ArchitectureEvaluation
}

export function RequirementsDrawer({
  open,
  onClose,
  scenario,
  evaluation,
}: RequirementsDrawerProps) {
  const { workload } = scenario
  const results = scenario.requirements.map((req, index) => {
    const checkId = `REQ-${String(index + 1).padStart(2, '0')}`
    return { req, result: evaluation.checks.find((c) => c.checkId === checkId) }
  })
  const met = results.filter((r) => r.result?.status === 'pass').length

  const facts: [string, string][] = [
    ['Peak traffic', `${workload.peakRps.toLocaleString('en-US')} rps`],
    ['Reads', `${Math.round(workload.readRatio * 100)}%`],
    ['Availability', `${workload.availabilityTarget}%`],
    ['RPO / RTO', `${workload.rpoMinutes} / ${workload.rtoMinutes} min`],
    ['Budget', `${formatUsd(workload.monthlyBudgetUsd)} / mo`],
    ['Users', workload.globalUsers ? 'Global' : 'Single region'],
  ]

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Requirements"
      subtitle={scenario.title}
      width={460}
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {scenario.summary}
        </Typography>

        <Box>
          <Typography variant="overline" color="text.secondary" component="h3">
            Workload
          </Typography>
          <Box
            component="dl"
            sx={{
              m: 0,
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: 2,
              rowGap: 0.75,
            }}
          >
            {facts.map(([term, value]) => (
              <Box key={term} sx={{ display: 'contents' }}>
                <Typography component="dt" variant="body2" color="text.secondary">
                  {term}
                </Typography>
                <Typography component="dd" variant="body2" sx={{ m: 0 }}>
                  {value}
                </Typography>
              </Box>
            ))}
            {workload.compliance.length > 0 && (
              <>
                <Typography component="dt" variant="body2" color="text.secondary">
                  Compliance
                </Typography>
                <Box component="dd" sx={{ m: 0, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {workload.compliance.map((c) => (
                    <ToneChip key={c} label={c} />
                  ))}
                </Box>
              </>
            )}
          </Box>
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary" component="h3">
            Design requirements ({met} of {results.length} met)
          </Typography>
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}>
            {results.map(({ req, result }) => {
              const pass = result?.status === 'pass'
              return (
                <Box
                  component="li"
                  key={req.id}
                  sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
                >
                  {pass ? (
                    <CheckCircleOutlined color="success" fontSize="small" aria-label="Met" />
                  ) : (
                    <RadioButtonUncheckedOutlined
                      color="disabled"
                      fontSize="small"
                      aria-label="Not met"
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {req.text}
                    </Typography>
                    <Box
                      sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}
                    >
                      <ToneChip
                        tone={req.priority === 'must' ? 'error' : 'info'}
                        label={req.priority === 'must' ? 'Must' : 'Should'}
                      />
                      {result && <InlineCode>{result.checkId}</InlineCode>}
                    </Box>
                    {result && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        component="p"
                        sx={{ m: 0, mt: 0.25 }}
                      >
                        {result.evidence}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </SideDrawer>
  )
}
