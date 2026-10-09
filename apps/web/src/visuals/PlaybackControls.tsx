import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import { visuallyHidden } from '@opsforge/ui'
import { currentCue, type Cue, type Playback } from './usePlayback'

export interface PlaybackControlsProps {
  playback: Playback
  cues: readonly Cue[]
  /** Current normalised position from `useProgressValue`. */
  position: number
  /** Accessible name, e.g. "Failure replay". */
  label: string
  /** Formats the playhead for assistive tech, e.g. "T+4 min". Defaults to the active cue label. */
  valueText?: (position: number) => string
}

/** Play / pause / restart, a scrubber and one button per cue. Works by keyboard, and without motion. */
export function PlaybackControls({
  playback,
  cues,
  position,
  label,
  valueText,
}: PlaybackControlsProps) {
  const active = currentCue(cues, position)
  const text = valueText?.(position) ?? active?.label ?? 'Start'
  return (
    <Box role="group" aria-label={label} sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        {playback.canPlay && (
          <>
            <Button
              size="small"
              variant="outlined"
              onClick={playback.playing ? playback.pause : playback.play}
            >
              {playback.playing ? 'Pause' : position >= 1 ? 'Replay' : 'Play'}
            </Button>
            <Button size="small" onClick={playback.restart}>
              Restart
            </Button>
          </>
        )}
        <Slider
          size="small"
          min={0}
          max={100}
          step={1}
          value={Math.round(position * 100)}
          onChange={(_, v) => playback.seek((Array.isArray(v) ? (v[0] ?? 0) : v) / 100)}
          aria-label={`${label} position`}
          getAriaValueText={() => text}
          valueLabelDisplay="off"
          sx={{ flex: '1 1 160px', minWidth: 140, mx: 1 }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {cues.map((cue) => (
          <Button
            key={cue.id}
            size="small"
            variant={active?.id === cue.id ? 'contained' : 'outlined'}
            color={active?.id === cue.id ? 'primary' : 'inherit'}
            aria-pressed={active?.id === cue.id}
            onClick={() => playback.seek(cue.at)}
          >
            {cue.label}
          </Button>
        ))}
      </Box>
      <Typography role="status" sx={visuallyHidden}>
        {active ? `Now showing: ${active.label}` : 'Not started'}
      </Typography>
    </Box>
  )
}
