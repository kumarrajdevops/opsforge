import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { toneColors, type Tone } from '@opsforge/ui'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { memo } from 'react'
import { NODE_WIDTH, type ComponentFlowNode } from '../canvasModel'
import {
  categoryIcon,
  impactLabel,
  impactTone,
  providerShort,
  providerTone,
  severityLabel,
} from '../presentation'

function FindingDot({ tone, count, label }: { tone: Tone; count: number; label: string }) {
  if (count === 0) return null
  return (
    <Box
      component="span"
      title={`${count} ${label}`}
      aria-label={`${count} ${label}`}
      sx={(theme) => ({
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: '9px',
        fontFamily: theme.typography.mono.fontFamily,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: '18px',
        textAlign: 'center',
        backgroundColor: toneColors(theme, tone).solid,
        color: toneColors(theme, tone).contrastText,
      })}
    >
      {count}
    </Box>
  )
}

function ComponentNodeView({ data, selected }: NodeProps<ComponentFlowNode>) {
  const { findings, impact } = data
  const impactColor = impact && impact !== 'ok' ? impactTone[impact] : null

  return (
    <Box
      sx={(theme) => {
        const accent = impactColor ? toneColors(theme, impactColor).solid : null
        return {
          width: NODE_WIDTH,
          boxSizing: 'border-box',
          borderRadius: `${theme.opsforge.radius.md}px`,
          backgroundColor: impactColor
            ? toneColors(theme, impactColor).bg
            : theme.palette.background.paper,
          border: `1px solid ${accent ?? (selected ? theme.palette.primary.main : theme.palette.border.default)}`,
          boxShadow: selected
            ? `0 0 0 3px ${toneColors(theme, 'primary').border}`
            : theme.shadows[1],
          px: 1.25,
          py: 1,
          opacity: impact === 'down' ? 0.85 : 1,
          transition: `border-color ${theme.opsforge.motion.duration.fast}ms, box-shadow ${theme.opsforge.motion.duration.fast}ms`,
          '& .react-flow__handle': {
            width: 9,
            height: 9,
            backgroundColor: theme.palette.background.paper,
            border: `2px solid ${theme.palette.border.strong}`,
          },
          '&:hover .react-flow__handle': { borderColor: theme.palette.primary.main },
        }
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 28,
            height: 28,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 18,
            borderRadius: `${theme.opsforge.radius.sm}px`,
            backgroundColor: toneColors(theme, providerTone[data.provider]).bg,
            color: toneColors(theme, providerTone[data.provider]).fg,
          })}
        >
          {categoryIcon[data.category]}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ lineHeight: 1.25 }}>
            {data.label}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            component="div"
            sx={{ lineHeight: 1.2 }}
          >
            {providerShort[data.provider]} · {data.componentName}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, minHeight: 18 }}>
        <Typography variant="monoSmall" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
          {data.facts.join(' · ')}
        </Typography>
        {impact && impact !== 'ok' && (
          <Typography
            variant="monoSmall"
            sx={(theme) => ({ fontWeight: 700, color: toneColors(theme, impactTone[impact]).fg })}
          >
            {impactLabel[impact].toUpperCase()}
          </Typography>
        )}
        <FindingDot
          tone="error"
          count={findings.critical}
          label={`${severityLabel.critical.toLowerCase()} findings`}
        />
        <FindingDot
          tone="warning"
          count={findings.major}
          label={`${severityLabel.major.toLowerCase()} findings`}
        />
        <FindingDot
          tone="info"
          count={findings.minor}
          label={`${severityLabel.minor.toLowerCase()} findings`}
        />
      </Box>
    </Box>
  )
}

export const ComponentNode = memo(ComponentNodeView)
