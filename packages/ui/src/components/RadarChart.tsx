import Box from '@mui/material/Box'
import { motion, useReducedMotion } from 'framer-motion'
import { toneColors, type Tone } from '../theme/tones'

export interface RadarAxis {
  label: string
  value: number
  /** Benchmark drawn as a dashed outline. */
  target?: number
}

export interface RadarChartProps {
  axes: RadarAxis[]
  /** Accessible summary; the values are appended automatically. */
  label: string
  tone?: Tone
  max?: number
}

const WIDTH = 440
const HEIGHT = 340
const CX = WIDTH / 2
const CY = HEIGHT / 2
const RADIUS = 108
const RINGS = [0.25, 0.5, 0.75, 1]

function polar(index: number, count: number, ratio: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2
  return {
    x: CX + Math.cos(angle) * RADIUS * ratio,
    y: CY + Math.sin(angle) * RADIUS * ratio,
  }
}

/** Radar of scores per axis with an optional target outline. Presentational only. */
export function RadarChart({ axes, label, tone = 'primary', max = 100 }: RadarChartProps) {
  const reduced = useReducedMotion()
  const n = axes.length
  if (n < 3) return null

  const clampRatio = (v: number) => Math.min(Math.max(v, 0), max) / max
  const toPoints = (ratios: number[]) =>
    ratios
      .map((r, i) => {
        const p = polar(i, n, r)
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
      })
      .join(' ')
  const hasTarget = axes.every((a) => a.target !== undefined)

  return (
    <Box
      component="svg"
      role="img"
      aria-label={`${label}: ${axes.map((a) => `${a.label} ${a.value}`).join(', ')}`}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      sx={{ width: '100%', maxWidth: 460, height: 'auto', display: 'block', mx: 'auto' }}
    >
      {RINGS.map((r) => (
        <Box
          key={r}
          component="polygon"
          points={toPoints(axes.map(() => r))}
          sx={(theme) => ({
            fill: 'none',
            stroke: r === 1 ? theme.palette.border.strong : theme.palette.border.default,
            strokeWidth: 1,
          })}
        />
      ))}
      {axes.map((a, i) => {
        const end = polar(i, n, 1)
        return (
          <Box
            key={a.label}
            component="line"
            x1={CX}
            y1={CY}
            x2={end.x}
            y2={end.y}
            sx={(theme) => ({ stroke: theme.palette.border.subtle, strokeWidth: 1 })}
          />
        )
      })}
      {hasTarget && (
        <Box
          component="polygon"
          points={toPoints(axes.map((a) => clampRatio(a.target ?? 0)))}
          strokeDasharray="4 3"
          sx={(theme) => ({
            fill: 'none',
            stroke: theme.palette.text.secondary,
            strokeWidth: 1.25,
          })}
        />
      )}
      <Box
        component={motion.polygon}
        points={toPoints(axes.map((a) => clampRatio(a.value)))}
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
        sx={(theme) => ({
          fill: toneColors(theme, tone).bg,
          stroke: toneColors(theme, tone).solid,
          strokeWidth: 2,
          strokeLinejoin: 'round',
        })}
      />
      {axes.map((a, i) => {
        const p = polar(i, n, clampRatio(a.value))
        const l = polar(i, n, 1.16)
        const anchor = Math.abs(l.x - CX) < 6 ? 'middle' : l.x > CX ? 'start' : 'end'
        return (
          <g key={a.label}>
            <Box
              component="circle"
              cx={p.x}
              cy={p.y}
              r={3}
              sx={(theme) => ({
                fill: toneColors(theme, tone).solid,
                stroke: theme.palette.background.paper,
                strokeWidth: 1.5,
              })}
            />
            <Box
              component="text"
              x={l.x}
              y={l.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              sx={(theme) => ({
                fill: theme.palette.text.secondary,
                fontFamily: theme.typography.fontFamily,
                fontSize: 10.5,
                fontWeight: 600,
              })}
            >
              {a.label}
            </Box>
          </g>
        )
      })}
    </Box>
  )
}
