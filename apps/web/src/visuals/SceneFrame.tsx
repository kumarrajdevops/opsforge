import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { visuallyHidden } from '@opsforge/ui'
import { useReducedMotion } from 'framer-motion'
import { Component, Suspense, useId, useRef, useState, type ReactNode } from 'react'
import { useScenePalette } from './palette'
import type { SceneRuntime } from './runtime'
import { useInView } from './useInView'
import { useCoarsePointer, useWebGLSupport } from './webgl'

type View = 'scene' | 'table'

export interface SceneFrameProps {
  /** Accessible name of the visualisation. */
  title: string
  /** What the scene shows, in a sentence. Read by screen readers instead of the canvas. */
  description: string
  /** The same information as accessible markup (a table or list). Always reachable. */
  fallback: ReactNode
  /** Short interaction hint, e.g. "Drag to rotate". */
  hint?: string
  height?: number
  /** Extra controls rendered under the scene (playback). */
  controls?: ReactNode
  /** The lazy-loaded scene. Receives what it is allowed to do. */
  children: (runtime: SceneRuntime) => ReactNode
  /** Set when the scene has nothing that moves on its own, so the pause control is hidden. */
  staticScene?: boolean
}

class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch() {
    this.props.onError()
  }
  override render() {
    return this.state.failed ? null : this.props.children
  }
}

/**
 * Accessible frame for every 3D scene. It owns the decisions a scene must not make for itself:
 * whether WebGL exists, whether motion is allowed, whether the scene is on screen, and how a
 * keyboard or screen-reader user reaches the same information (the table view). The WebGL
 * bundle is only requested once the frame scrolls into view.
 */
export function SceneFrame({
  title,
  description,
  fallback,
  hint = 'Drag to rotate',
  height = 360,
  controls,
  children,
  staticScene = false,
}: SceneFrameProps) {
  const webgl = useWebGLSupport()
  const coarse = useCoarsePointer()
  const reduced = useReducedMotion()
  const palette = useScenePalette()
  const descId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [requested, setRequested] = useState<View | null>(null)
  const [paused, setPaused] = useState(false)
  const [failed, setFailed] = useState(false)
  const [seen, setSeen] = useState(false)
  if (inView && !seen) setSeen(true)

  const canShowScene = webgl && !failed
  const view: View = canShowScene ? (requested ?? 'scene') : 'table'
  const animate = !reduced && !paused && inView && !staticScene

  return (
    <Box
      component="figure"
      sx={{ m: 0, display: 'grid', gap: 1, isolation: 'isolate', minWidth: 0 }}
      aria-label={title}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_, next: View | null) => next && setRequested(next)}
          aria-label={`${title} view`}
        >
          <ToggleButton value="scene" disabled={!canShowScene}>
            3D view
          </ToggleButton>
          <ToggleButton value="table">Table</ToggleButton>
        </ToggleButtonGroup>
        {view === 'scene' && !reduced && !staticScene && (
          <Button size="small" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? 'Resume motion' : 'Pause motion'}
          </Button>
        )}
      </Box>

      {!webgl && (
        <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
          The 3D view needs WebGL, which this browser or device does not provide. The table below
          carries the same information.
        </Alert>
      )}
      {failed && webgl && (
        <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
          The 3D view could not start. The table carries the same information.
        </Alert>
      )}

      <Typography id={descId} sx={visuallyHidden}>
        {description} Switch to Table for the same data as text.
      </Typography>

      {view === 'scene' ? (
        <Box
          ref={ref}
          role="img"
          aria-label={title}
          aria-describedby={descId}
          sx={(theme) => ({
            position: 'relative',
            height,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${theme.palette.border.default}`,
            backgroundColor: theme.palette.background.sunken,
            overflow: 'hidden',
          })}
        >
          {seen && (
            <SceneBoundary onError={() => setFailed(true)}>
              <Suspense fallback={<Skeleton variant="rectangular" width="100%" height="100%" />}>
                {children({ animate, visible: inView, interactive: !coarse, palette })}
              </Suspense>
            </SceneBoundary>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            aria-hidden
            sx={{ position: 'absolute', left: 10, bottom: 6, pointerEvents: 'none' }}
          >
            {coarse ? 'Scroll to move on' : hint}
          </Typography>
        </Box>
      ) : (
        <Box ref={ref}>{fallback}</Box>
      )}

      {controls}
    </Box>
  )
}
