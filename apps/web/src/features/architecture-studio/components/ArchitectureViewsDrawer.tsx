import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { ArchitectureDocument, SimulationResult } from '@opsforge/types'
import { SectionTabs, SideDrawer } from '@opsforge/ui'
import { lazy, useMemo, useState } from 'react'
import { PlaybackControls } from '../../../visuals/PlaybackControls'
import { SceneFrame } from '../../../visuals/SceneFrame'
import { ProgressSource, useProgressValue } from '../../../visuals/progress'
import { useScenePalette } from '../../../visuals/palette'
import { usePlayback } from '../../../visuals/usePlayback'
import {
  buildArchitectureModel,
  componentRows,
  viewDescription,
  waveCues,
  type ArchitectureView,
} from '../visual/graphModels'

const GraphScene = lazy(() => import('../../../visuals/GraphScene'))

const REPLAY_SECONDS = 6

export interface ArchitectureViewsDrawerProps {
  open: boolean
  onClose: () => void
  document: ArchitectureDocument
  simulation: SimulationResult | null
}

function ViewPanel({
  view,
  document,
  simulation,
}: {
  view: ArchitectureView
  document: ArchitectureDocument
  simulation: SimulationResult | null
}) {
  const palette = useScenePalette()
  const [source] = useState(() => new ProgressSource())
  const { model, wave } = useMemo(
    () => buildArchitectureModel(document, view, palette, simulation),
    [document, view, palette, simulation],
  )
  const rows = useMemo(() => componentRows(document, simulation), [document, simulation])
  const cues = useMemo(() => {
    const labels = new Map(document.nodes.map((n) => [n.id, n.label]))
    return wave ? waveCues(wave, (id) => labels.get(id) ?? id) : []
  }, [wave, document.nodes])
  const playback = usePlayback({
    source,
    durationSeconds: REPLAY_SECONDS,
    startAtEnd: wave === null,
  })
  const position = useProgressValue(source)

  return (
    <SceneFrame
      title={view === 'topology' ? 'Infrastructure topology' : 'Architecture depth'}
      description={viewDescription(view, rows, wave !== null)}
      hint="Drag to rotate"
      height={400}
      staticScene={wave === null}
      controls={
        wave ? (
          <PlaybackControls
            playback={playback}
            cues={cues}
            position={position}
            label="Failure replay"
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Run Simulate failure to replay how an outage spreads through these components.
          </Typography>
        )
      }
      fallback={
        <TableContainer>
          <Table size="small" aria-label="Components">
            <TableHead>
              <TableRow>
                <TableCell>Component</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Region</TableCell>
                <TableCell align="right">Zones</TableCell>
                <TableCell align="right">Replicas</TableCell>
                <TableCell>Layer</TableCell>
                <TableCell>Impact</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell component="th" scope="row">
                    {r.label}
                  </TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.region}</TableCell>
                  <TableCell align="right">{r.zones}</TableCell>
                  <TableCell align="right">{r.replicas}</TableCell>
                  <TableCell>{r.layer}</TableCell>
                  <TableCell>{r.impact}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      }
    >
      {(runtime) => <GraphScene model={model} runtime={runtime} progress={source} />}
    </SceneFrame>
  )
}

/** Read-only 3D companions to the 2D canvas: where components run, and how deep the call chain goes. */
export function ArchitectureViewsDrawer({
  open,
  onClose,
  document,
  simulation,
}: ArchitectureViewsDrawerProps) {
  const [view, setView] = useState<ArchitectureView>('topology')
  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="3D views"
      subtitle="Read-only. Edit on the canvas."
      width={640}
    >
      {open && (
        <Box sx={{ display: 'grid', gap: 2 }}>
          <SectionTabs
            label="3D views"
            value={view}
            onChange={(id) => setView(id as ArchitectureView)}
            items={[
              { id: 'topology', label: 'Topology', content: null },
              { id: 'depth', label: 'Depth', content: null },
            ]}
          />
          <ViewPanel
            key={`${view}:${simulation ? JSON.stringify(simulation.failure) : 'none'}`}
            view={view}
            document={document}
            simulation={simulation}
          />
        </Box>
      )}
    </SideDrawer>
  )
}
