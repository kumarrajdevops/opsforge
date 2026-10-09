import Box from '@mui/material/Box'
import { motion, useReducedMotion } from 'framer-motion'
import { toneColors, type Tone } from '../theme/tones'

export interface SparklinePoint {
  label: string
  value: number
}

export interface SparklineProps {
  points: SparklinePoint[]
  /** Accessible description, e.g. "Readiness, last 8 weeks". */
  label: string
  tone?: Tone
  height?: number
  /** Horizontal reference line in the same unit as the points. */
  target?: number
  min?: number
  max?: number
}

const WIDTH = 240
const PAD = 4

/** Responsive trend line with an optional target line. Presentational only. */
export function Sparkline({
  points,
  label,
  tone = 'primary',
  height = 64,
  target,
  min = 0,
  max = 100,
}: SparklineProps) {
  const reduced = useReducedMotion()
  if (points.length < 2) return null

  const x = (i: number) => PAD + (i / (points.length - 1)) * (WIDTH - PAD * 2)
  const y = (v: number) => PAD + (1 - (v - min) / (max - min)) * (height - PAD * 2)
  const line = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`)
    .join(' ')
  const area = `${line} L${x(points.length - 1)} ${height - PAD} L${x(0)} ${height - PAD} Z`
  const last = points[points.length - 1]!

  return (
    <Box
      component="svg"
      role="img"
      aria-label={`${label}: ${points.map((p) => `${p.label} ${p.value}`).join(', ')}`}
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      sx={{ width: '100%', height, display: 'block', overflow: 'visible' }}
    >
      {target !== undefined && (
        <Box
          component="line"
          x1={PAD}
          x2={WIDTH - PAD}
          y1={y(target)}
          y2={y(target)}
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
          sx={(theme) => ({ stroke: theme.palette.border.strong, strokeWidth: 1 })}
        />
      )}
      <Box
        component="path"
        d={area}
        sx={(theme) => ({ fill: toneColors(theme, tone).bg, stroke: 'none' })}
      />
      <Box
        component={motion.path}
        d={line}
        fill="none"
        vectorEffect="non-scaling-stroke"
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
        sx={(theme) => ({
          stroke: toneColors(theme, tone).solid,
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        })}
      />
      <Box
        component="circle"
        cx={x(points.length - 1)}
        cy={y(last.value)}
        r={3}
        sx={(theme) => ({
          fill: toneColors(theme, tone).solid,
          stroke: theme.palette.background.paper,
          strokeWidth: 1.5,
        })}
      />
    </Box>
  )
}
