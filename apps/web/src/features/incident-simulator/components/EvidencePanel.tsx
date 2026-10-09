import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { EvidenceNode } from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { formatElapsed } from '../engine'
import { channelLabel } from '../presentation'

export interface EvidenceItem {
  node: EvidenceNode
  /** Session seconds at which it was found. */
  foundAt: number
  serviceName: string | null
}

export interface EvidencePanelProps {
  items: EvidenceItem[]
  isNew: (id: string) => boolean
}

/** Findings gathered so far. Roles and hints stay hidden until the debrief. */
export function EvidencePanel({ items, isNew }: EvidencePanelProps) {
  if (items.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="subtitle2">No findings yet</Typography>
        <Typography variant="body2" color="text.secondary">
          Open a metric, search logs, inspect a trace or run a command. Anything meaningful is
          recorded here.
        </Typography>
      </Box>
    )
  }
  return (
    <Box
      component="ol"
      aria-label="Evidence"
      sx={{ m: 0, p: 1.5, listStyle: 'none', display: 'grid', gap: 1 }}
    >
      {[...items].reverse().map(({ node, foundAt, serviceName }) => (
        <Box
          component="li"
          key={node.id}
          data-evidence-id={node.id}
          sx={(theme) => ({
            p: 1.25,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${isNew(node.id) ? theme.palette.primary.main : theme.palette.border.subtle}`,
            backgroundColor: theme.palette.background.paper,
          })}
        >
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
            <ToneChip tone="neutral" label={channelLabel[node.channel]} />
            {serviceName && <ToneChip tone="neutral" mono label={serviceName} />}
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              found at {formatElapsed(foundAt)}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {node.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {node.detail}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}
