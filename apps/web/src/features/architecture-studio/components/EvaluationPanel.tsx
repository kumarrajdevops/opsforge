import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { ArchitectureEvaluation } from '@opsforge/types'
import { ProgressBar, ToneChip } from '@opsforge/ui'
import { useMemo } from 'react'
import { DIMENSIONS, sortFailures } from '../evaluator'
import { formatUsd, scoreTone, severityLabel, severityTone } from '../presentation'

export interface EvaluationPanelProps {
  evaluation: ArchitectureEvaluation
  monthlyBudgetUsd: number
  onSelectNodes: (nodeIds: string[]) => void
}

export function EvaluationPanel({
  evaluation,
  monthlyBudgetUsd,
  onSelectNodes,
}: EvaluationPanelProps) {
  const failures = useMemo(() => sortFailures(evaluation.checks), [evaluation.checks])
  const overBudget = evaluation.cost.monthlyUsd > monthlyBudgetUsd
  const empty = evaluation.dimensions.every((d) => d.score === null)

  return (
    <Box sx={{ display: 'grid', gap: 2.5, p: 2 }}>
      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Dimensions
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0, mb: 1.25 }}>
          Scored by deterministic checks.{empty ? ' Add components to start.' : ''}
        </Typography>
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}>
          {DIMENSIONS.map((meta) => {
            const dim = evaluation.dimensions.find((d) => d.id === meta.id)
            const score = dim?.score ?? null
            return (
              <Box component="li" key={meta.id} title={meta.hint}>
                <ProgressBar
                  label={meta.label}
                  value={score ?? 0}
                  max={100}
                  tone={scoreTone(score)}
                  valueLabel={score === null ? 'No evidence' : `${score}`}
                />
                {dim && dim.failed > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {dim.failed} failing · {dim.passed} passing
                  </Typography>
                )}
              </Box>
            )
          })}
        </Box>
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Indicative cost
        </Typography>
        <Box
          sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography variant="metric">{formatUsd(evaluation.cost.monthlyUsd)}</Typography>
          <Typography variant="caption" color={overBudget ? 'error.main' : 'text.secondary'}>
            of {formatUsd(monthlyBudgetUsd)} / mo budget
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          A planning heuristic from component tiers and traffic, not a price quote.
        </Typography>
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Failing checks ({failures.length})
        </Typography>
        {failures.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {evaluation.overall === null ? 'Nothing to check yet.' : 'No failing checks.'}
          </Typography>
        ) : (
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
            {failures.map((check) => {
              const clickable = check.nodeIds.length > 0
              return (
                <Box
                  component="li"
                  key={check.checkId}
                  sx={(theme) => ({
                    borderRadius: `${theme.opsforge.radius.md}px`,
                    border: `1px solid ${theme.palette.border.subtle}`,
                  })}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => onSelectNodes(check.nodeIds)}
                    disabled={!clickable}
                    sx={(theme) => ({
                      all: 'unset',
                      boxSizing: 'border-box',
                      display: 'block',
                      width: '100%',
                      p: 1.25,
                      cursor: clickable ? 'pointer' : 'default',
                      borderRadius: `${theme.opsforge.radius.md}px`,
                      '&:hover': clickable
                        ? { backgroundColor: theme.palette.action.hover }
                        : undefined,
                      '&:focus-visible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: -2,
                      },
                    })}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <ToneChip
                        tone={severityTone[check.severity]}
                        label={severityLabel[check.severity]}
                      />
                      <Typography variant="monoSmall" color="text.secondary">
                        {check.checkId}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {check.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {check.evidence}
                    </Typography>
                    {check.fix && (
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        <strong>Fix:</strong> {check.fix}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </Box>
  )
}
