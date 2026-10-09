import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { toneColors, visuallyHidden } from '@opsforge/ui'
import { useMemo, useState } from 'react'
import { PlaybackControls } from '../../../visuals/PlaybackControls'
import { ProgressSource, useProgressValue } from '../../../visuals/progress'
import { usePlayback } from '../../../visuals/usePlayback'
import { ROUND_LABELS } from '../modes'
import { formatDuration } from '../presentation'
import type { ReplayThread } from '../replay'
import { buildInterviewTimeline, describeTimeline, threadAt } from '../timeline'

const REPLAY_SECONDS = 10

/**
 * The interview as one track, replayed left to right. Plain DOM driven by a GSAP-scrubbed
 * playhead: nothing here needs 3D. The table under it is the text equivalent.
 */
export function InterviewTimeline({ threads }: { threads: ReplayThread[] }) {
  const model = useMemo(
    () => buildInterviewTimeline(threads, (round) => ROUND_LABELS[round]),
    [threads],
  )
  const [source] = useState(() => new ProgressSource())
  const playback = usePlayback({ source, durationSeconds: REPLAY_SECONDS, startAtEnd: true })
  const position = useProgressValue(source)
  const here = threadAt(model, position)

  if (model.segments.length === 0) return null

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        role="img"
        aria-label="Interview timeline"
        aria-describedby="interview-timeline-description"
        sx={(theme) => ({
          position: 'relative',
          display: 'flex',
          height: 44,
          borderRadius: `${theme.opsforge.radius.md}px`,
          border: `1px solid ${theme.palette.border.default}`,
          backgroundColor: theme.palette.background.sunken,
          overflow: 'hidden',
        })}
      >
        {model.segments.map((segment) => (
          <Box
            key={segment.id}
            sx={(theme) => ({
              flex: `${segment.to - segment.from} 1 0`,
              minWidth: 2,
              borderRight: `2px solid ${theme.palette.background.paper}`,
              backgroundColor: toneColors(theme, segment.tone).solid,
              opacity:
                position >= segment.to - 1e-6 ? (segment.kind === 'follow-up' ? 0.7 : 1) : 0.12,
              transition: theme.transitions.create('opacity', { duration: 120 }),
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            })}
          />
        ))}
        <Box
          aria-hidden
          sx={(theme) => ({
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${position * 100}%`,
            width: 2,
            backgroundColor: theme.palette.text.primary,
            pointerEvents: 'none',
          })}
        />
      </Box>
      <Typography id="interview-timeline-description" sx={visuallyHidden}>
        {describeTimeline(model)}
      </Typography>

      <PlaybackControls
        playback={playback}
        cues={model.cues}
        position={position}
        label="Interview replay"
        valueText={() =>
          here ? `Question ${here.index + 1}, ${here.topic}` : 'Start of the interview'
        }
      />
      <Typography variant="caption" color="text.secondary">
        Darker segments are answers, lighter ones are follow-ups. Colour follows the question's
        score; skipped answers are grey.
      </Typography>

      <TableContainer>
        <Table size="small" aria-label="Interview timeline by question">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Round</TableCell>
              <TableCell>Topic</TableCell>
              <TableCell align="right">Answers</TableCell>
              <TableCell align="right">Time</TableCell>
              <TableCell align="right">Score</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {model.threads.map((lane) => (
              <TableRow key={lane.index} selected={here?.index === lane.index}>
                <TableCell>{lane.index + 1}</TableCell>
                <TableCell>{lane.round}</TableCell>
                <TableCell component="th" scope="row">
                  {lane.topic}
                </TableCell>
                <TableCell align="right">{lane.exchanges}</TableCell>
                <TableCell align="right">{formatDuration(lane.seconds)}</TableCell>
                <TableCell align="right">{lane.score === null ? '—' : lane.score}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
