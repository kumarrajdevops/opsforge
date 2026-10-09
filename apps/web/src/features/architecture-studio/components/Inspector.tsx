import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import SwapHorizOutlined from '@mui/icons-material/SwapHorizOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type {
  ArchitectureEdge,
  ArchitectureNode,
  CheckResult,
  ComponentConfig,
  ComponentDefinition,
  ConfigKey,
  ConnectionKind,
} from '@opsforge/types'
import { InlineCode, ToneChip } from '@opsforge/ui'
import { CATEGORY_LABELS, CONFIG_LABELS } from '../catalog'
import { KIND_OPTIONS } from '../documentOps'
import { CONNECTION_KIND_LABELS } from '../graph'
import {
  formatUsd,
  providerShort,
  providerTone,
  severityLabel,
  severityTone,
} from '../presentation'

type Patch = Partial<ComponentConfig>

const CHOICES: Partial<Record<ConfigKey, { value: string; label: string }[]>> = {
  region: [
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
  ],
  failover: [
    { value: 'none', label: 'None' },
    { value: 'manual', label: 'Manual' },
    { value: 'automatic', label: 'Automatic' },
  ],
  strategy: [
    { value: 'manual', label: 'Manual' },
    { value: 'recreate', label: 'Recreate' },
    { value: 'rolling', label: 'Rolling' },
    { value: 'blue-green', label: 'Blue/green' },
    { value: 'canary', label: 'Canary' },
  ],
  tier: [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ],
  exposure: [
    { value: 'private', label: 'Private' },
    { value: 'public', label: 'Public' },
  ],
}

const NUMBERS: Partial<Record<ConfigKey, { min: number; max: number }>> = {
  replicas: { min: 1, max: 50 },
  readReplicas: { min: 0, max: 15 },
}

const BOOLEANS: ConfigKey[] = [
  'autoscaling',
  'encryptedAtRest',
  'backups',
  'crossRegionReplication',
  'deadLetter',
  'alerting',
  'tracing',
  'automatedTests',
  'leastPrivilege',
  'rotation',
]

function ConfigField({
  field,
  config,
  onChange,
}: {
  field: ConfigKey
  config: ComponentConfig
  onChange: (patch: Patch) => void
}) {
  const label = CONFIG_LABELS[field]

  if (field === 'zones') {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={config.zones}
          aria-label={label}
          onChange={(_, next: 1 | 2 | 3 | null) => next && onChange({ zones: next })}
        >
          {[1, 2, 3].map((z) => (
            <ToggleButton key={z} value={z} sx={{ px: 2 }}>
              {z}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
    )
  }

  const numbers = NUMBERS[field]
  if (numbers) {
    return (
      <TextField
        size="small"
        type="number"
        label={label}
        value={config[field] as number}
        slotProps={{ htmlInput: { min: numbers.min, max: numbers.max } }}
        onChange={(e) => {
          const parsed = Math.round(Number(e.target.value))
          if (Number.isFinite(parsed))
            onChange({ [field]: Math.min(numbers.max, Math.max(numbers.min, parsed)) })
        }}
      />
    )
  }

  const choices = CHOICES[field]
  if (choices) {
    return (
      <TextField
        select
        size="small"
        label={label}
        value={config[field] as string}
        onChange={(e) => onChange({ [field]: e.target.value })}
      >
        {choices.map((c) => (
          <MenuItem key={c.value} value={c.value}>
            {c.label}
          </MenuItem>
        ))}
      </TextField>
    )
  }

  if (BOOLEANS.includes(field)) {
    return (
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={config[field] as boolean}
            onChange={(e) => onChange({ [field]: e.target.checked })}
          />
        }
        label={<Typography variant="body2">{label}</Typography>}
      />
    )
  }
  return null
}

function FindingList({ checks }: { checks: CheckResult[] }) {
  if (checks.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No failing checks reference this item.
      </Typography>
    )
  }
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}>
      {checks.map((c) => (
        <Box
          component="li"
          key={c.checkId}
          sx={(theme) => ({
            p: 1.25,
            borderRadius: `${theme.opsforge.radius.md}px`,
            border: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <ToneChip tone={severityTone[c.severity]} label={severityLabel[c.severity]} />
            <Typography variant="monoSmall" color="text.secondary">
              {c.checkId}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {c.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {c.evidence}
          </Typography>
          {c.fix && (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              <strong>Fix:</strong> {c.fix}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  )
}

export interface NodeInspectorProps {
  node: ArchitectureNode
  definition: ComponentDefinition
  checks: CheckResult[]
  monthlyUsd: number
  onRename: (label: string) => void
  onChange: (patch: Patch) => void
  onDelete: () => void
}

export function NodeInspector({
  node,
  definition,
  checks,
  monthlyUsd,
  onRename,
  onChange,
  onDelete,
}: NodeInspectorProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2, p: 2 }}>
      <Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
          <ToneChip
            tone={providerTone[definition.provider]}
            label={providerShort[definition.provider]}
          />
          <ToneChip label={CATEGORY_LABELS[definition.category]} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {definition.summary}
        </Typography>
      </Box>

      <TextField
        size="small"
        label="Name"
        value={node.label}
        onChange={(e) => onRename(e.target.value)}
      />

      {definition.properties.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          This component has no configurable properties. Connect it to the rest of the design.
        </Typography>
      )}
      {definition.properties.map((field) => (
        <ConfigField key={field} field={field} config={node.config} onChange={onChange} />
      ))}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="caption" color="text.secondary">
          Indicative cost
        </Typography>
        <InlineCode>{formatUsd(monthlyUsd)} / mo</InlineCode>
      </Box>

      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Findings ({checks.length})
        </Typography>
        <FindingList checks={checks} />
      </Box>

      <Button color="error" variant="outlined" startIcon={<DeleteOutlined />} onClick={onDelete}>
        Remove component
      </Button>
    </Box>
  )
}

export interface EdgeInspectorProps {
  edge: ArchitectureEdge
  sourceLabel: string
  targetLabel: string
  checks: CheckResult[]
  onChange: (patch: Partial<Pick<ArchitectureEdge, 'kind' | 'encrypted' | 'label'>>) => void
  onReverse: () => void
  onDelete: () => void
}

export function EdgeInspector({
  edge,
  sourceLabel,
  targetLabel,
  checks,
  onChange,
  onReverse,
  onDelete,
}: EdgeInspectorProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2, p: 2 }}>
      <Typography variant="body2">
        <strong>{sourceLabel}</strong> → <strong>{targetLabel}</strong>
      </Typography>
      <TextField
        select
        size="small"
        label="Connection type"
        value={edge.kind}
        onChange={(e) => onChange({ kind: e.target.value as ConnectionKind })}
        helperText="Traffic and data are synchronous dependencies. Async, telemetry and deploy do not take users down."
      >
        {KIND_OPTIONS.map((kind) => (
          <MenuItem key={kind} value={kind}>
            {CONNECTION_KIND_LABELS[kind]}
          </MenuItem>
        ))}
      </TextField>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={edge.encrypted}
            onChange={(e) => onChange({ encrypted: e.target.checked })}
          />
        }
        label={<Typography variant="body2">Encrypted in transit (TLS)</Typography>}
      />
      <TextField
        size="small"
        label="Label"
        value={edge.label ?? ''}
        onChange={(e) => onChange({ label: e.target.value || undefined })}
      />
      <Box>
        <Typography variant="overline" color="text.secondary" component="h3">
          Findings ({checks.length})
        </Typography>
        <FindingList checks={checks} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" startIcon={<SwapHorizOutlined />} onClick={onReverse}>
          Reverse
        </Button>
        <Button color="error" variant="outlined" startIcon={<DeleteOutlined />} onClick={onDelete}>
          Remove
        </Button>
      </Box>
    </Box>
  )
}
