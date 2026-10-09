import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import type { ArchitectureVersion, VersionDiff } from '@opsforge/types'
import { ScoreBadge, SideDrawer, ToneChip } from '@opsforge/ui'
import { useMemo, useState } from 'react'
import { DIMENSIONS } from '../evaluator'
import { formatDelta, scoreTone } from '../presentation'
import { diffVersions, isEmptyDiff } from '../versioning'

export interface VersionHistoryDrawerProps {
  open: boolean
  onClose: () => void
  /** Newest first. */
  versions: ArchitectureVersion[]
  /** Content hash of the document on the canvas, to flag the matching version. */
  currentHash: string
  onRestore: (version: ArchitectureVersion) => void
}

const dimensionLabel: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.id, d.label]),
)

function describeDiff(diff: VersionDiff): string[] {
  const parts: string[] = []
  if (diff.nodesAdded.length)
    parts.push(
      `${diff.nodesAdded.length} component${diff.nodesAdded.length === 1 ? '' : 's'} added`,
    )
  if (diff.nodesRemoved.length) parts.push(`${diff.nodesRemoved.length} removed`)
  if (diff.nodesChanged.length) parts.push(`${diff.nodesChanged.length} reconfigured`)
  if (diff.edgesAdded)
    parts.push(`${diff.edgesAdded} connection${diff.edgesAdded === 1 ? '' : 's'} added`)
  if (diff.edgesRemoved)
    parts.push(`${diff.edgesRemoved} connection${diff.edgesRemoved === 1 ? '' : 's'} removed`)
  if (diff.edgesChanged)
    parts.push(`${diff.edgesChanged} connection${diff.edgesChanged === 1 ? '' : 's'} changed`)
  if (diff.nodesMoved) parts.push(`${diff.nodesMoved} moved`)
  return parts
}

function VersionDiffView({ diff }: { diff: VersionDiff }) {
  const parts = describeDiff(diff)
  const deltas = Object.entries(diff.dimensionDeltas).filter(([, v]) => v !== 0)
  return (
    <Box sx={{ display: 'grid', gap: 0.75, mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {isEmptyDiff(diff) ? 'No changes.' : parts.join(', ') + '.'}
      </Typography>
      {diff.nodesChanged.map((c) => (
        <Typography key={c.nodeId} variant="caption" color="text.secondary">
          {c.label}: {c.fields.join(', ')}
        </Typography>
      ))}
      {diff.overallDelta !== null && (
        <Typography variant="body2">
          Overall <strong>{formatDelta(diff.overallDelta)}</strong>
        </Typography>
      )}
      {deltas.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {deltas.map(([id, value]) => (
            <ToneChip
              key={id}
              mono
              tone={(value ?? 0) > 0 ? 'success' : 'error'}
              label={`${dimensionLabel[id] ?? id} ${formatDelta(value ?? 0)}`}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}

export function VersionHistoryDrawer({
  open,
  onClose,
  versions,
  currentHash,
  onRestore,
}: VersionHistoryDrawerProps) {
  const [comparing, setComparing] = useState<string | null>(null)

  const diffs = useMemo(() => {
    const map = new Map<string, VersionDiff>()
    versions.forEach((v, i) => {
      const previous = versions[i + 1]
      if (previous) map.set(v.id, diffVersions(previous, v))
    })
    return map
  }, [versions])

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      title="Version history"
      subtitle="Each version stores the design and the deterministic result at that moment."
      width={460}
    >
      {versions.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No versions saved yet. Save a version to record a checkpoint you can compare and restore.
        </Typography>
      ) : (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.5 }}>
          {versions.map((v) => {
            const diff = diffs.get(v.id)
            const isCurrent = v.contentHash === currentHash
            return (
              <Box
                component="li"
                key={v.id}
                sx={(theme) => ({
                  p: 1.5,
                  borderRadius: `${theme.opsforge.radius.md}px`,
                  border: `1px solid ${isCurrent ? theme.palette.primary.main : theme.palette.border.subtle}`,
                })}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">v{v.number}</Typography>
                  {isCurrent && <ToneChip tone="primary" label="On canvas" />}
                  <Box sx={{ flex: 1 }} />
                  {v.summary.overall !== null ? (
                    <ScoreBadge
                      score={v.summary.overall}
                      tone={scoreTone(v.summary.overall)}
                      label={`Version ${v.number} score`}
                    />
                  ) : (
                    <ToneChip label="No score" />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" component="div">
                  {new Date(v.createdAt).toLocaleString()}
                  {v.summary.criticalFailures > 0
                    ? ` · ${v.summary.criticalFailures} critical`
                    : ''}
                </Typography>
                {v.note && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {v.note}
                  </Typography>
                )}

                {comparing === v.id && diff && <VersionDiffView diff={diff} />}
                {comparing === v.id && !diff && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    This is the first version.
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setComparing((c) => (c === v.id ? null : v.id))}
                  >
                    {comparing === v.id ? 'Hide changes' : 'Changes vs previous'}
                  </Button>
                  <Button
                    size="small"
                    disabled={isCurrent}
                    onClick={() => {
                      onRestore(v)
                      onClose()
                    }}
                  >
                    Restore
                  </Button>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </SideDrawer>
  )
}
