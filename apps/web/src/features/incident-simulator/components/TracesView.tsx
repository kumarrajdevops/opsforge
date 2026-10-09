import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import type { TraceRecord, TraceSpan } from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { formatIncidentTime } from '../engine'

function depthOf(span: TraceSpan, byId: Map<string, TraceSpan>): number {
  let depth = 0
  let current = span
  while (current.parentId) {
    const parent = byId.get(current.parentId)
    if (!parent) break
    depth++
    current = parent
  }
  return depth
}

function ms(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`
}

export interface TraceWaterfallProps {
  trace: TraceRecord
  serviceName: (id: string) => string
}

export function TraceWaterfall({ trace, serviceName }: TraceWaterfallProps) {
  const [spanId, setSpanId] = useState<string | null>(null)
  const byId = new Map(trace.spans.map((s) => [s.id, s]))
  const total = Math.max(trace.durationMs, ...trace.spans.map((s) => s.startMs + s.durationMs), 1)
  const selected = trace.spans.find((s) => s.id === spanId)

  return (
    <Box>
      <Box role="list" aria-label="Spans" sx={{ display: 'grid', gap: 0.5 }}>
        {trace.spans.map((span) => {
          const depth = depthOf(span, byId)
          return (
            <ButtonBase
              key={span.id}
              role="listitem"
              onClick={() => setSpanId(span.id === spanId ? null : span.id)}
              aria-pressed={span.id === spanId}
              sx={(theme) => ({
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(180px, 38%) 1fr' },
                gap: { xs: 0.5, sm: 1.5 },
                textAlign: 'left',
                alignItems: 'center',
                px: 1,
                py: 0.5,
                borderRadius: `${theme.opsforge.radius.sm}px`,
                backgroundColor: span.id === spanId ? theme.palette.action.selected : 'transparent',
                '&:hover': { backgroundColor: theme.palette.action.hover },
              })}
            >
              <Box sx={{ pl: depth * 2, minWidth: 0 }}>
                <Typography variant="monoSmall" noWrap component="div" sx={{ fontWeight: 600 }}>
                  {span.operation}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {serviceName(span.serviceId)} · {ms(span.durationMs)}
                  {span.status === 'error' ? ' · error' : ''}
                </Typography>
              </Box>
              <Box
                aria-hidden
                sx={(theme) => ({
                  position: 'relative',
                  height: 14,
                  backgroundColor: theme.palette.background.sunken,
                  borderRadius: '3px',
                })}
              >
                <Box
                  sx={(theme) => ({
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${(span.startMs / total) * 100}%`,
                    width: `${Math.max((span.durationMs / total) * 100, 0.8)}%`,
                    borderRadius: '3px',
                    backgroundColor:
                      span.status === 'error'
                        ? theme.palette.error.main
                        : theme.palette.primary.main,
                  })}
                />
              </Box>
            </ButtonBase>
          )
        })}
      </Box>
      {selected && (
        <Box
          sx={(theme) => ({
            mt: 1.5,
            p: 1.5,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${theme.palette.border.subtle}`,
            backgroundColor: theme.palette.background.sunken,
          })}
        >
          <Typography variant="subtitle2">{selected.operation}</Typography>
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
            {serviceName(selected.serviceId)} · starts +{ms(selected.startMs)} ·{' '}
            {ms(selected.durationMs)}
          </Typography>
          {selected.tags && Object.keys(selected.tags).length > 0 ? (
            <Box
              component="dl"
              sx={{
                m: 0,
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                columnGap: 1.5,
                rowGap: 0.25,
              }}
            >
              {Object.entries(selected.tags).map(([key, value]) => (
                <Box key={key} sx={{ display: 'contents' }}>
                  <Typography component="dt" variant="monoSmall" color="text.secondary">
                    {key}
                  </Typography>
                  <Typography component="dd" variant="monoSmall" sx={{ m: 0 }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No tags on this span.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  )
}

export interface TracesViewProps {
  traces: TraceRecord[]
  serviceName: (id: string) => string
  selectedId: string | null
  onSelect: (id: string) => void
}

export function TracesView({ traces, serviceName, selectedId, onSelect }: TracesViewProps) {
  const selected = traces.find((t) => t.id === selectedId)
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box
        component="ul"
        aria-label="Traces"
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}
      >
        {traces.map((trace) => (
          <li key={trace.id}>
            <ButtonBase
              onClick={() => onSelect(trace.id)}
              aria-pressed={trace.id === selectedId}
              sx={(theme) => ({
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 1.25,
                py: 0.75,
                textAlign: 'left',
                borderRadius: `${theme.opsforge.radius.sm}px`,
                border: `1px solid ${trace.id === selectedId ? theme.palette.primary.main : theme.palette.border.subtle}`,
                backgroundColor:
                  trace.id === selectedId ? theme.palette.action.selected : 'transparent',
                '&:hover': { backgroundColor: theme.palette.action.hover },
              })}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="monoSmall" component="div" noWrap sx={{ fontWeight: 600 }}>
                  {trace.operation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {serviceName(trace.serviceId)} · {formatIncidentTime(trace.atSeconds / 60)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexShrink: 0 }}>
                <Typography variant="monoSmall">{ms(trace.durationMs)}</Typography>
                <ToneChip
                  tone={trace.status === 'error' ? 'error' : 'success'}
                  label={trace.status === 'error' ? 'Error' : 'OK'}
                />
              </Box>
            </ButtonBase>
          </li>
        ))}
      </Box>
      {selected ? (
        <TraceWaterfall key={selected.id} trace={selected} serviceName={serviceName} />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Open a trace to see where the time went. Compare a slow request with a healthy one.
        </Typography>
      )}
    </Box>
  )
}
