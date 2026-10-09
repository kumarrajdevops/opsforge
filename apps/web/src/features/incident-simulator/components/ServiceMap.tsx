import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { lazy, useMemo, useState } from 'react'
import { PlaybackControls } from '../../../visuals/PlaybackControls'
import { SceneFrame } from '../../../visuals/SceneFrame'
import { useScenePalette } from '../../../visuals/palette'
import { ProgressSource, useProgressValue } from '../../../visuals/progress'
import { usePlayback } from '../../../visuals/usePlayback'
import {
  buildServiceModel,
  incidentWave,
  mapDescription,
  serviceRows,
  waveCues,
  type MapService,
} from '../visual/serviceGraph'

const GraphScene = lazy(() => import('../../../visuals/GraphScene'))

const REPLAY_SECONDS = 8

export interface ServiceMapProps {
  services: readonly MapService[]
  /** Replay how the outage spread, instead of showing the current health. */
  replay?: boolean
  rootCauseId?: string
  height?: number
}

/**
 * Services as a dependency map, callers above the services they depend on. Live, it shows
 * current health. As a replay it shows the order the outage reached each service, derived from
 * the dependencies; the timing is illustrative, not measured.
 */
export function ServiceMap({
  services: incoming,
  replay = false,
  rootCauseId,
  height = 340,
}: ServiceMapProps) {
  const palette = useScenePalette()
  // The console re-renders every second with fresh service objects; keep the scene model stable.
  const key = JSON.stringify(incoming.map((s) => [s.id, s.name, s.kind, s.health, s.dependsOn]))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const services = useMemo(() => incoming, [key])
  const [source] = useState(() => new ProgressSource())
  const wave = useMemo(() => (replay ? incidentWave(services) : null), [replay, services])
  const model = useMemo(
    () => buildServiceModel(services, palette, { wave, rootCauseId }),
    [services, palette, wave, rootCauseId],
  )
  const rows = useMemo(() => serviceRows(services, wave), [services, wave])
  const cues = useMemo(() => {
    const names = new Map(services.map((s) => [s.id, s.name]))
    return wave ? waveCues(wave, (id) => names.get(id) ?? id) : []
  }, [wave, services])
  const playback = usePlayback({
    source,
    durationSeconds: REPLAY_SECONDS,
    startAtEnd: wave === null,
  })
  const position = useProgressValue(source)

  return (
    <SceneFrame
      title={replay ? 'How the incident spread' : 'Service map'}
      description={mapDescription(services, wave !== null)}
      hint="Drag to rotate"
      height={height}
      staticScene={wave === null}
      controls={
        wave ? (
          <>
            <PlaybackControls
              playback={playback}
              cues={cues}
              position={position}
              label="Incident replay"
            />
            <Typography variant="caption" color="text.secondary">
              Order comes from the service dependencies. The timing is illustrative, not measured.
            </Typography>
          </>
        ) : undefined
      }
      fallback={
        <TableContainer>
          <Table size="small" aria-label="Services">
            <TableHead>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Health</TableCell>
                <TableCell>Depends on</TableCell>
                {replay && <TableCell>Reached</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell component="th" scope="row">
                    {r.name}
                  </TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>{r.health}</TableCell>
                  <TableCell>{r.dependsOn}</TableCell>
                  {replay && <TableCell>{r.spread}</TableCell>}
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
