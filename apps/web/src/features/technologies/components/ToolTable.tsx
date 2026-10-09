import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { JdPriority, RequirementStatus } from '@opsforge/types'
import { ProgressBar, ToneChip } from '@opsforge/ui'
import type { ReactNode } from 'react'
import { STATUS_LABEL, statusTone } from '../../jd/presentation'
import { CATEGORY_LABEL } from '../../resume/presentation'
import type { TechnologyCategory } from '../catalog'

export interface ToolRow {
  id: string
  label: string
  category: TechnologyCategory | null
  status: RequirementStatus
  /** Mean of scored direct answers, or null when none exist. */
  score: number | null
  testedAnswers: number
  claims: number
  reason: string
  /** Set on a job description's tools; omitted for a resume's. */
  priority?: JdPriority
  /** Label of the "one of" group when the posting names the tool as one choice among several. */
  choiceOf?: string | null
}

export interface ToolTableProps {
  label: string
  rows: ToolRow[]
  /** Where claims are counted: a job description counts resume lines, a resume counts its own. */
  claimsLabel: string
  action?: (row: ToolRow) => ReactNode
}

/** Numbered, consolidated list of tools with a readiness score for each, ending in the count. */
export function ToolTable({ label, rows, claimsLabel, action }: ToolTableProps) {
  const showNeed = rows.some((r) => r.priority)
  return (
    <>
      <TableContainer>
        <Table size="small" aria-label={label}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>#</TableCell>
              <TableCell>Tool / Technology</TableCell>
              <TableCell>Category</TableCell>
              {showNeed && <TableCell>Needed</TableCell>}
              <TableCell sx={{ minWidth: 150 }}>Readiness</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Evidence</TableCell>
              {action && <TableCell />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.id} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.label}
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.category ? CATEGORY_LABEL[row.category] : <Muted>Other</Muted>}
                </TableCell>
                {showNeed && (
                  <TableCell>
                    <Typography variant="body2">
                      {row.priority === 'preferred' ? 'Preferred' : 'Required'}
                    </Typography>
                    {row.choiceOf && (
                      <Typography variant="caption" color="text.secondary">
                        {row.choiceOf}
                      </Typography>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <ProgressBar
                    label={`${row.label} readiness`}
                    value={row.score ?? 0}
                    tone={statusTone(row.status)}
                    valueLabel={row.score === null ? 'Not scored' : `${row.score}/100`}
                    target={70}
                    targetLabel="Demonstrated at 70"
                  />
                </TableCell>
                <TableCell>
                  <ToneChip tone={statusTone(row.status)} label={STATUS_LABEL[row.status]} />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {row.claims} {claimsLabel}
                    {row.claims === 1 ? '' : 's'}
                  </Typography>
                  <br />
                  <Typography variant="caption" color="text.secondary">
                    {row.testedAnswers} scored {row.testedAnswers === 1 ? 'answer' : 'answers'}
                  </Typography>
                </TableCell>
                {action && <TableCell align="right">{action(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" sx={{ fontWeight: 600, mt: 2 }}>
        Final count: {rows.length} consolidated tools and technologies.
      </Typography>
    </>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <Box component="span" sx={{ color: 'text.secondary' }}>
      {children}
    </Box>
  )
}
