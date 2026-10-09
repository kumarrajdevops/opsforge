import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import type { ReadinessReport } from '@opsforge/types'
import { lazy, useMemo } from 'react'
import { SceneFrame } from '../../../visuals/SceneFrame'
import { buildNeuralCoreModel, coreDescription, coreRows } from '../neuralCore/model'

const NeuralCoreScene = lazy(() => import('../neuralCore/NeuralCoreScene'))

/**
 * The readiness factors as one object: size is the score, the faint shell is the target, spoke
 * strength is how much evidence backs it. It shows balance and gaps at a glance; the factor
 * cards below remain the place to read the numbers and their evidence.
 */
export function NeuralCore({ report }: { report: ReadinessReport }) {
  const model = useMemo(() => buildNeuralCoreModel(report), [report])
  const rows = useMemo(() => coreRows(report), [report])

  return (
    <SceneFrame
      title="Neural core: readiness by factor"
      description={coreDescription(report)}
      hint="Drag to rotate"
      height={380}
      fallback={
        <TableContainer>
          <Table size="small" aria-label="Readiness by factor">
            <TableHead>
              <TableRow>
                <TableCell>Factor</TableCell>
                <TableCell align="right">Score</TableCell>
                <TableCell align="right">Target</TableCell>
                <TableCell align="right">Gap</TableCell>
                <TableCell>Band</TableCell>
                <TableCell>Confidence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell component="th" scope="row">
                    {r.factor}
                  </TableCell>
                  <TableCell align="right">{r.score}</TableCell>
                  <TableCell align="right">{r.target}</TableCell>
                  <TableCell align="right">{r.gap}</TableCell>
                  <TableCell>{r.band}</TableCell>
                  <TableCell>{r.confidence}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      }
    >
      {(runtime) => <NeuralCoreScene model={model} runtime={runtime} />}
    </SceneFrame>
  )
}
