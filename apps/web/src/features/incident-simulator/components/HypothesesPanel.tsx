import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import type { EvidenceRelation, HypothesisCategory, HypothesisStatus } from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import type { HypothesisState } from '../engine'
import { categoryLabel } from '../presentation'

const categories = Object.keys(categoryLabel) as HypothesisCategory[]

const statusLabel: Record<HypothesisStatus, string> = {
  testing: 'Testing',
  confirmed: 'Confirmed',
  'ruled-out': 'Ruled out',
}

export interface HypothesesPanelProps {
  hypotheses: HypothesisState[]
  services: { id: string; name: string }[]
  evidence: { id: string; title: string }[]
  disabled: boolean
  onAdd: (input: { category: HypothesisCategory; serviceId: string; statement: string }) => void
  onLink: (hypothesisId: string, evidenceId: string, relation: EvidenceRelation) => void
  onUnlink: (hypothesisId: string, evidenceId: string) => void
  onStatus: (hypothesisId: string, status: HypothesisStatus) => void
  onRemove: (hypothesisId: string) => void
}

function AddForm({
  services,
  disabled,
  onAdd,
}: Pick<HypothesesPanelProps, 'services' | 'disabled' | 'onAdd'>) {
  const [category, setCategory] = useState<HypothesisCategory | ''>('')
  const [serviceId, setServiceId] = useState('')
  const [statement, setStatement] = useState('')
  const ready = category !== '' && serviceId !== '' && statement.trim().length >= 8

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    onAdd({ category, serviceId, statement: statement.trim() })
    setStatement('')
  }

  return (
    <Box
      component="form"
      onSubmit={submit}
      sx={{ display: 'grid', gap: 1.25 }}
      aria-label="Add hypothesis"
    >
      <Typography variant="subtitle2">New hypothesis</Typography>
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField
          select
          size="small"
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as HypothesisCategory)}
          disabled={disabled}
        >
          {categories.map((c) => (
            <MenuItem key={c} value={c}>
              {categoryLabel[c]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Where"
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          disabled={disabled}
        >
          {services.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {s.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <TextField
        size="small"
        label="What do you think is happening, and why?"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        multiline
        minRows={2}
        disabled={disabled}
        helperText="State it so evidence could prove it wrong."
      />
      <Box>
        <Button type="submit" variant="contained" size="small" disabled={!ready || disabled}>
          Record hypothesis
        </Button>
      </Box>
    </Box>
  )
}

function HypothesisCard({
  hypothesis,
  services,
  evidence,
  disabled,
  onLink,
  onUnlink,
  onStatus,
  onRemove,
}: { hypothesis: HypothesisState } & Omit<HypothesesPanelProps, 'hypotheses' | 'onAdd'>) {
  const [evidenceId, setEvidenceId] = useState('')
  const linked = new Set(hypothesis.links.map((l) => l.evidenceId))
  const options = evidence.filter((e) => !linked.has(e.id))
  const title = (id: string) => evidence.find((e) => e.id === id)?.title ?? id
  const service = services.find((s) => s.id === hypothesis.serviceId)?.name ?? hypothesis.serviceId

  return (
    <Box
      component="li"
      sx={(theme) => ({
        p: 1.5,
        borderRadius: `${theme.opsforge.radius.md}px`,
        border: `1px solid ${theme.palette.border.subtle}`,
        display: 'grid',
        gap: 1,
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
        <ToneChip tone="neutral" label={categoryLabel[hypothesis.category]} />
        <ToneChip tone="neutral" mono label={service} />
        <IconButton
          size="small"
          aria-label="Remove hypothesis"
          onClick={() => onRemove(hypothesis.id)}
          disabled={disabled}
          sx={{ ml: 'auto' }}
        >
          <DeleteOutlined fontSize="small" />
        </IconButton>
      </Box>
      <Typography variant="body2">{hypothesis.statement}</Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={hypothesis.status}
        disabled={disabled}
        aria-label="Hypothesis status"
        onChange={(_, value: HypothesisStatus | null) => value && onStatus(hypothesis.id, value)}
      >
        {(Object.keys(statusLabel) as HypothesisStatus[]).map((s) => (
          <ToggleButton key={s} value={s} sx={{ textTransform: 'none', px: 1.25 }}>
            {statusLabel[s]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {hypothesis.links.length > 0 && (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.5 }}>
          {hypothesis.links.map((link) => (
            <Box
              component="li"
              key={link.evidenceId}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
            >
              <ToneChip
                tone={link.relation === 'supports' ? 'success' : 'error'}
                label={link.relation === 'supports' ? 'Supports' : 'Refutes'}
              />
              <Typography variant="caption" sx={{ flex: 1, minWidth: 0 }}>
                {title(link.evidenceId)}
              </Typography>
              <Button
                size="small"
                color="inherit"
                onClick={() => onUnlink(hypothesis.id, link.evidenceId)}
                disabled={disabled}
              >
                Unlink
              </Button>
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          select
          size="small"
          label="Link evidence"
          value={evidenceId}
          onChange={(e) => setEvidenceId(e.target.value)}
          disabled={disabled || options.length === 0}
          sx={{ flex: '1 1 160px', minWidth: 0 }}
          helperText={options.length === 0 ? 'Nothing left to link' : undefined}
        >
          {options.map((e) => (
            <MenuItem key={e.id} value={e.id}>
              {e.title}
            </MenuItem>
          ))}
        </TextField>
        {(['supports', 'refutes'] as const).map((relation) => (
          <Button
            key={relation}
            size="small"
            variant="outlined"
            disabled={disabled || evidenceId === ''}
            onClick={() => {
              onLink(hypothesis.id, evidenceId, relation)
              setEvidenceId('')
            }}
          >
            {relation === 'supports' ? 'Supports' : 'Refutes'}
          </Button>
        ))}
      </Box>
    </Box>
  )
}

export function HypothesesPanel(props: HypothesesPanelProps) {
  const { hypotheses, ...rest } = props
  return (
    <Box sx={{ p: 2, display: 'grid', gap: 2 }}>
      <AddForm services={props.services} disabled={props.disabled} onAdd={props.onAdd} />
      {hypotheses.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No hypotheses yet. Record what you suspect, then link the evidence that supports or
          refutes it.
        </Typography>
      ) : (
        <Box
          component="ul"
          aria-label="Hypotheses"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1.25 }}
        >
          {hypotheses.map((h) => (
            <HypothesisCard key={h.id} hypothesis={h} {...rest} />
          ))}
        </Box>
      )}
    </Box>
  )
}
