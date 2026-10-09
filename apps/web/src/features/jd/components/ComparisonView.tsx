import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { JdComparison, RequirementAssessment } from '@opsforge/types'
import { Panel, ProgressBar, ToneChip } from '@opsforge/ui'
import { STATUS_LABEL, STATUS_ORDER, statusTone } from '../presentation'

export function ComparisonView({ comparison }: { comparison: JdComparison }) {
  const required = comparison.assessments.filter((a) => a.priority === 'required')
  const preferred = comparison.assessments.filter((a) => a.priority === 'preferred')

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {comparison.testedEvidenceCount === 0 && (
        <Alert severity="warning">
          No scored answers exist yet, so nothing can be shown as demonstrated. Run a mock interview
          or answer resume drills to produce evidence.
        </Alert>
      )}

      <Panel
        title="Coverage of required items"
        subtitle={`Based on ${comparison.testedEvidenceCount} scored answer${comparison.testedEvidenceCount === 1 ? '' : 's'}`}
      >
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <ProgressBar
            label="Demonstrated"
            value={comparison.requiredDemonstrated}
            max={100}
            tone="success"
            valueLabel={`${comparison.requiredDemonstrated}%`}
          />
          <ProgressBar
            label="Demonstrated or partial"
            value={comparison.requiredCoverage}
            max={100}
            tone="primary"
            valueLabel={`${comparison.requiredCoverage}%`}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 2 }}>
          {STATUS_ORDER.map((s) => (
            <ToneChip
              key={s}
              tone={statusTone(s)}
              label={`${STATUS_LABEL[s]} · ${comparison.counts[s]}`}
            />
          ))}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Demonstrated needs at least two scored answers averaging 70 or more. A resume line alone
          is only ever “claimed”. Skills nothing here can measure are marked “No evidence” and left
          out of the percentages. Incident and architecture sessions are not counted: they carry no
          technology tags yet.
        </Typography>
      </Panel>

      <AssessmentGroup title="Required" items={required} />
      <AssessmentGroup title="Preferred" items={preferred} />
    </Box>
  )
}

function AssessmentGroup({ title, items }: { title: string; items: RequirementAssessment[] }) {
  if (items.length === 0) return null
  return (
    <Panel title={title} subtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}>
      <Box
        component="ul"
        aria-label={`${title} requirements`}
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}
      >
        {items.map((a) => (
          <Box
            component="li"
            key={a.id}
            sx={{
              display: 'grid',
              gap: 0.5,
              pb: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 0, pb: 0 },
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 140 }}>
                {a.label}
              </Typography>
              {a.score !== null && <ToneChip mono tone="neutral" label={`avg ${a.score}`} />}
              <ToneChip tone={statusTone(a.status)} label={STATUS_LABEL[a.status]} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              {a.reason}
            </Typography>
            {a.options && (
              <Box
                component="ul"
                aria-label={`Options for ${a.label}`}
                sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 0.75 }}
              >
                {a.options.map((o) => (
                  <Box component="li" key={o.technology} sx={{ display: 'flex', gap: 0.5 }}>
                    <ToneChip
                      tone={statusTone(o.status)}
                      label={`${o.label} · ${STATUS_LABEL[o.status]}${o.score === null ? '' : ` (${o.score})`}`}
                    />
                  </Box>
                ))}
              </Box>
            )}
            {a.evidence.length > 0 && (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {a.evidence.map((e) => (
                  <Typography component="li" variant="caption" color="text.secondary" key={e.id}>
                    {e.label}
                    {e.adjacent ? ' (related technology)' : ''}
                    {e.score === null ? ' · claimed' : ` · ${e.score}`}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Panel>
  )
}
