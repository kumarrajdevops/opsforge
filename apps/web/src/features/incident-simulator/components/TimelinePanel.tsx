import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { formatIncidentTime, type TimelineEntry } from '../engine'

const kindLabel: Record<TimelineEntry['kind'], string> = {
  incident: 'Incident',
  evidence: 'Finding',
  action: 'Your action',
}

/** What is known so far, in incident time. Only revealed evidence appears. */
export function TimelinePanel({ entries }: { entries: TimelineEntry[] }) {
  return (
    <Box
      component="ol"
      aria-label="Incident timeline"
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0 }}
    >
      {entries.map((entry) => (
        <Box
          component="li"
          key={entry.id}
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: '72px 1fr',
            gap: 1.5,
            py: 0.75,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
            '&:last-child': { borderBottom: 0 },
          })}
        >
          <Typography variant="monoSmall" color="text.secondary">
            {formatIncidentTime(entry.minute)}
          </Typography>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" component="div">
              {kindLabel[entry.kind]}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {entry.title}
            </Typography>
            {entry.detail && (
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ wordBreak: 'break-word' }}
              >
                {entry.detail}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
