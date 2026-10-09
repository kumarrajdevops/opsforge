import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { EvidenceSourceStatus, ReadinessSnapshot } from '@opsforge/types'
import { Panel, StatusIndicator } from '@opsforge/ui'
import { formatClock, formatScore } from '../presentation'

export function SourcesPanel({ sources }: { sources: EvidenceSourceStatus[] }) {
  return (
    <Panel
      title="Evidence sources"
      subtitle="Modules that are not built yet add nothing. Their factors stay empty rather than guessed."
    >
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1.25 }}>
        {sources.map((s) => (
          <Box
            component="li"
            key={s.origin}
            sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, gap: 0.5 }}
          >
            <StatusIndicator
              status={s.connected ? (s.evidenceCount > 0 ? 'healthy' : 'info') : 'unknown'}
              label={s.label}
            />
            <Typography variant="body2" color="text.secondary">
              {s.note}
            </Typography>
          </Box>
        ))}
      </Box>
    </Panel>
  )
}

export function HistoryPanel({ history }: { history: ReadinessSnapshot[] }) {
  const rows = [...history].reverse().slice(0, 10)
  return (
    <Panel
      title="Snapshot history"
      subtitle="Each snapshot is kept as calculated at the time, and is never edited."
    >
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No snapshots yet. One is recorded when evidence first exists.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small" aria-label="Readiness snapshots">
            <TableHead>
              <TableRow>
                <TableCell>Taken</TableCell>
                <TableCell align="right">Overall</TableCell>
                <TableCell align="right">Level</TableCell>
                <TableCell align="right">Observations</TableCell>
                <TableCell>Config</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{formatClock(s.takenAt)}</TableCell>
                  <TableCell align="right">{formatScore(s.overall)}</TableCell>
                  <TableCell align="right">{s.level}</TableCell>
                  <TableCell align="right">{s.evidenceCount}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>{s.configVersion}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Panel>
  )
}
