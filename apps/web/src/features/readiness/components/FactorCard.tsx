import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { FactorReport } from '@opsforge/types'
import { AnimatedNumber, Panel, ProgressBar, Sparkline, StateSwap, ToneChip } from '@opsforge/ui'
import { ORIGINS } from '../config'
import {
  bandLabel,
  bandTone,
  confidenceLabel,
  confidenceTone,
  formatDay,
  formatPercent,
  formatScore,
  formatSigned,
  severityTone,
  trendLabel,
  trendTone,
} from '../presentation'
import { ActionCard } from './ActionCard'

const MAX_ROWS = 6

/** Everything behind one score: evidence, weaknesses, confidence, trend and the next step. */
export function FactorCard({ factor }: { factor: FactorReport }) {
  const tone = factor.band ? bandTone[factor.band] : 'neutral'
  const hasEvidence = factor.score !== null
  const rows = factor.contributions.slice(0, MAX_ROWS)
  const trendPoints = factor.trend.points.map((p) => ({ label: p.at.slice(0, 10), value: p.score }))

  return (
    <Panel
      title={factor.label}
      actions={
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          <Typography variant="metric" component="span" aria-label={`${factor.label} score`}>
            {factor.score === null ? formatScore(null) : <AnimatedNumber value={factor.score} />}
          </Typography>
          <StateSwap stateKey={factor.band ?? 'none'} inline>
            {factor.band ? (
              <ToneChip tone={tone} label={bandLabel[factor.band]} />
            ) : (
              <ToneChip tone="neutral" label="No evidence" />
            )}
          </StateSwap>
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <ProgressBar
          label="Score against target"
          value={factor.score ?? 0}
          valueLabel={
            hasEvidence
              ? `${formatScore(factor.score)} / target ${factor.target}`
              : `target ${factor.target}`
          }
          tone={tone}
          target={factor.target}
        />

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <ToneChip
            tone={confidenceTone[factor.evidenceConfidence]}
            label={confidenceLabel[factor.evidenceConfidence]}
          />
          <ToneChip tone="neutral" mono label={`${factor.evidenceCount} observations`} />
          <ToneChip tone="neutral" mono label={`${factor.originCount} modules`} />
          <ToneChip
            tone={trendTone[factor.trend.direction]}
            label={`${trendLabel[factor.trend.direction]}${
              factor.trend.delta !== null ? ` ${formatSigned(factor.trend.delta)} pts` : ''
            }`}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {factor.confidenceReason}
        </Typography>

        {trendPoints.length >= 2 && (
          <Box sx={{ maxWidth: 320 }}>
            <Sparkline
              points={trendPoints}
              label={`${factor.label} trend`}
              tone={tone}
              target={factor.target}
              height={48}
            />
          </Box>
        )}

        {rows.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary" component="h4">
              Contributing evidence
            </Typography>
            <TableContainer>
              <Table size="small" aria-label={`${factor.label} evidence`}>
                <TableHead>
                  <TableRow>
                    <TableCell>Evidence</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Share</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.evidenceId}>
                      <TableCell>{c.label}</TableCell>
                      <TableCell>{ORIGINS[c.origin].label}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{formatDay(c.at)}</TableCell>
                      <TableCell align="right">{formatScore(c.score)}</TableCell>
                      <TableCell align="right">{formatPercent(c.share)}</TableCell>
                      <TableCell align="right">{c.points.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {factor.contributions.length > rows.length && (
              <Typography variant="caption" color="text.secondary">
                Plus {factor.contributions.length - rows.length} smaller contributions.
              </Typography>
            )}
          </Box>
        )}

        {factor.weaknesses.length > 0 && (
          <Box>
            <Typography variant="overline" color="text.secondary" component="h4">
              Weaknesses
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 0.75 }}>
              {factor.weaknesses.map((w) => (
                <Box
                  component="li"
                  key={w.id}
                  sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}
                >
                  <ToneChip tone={severityTone[w.severity]} label={w.severity} />
                  <Typography variant="body2">{w.text}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="overline" color="text.secondary" component="h4">
            Recommended next action
          </Typography>
          <ActionCard action={factor.nextAction} />
        </Box>
      </Box>
    </Panel>
  )
}
