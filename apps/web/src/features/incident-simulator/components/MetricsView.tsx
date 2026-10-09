import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { MetricSeries } from '@opsforge/types'
import { toneColors } from '@opsforge/ui'

const WIDTH = 640
const HEIGHT = 200
const PAD = { top: 12, right: 12, bottom: 24, left: 44 }

function format(value: number, unit: string): string {
  const text = Number.isInteger(value) ? String(value) : value.toFixed(1)
  return unit ? `${text} ${unit}` : text
}

function describe(series: MetricSeries, points: number[]): string {
  const peak = Math.max(...points)
  return `${series.label}. Started at ${format(points[0] ?? 0, series.unit)}, now ${format(points[points.length - 1] ?? 0, series.unit)}, peak ${format(peak, series.unit)}.`
}

export interface MetricChartProps {
  series: MetricSeries
  points: number[]
}

/** Single-series line chart with warn/crit thresholds. Time runs left to right in minutes from T+00. */
export function MetricChart({ series, points }: MetricChartProps) {
  const theme = useTheme()
  const warn = toneColors(theme, 'warning').solid
  const crit = toneColors(theme, 'error').solid
  const line = toneColors(theme, 'primary').solid
  const max = Math.max(...points, series.critAt ?? 0, series.warnAt ?? 0) * 1.1 || 1
  const x = (i: number) =>
    PAD.left + (i / Math.max(points.length - 1, 1)) * (WIDTH - PAD.left - PAD.right)
  const y = (v: number) => PAD.top + (1 - v / max) * (HEIGHT - PAD.top - PAD.bottom)
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(p).toFixed(1)}`)
    .join(' ')
  const ticks = [0, 0.5, 1].map((f) => f * max)
  const labelEvery = Math.ceil(points.length / 6)

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={describe(series, points)}
      sx={{ width: '100%', height: 'auto', display: 'block' }}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(t)}
            y2={y(t)}
            stroke={theme.palette.border.subtle}
          />
          <text
            x={PAD.left - 6}
            y={y(t) + 4}
            textAnchor="end"
            fontSize="11"
            fill={theme.palette.text.secondary}
            fontFamily={theme.typography.monoSmall.fontFamily}
          >
            {format(Math.round(t * 10) / 10, '')}
          </text>
        </g>
      ))}
      {series.warnAt !== undefined && (
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(series.warnAt)}
          y2={y(series.warnAt)}
          stroke={warn}
          strokeDasharray="4 4"
        />
      )}
      {series.critAt !== undefined && (
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={y(series.critAt)}
          y2={y(series.critAt)}
          stroke={crit}
          strokeDasharray="4 4"
        />
      )}
      {points.map((_, i) =>
        i % labelEvery === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize="11"
            fill={theme.palette.text.secondary}
            fontFamily={theme.typography.monoSmall.fontFamily}
          >
            T+{String(i).padStart(2, '0')}
          </text>
        ) : null,
      )}
      <path d={path} fill="none" stroke={line} strokeWidth="2" strokeLinejoin="round" />
      <circle
        cx={x(points.length - 1)}
        cy={y(points[points.length - 1] ?? 0)}
        r="3.5"
        fill={line}
      />
    </Box>
  )
}

export interface MetricsViewProps {
  series: MetricSeries[]
  serviceName: (id: string) => string
  selectedId: string | null
  points: number[] | null
  onSelect: (id: string) => void
}

export function MetricsView({
  series,
  serviceName,
  selectedId,
  points,
  onSelect,
}: MetricsViewProps) {
  const selected = series.find((s) => s.id === selectedId)
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '220px 1fr' } }}>
      <Box
        component="ul"
        aria-label="Metrics"
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5, alignContent: 'start' }}
      >
        {series.map((s) => (
          <li key={s.id}>
            <ButtonBase
              onClick={() => onSelect(s.id)}
              aria-pressed={s.id === selectedId}
              sx={(theme) => ({
                width: '100%',
                display: 'block',
                textAlign: 'left',
                px: 1.25,
                py: 0.75,
                borderRadius: `${theme.opsforge.radius.sm}px`,
                border: `1px solid ${s.id === selectedId ? theme.palette.primary.main : theme.palette.border.subtle}`,
                backgroundColor:
                  s.id === selectedId ? theme.palette.action.selected : 'transparent',
                '&:hover': { backgroundColor: theme.palette.action.hover },
              })}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {s.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {serviceName(s.serviceId)}
              </Typography>
            </ButtonBase>
          </li>
        ))}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        {selected && points ? (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2,
                flexWrap: 'wrap',
              }}
            >
              <Box>
                <Typography variant="subtitle2">{selected.label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {serviceName(selected.serviceId)} · one sample per minute · indicative values
                </Typography>
              </Box>
              <Typography variant="metric" component="div">
                {format(points[points.length - 1] ?? 0, selected.unit)}
              </Typography>
            </Box>
            <MetricChart series={selected} points={points} />
            {selected.description && (
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
                {selected.description}
              </Typography>
            )}
          </>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="subtitle2">Pick a metric</Typography>
            <Typography variant="body2" color="text.secondary">
              Charts load on demand. What you choose to look at, and in what order, is part of the
              investigation.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
