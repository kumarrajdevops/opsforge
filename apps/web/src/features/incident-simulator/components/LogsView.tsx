import SearchIcon from '@mui/icons-material/Search'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { LogEntry, LogLevel } from '@opsforge/types'
import { useMemo, useState } from 'react'
import { filterLogs, formatIncidentTime } from '../engine'

const levelColor: Record<LogLevel, 'text.secondary' | 'info.main' | 'warning.main' | 'error.main'> =
  {
    debug: 'text.secondary',
    info: 'info.main',
    warn: 'warning.main',
    error: 'error.main',
  }

export interface LogsViewProps {
  services: { id: string; name: string }[]
  serviceId: string | null
  entries: LogEntry[]
  onSelectService: (id: string) => void
  /** Recorded as a log search (it can surface further evidence). */
  onSearch: (serviceId: string, query: string) => void
}

export function LogsView({
  services,
  serviceId,
  entries,
  onSelectService,
  onSearch,
}: LogsViewProps) {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [level, setLevel] = useState<'all' | 'warn' | 'error'>('all')

  const shown = useMemo(() => {
    const byLevel = entries.filter(
      (e) =>
        level === 'all' ||
        (level === 'warn' ? e.level === 'warn' || e.level === 'error' : e.level === 'error'),
    )
    return filterLogs(byLevel, submitted)
  }, [entries, level, submitted])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(query)
    if (serviceId) onSearch(serviceId, query)
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <Box
        component="form"
        onSubmit={submit}
        role="search"
        sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}
      >
        <TextField
          select
          size="small"
          label="Service"
          value={serviceId ?? ''}
          onChange={(event) => {
            setSubmitted('')
            setQuery('')
            onSelectService(event.target.value)
          }}
          sx={{ minWidth: 200 }}
        >
          {services.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Search logs"
          placeholder="e.g. timeout, pool, error"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={!serviceId}
          sx={{ flex: '1 1 200px' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          label="Level"
          value={level}
          onChange={(event) => setLevel(event.target.value as typeof level)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="warn">Warn+</MenuItem>
          <MenuItem value="error">Errors</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined" disabled={!serviceId}>
          Search
        </Button>
      </Box>

      {serviceId === null ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="subtitle2">Choose a service</Typography>
          <Typography variant="body2" color="text.secondary">
            Logs are per service. Searching for a term can surface lines the default view does not.
          </Typography>
        </Box>
      ) : (
        <Box
          role="log"
          aria-label="Log lines"
          tabIndex={0}
          sx={(theme) => ({
            maxHeight: 320,
            overflow: 'auto',
            border: `1px solid ${theme.palette.border.subtle}`,
            borderRadius: `${theme.opsforge.radius.md}px`,
            backgroundColor: theme.palette.background.sunken,
            p: 1,
          })}
        >
          {shown.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
              No lines match.
            </Typography>
          )}
          {shown.map((entry) => (
            <Box
              key={entry.id}
              sx={{ display: 'flex', gap: 1.5, py: 0.25, alignItems: 'baseline' }}
            >
              <Typography variant="monoSmall" color="text.secondary" sx={{ flexShrink: 0 }}>
                {formatIncidentTime(entry.atSeconds / 60)}
              </Typography>
              <Typography
                variant="monoSmall"
                sx={{ width: 44, flexShrink: 0, fontWeight: 700, color: levelColor[entry.level] }}
              >
                {entry.level.toUpperCase()}
              </Typography>
              <Typography variant="monoSmall" sx={{ wordBreak: 'break-word' }}>
                {entry.message}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
