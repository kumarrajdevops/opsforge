import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type {
  CommunicationAudience,
  CommunicationKind,
  HypothesisCategory,
  IncidentMessage,
  PreventionOption,
  RcaDraft,
} from '@opsforge/types'
import { ToneChip } from '@opsforge/ui'
import { useState } from 'react'
import { formatElapsed } from '../engine'
import { categoryLabel } from '../presentation'

const categories = Object.keys(categoryLabel) as HypothesisCategory[]

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <Box
      component="section"
      aria-label={title}
      sx={(theme) => ({
        display: 'grid',
        gap: 1.25,
        pb: 2.5,
        borderBottom: `1px solid ${theme.palette.border.subtle}`,
        '&:last-of-type': { borderBottom: 0 },
      })}
    >
      <Box>
        <Typography variant="subtitle2" component="h3">
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

/* ------------------------------------------------------------------ RCA ---- */

export interface RcaFormProps {
  saved: RcaDraft | null
  services: { id: string; name: string }[]
  evidence: { id: string; title: string }[]
  disabled: boolean
  onSave: (rca: RcaDraft) => void
}

const emptyRca: RcaDraft = {
  category: '',
  serviceId: '',
  statement: '',
  trigger: '',
  contributing: '',
  evidenceIds: [],
}

function RcaForm({ saved, services, evidence, disabled, onSave }: RcaFormProps) {
  const [draft, setDraft] = useState<RcaDraft>(saved ?? emptyRca)
  const patch = (p: Partial<RcaDraft>) => setDraft((d) => ({ ...d, ...p }))
  const ready =
    draft.category !== '' && draft.serviceId !== '' && draft.statement.trim().length >= 20
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)

  function toggle(id: string) {
    patch({
      evidenceIds: draft.evidenceIds.includes(id)
        ? draft.evidenceIds.filter((e) => e !== id)
        : [...draft.evidenceIds, id],
    })
  }

  return (
    <Section
      title="Root cause analysis"
      hint="Cite the evidence your conclusion rests on. Only findings you have uncovered are listed."
    >
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <TextField
          select
          size="small"
          label="Cause category"
          value={draft.category}
          onChange={(e) => patch({ category: e.target.value as HypothesisCategory })}
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
          label="Where it originated"
          value={draft.serviceId}
          onChange={(e) => patch({ serviceId: e.target.value })}
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
        label="Root cause"
        multiline
        minRows={3}
        value={draft.statement}
        onChange={(e) => patch({ statement: e.target.value })}
        disabled={disabled}
        helperText="What failed, the mechanism that turned it into customer impact."
      />
      <TextField
        size="small"
        label="Trigger"
        multiline
        minRows={2}
        value={draft.trigger}
        onChange={(e) => patch({ trigger: e.target.value })}
        disabled={disabled}
        helperText="What changed or happened to set it off."
      />
      <TextField
        size="small"
        label="Contributing factors"
        multiline
        minRows={2}
        value={draft.contributing}
        onChange={(e) => patch({ contributing: e.target.value })}
        disabled={disabled}
        helperText="Why it was not caught or why it spread."
      />
      <Box>
        <Typography variant="caption" color="text.secondary">
          Supporting evidence
        </Typography>
        {evidence.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No findings to cite yet.
          </Typography>
        ) : (
          <Box sx={{ display: 'grid' }}>
            {evidence.map((e) => (
              <FormControlLabel
                key={e.id}
                control={
                  <Checkbox
                    size="small"
                    checked={draft.evidenceIds.includes(e.id)}
                    onChange={() => toggle(e.id)}
                    disabled={disabled}
                  />
                }
                label={<Typography variant="body2">{e.title}</Typography>}
              />
            ))}
          </Box>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          disabled={!ready || !dirty || disabled}
          onClick={() => onSave(draft)}
        >
          {saved ? 'Update RCA' : 'Save RCA'}
        </Button>
        {saved && !dirty && (
          <Typography variant="caption" color="text.secondary" role="status">
            Saved
          </Typography>
        )}
      </Box>
    </Section>
  )
}

/* ----------------------------------------------------------- prevention ---- */

export interface PreventionFormProps {
  options: PreventionOption[]
  saved: { optionIds: string[]; notes: string } | null
  disabled: boolean
  onSave: (optionIds: string[], notes: string) => void
}

const kindLabel: Record<PreventionOption['kind'], string> = {
  detect: 'Detect',
  prevent: 'Prevent',
  respond: 'Respond',
  process: 'Process',
}

function PreventionForm({ options, saved, disabled, onSave }: PreventionFormProps) {
  const [ids, setIds] = useState<string[]>(saved?.optionIds ?? [])
  const [notes, setNotes] = useState(saved?.notes ?? '')
  const dirty =
    JSON.stringify([ids, notes]) !== JSON.stringify([saved?.optionIds ?? [], saved?.notes ?? ''])

  return (
    <Section
      title="Prevention"
      hint="Choose what you would commit to. Fewer, well-targeted actions beat a long list."
    >
      <Box sx={{ display: 'grid', gap: 0.5 }}>
        {options.map((option) => (
          <FormControlLabel
            key={option.id}
            sx={{ alignItems: 'flex-start', m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={ids.includes(option.id)}
                disabled={disabled}
                onChange={() =>
                  setIds((c) =>
                    c.includes(option.id) ? c.filter((x) => x !== option.id) : [...c, option.id],
                  )
                }
              />
            }
            label={
              <Box sx={{ pt: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {option.label}
                  </Typography>
                  <ToneChip tone="neutral" label={kindLabel[option.kind]} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {option.detail}
                </Typography>
              </Box>
            }
          />
        ))}
      </Box>
      <TextField
        size="small"
        label="Notes: owners, ordering, trade-offs"
        multiline
        minRows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={disabled}
      />
      <Box>
        <Button
          variant="contained"
          size="small"
          disabled={ids.length === 0 || !dirty || disabled}
          onClick={() => onSave(ids, notes)}
        >
          {saved ? 'Update plan' : 'Save plan'}
        </Button>
      </Box>
    </Section>
  )
}

/* -------------------------------------------------------- communications ---- */

export interface MessagesFormProps {
  sent: { at: number; message: IncidentMessage }[]
  disabled: boolean
  onSend: (message: Omit<IncidentMessage, 'id'>) => void
}

const audiences: CommunicationAudience[] = ['engineering', 'leadership', 'customers']
const kinds: { id: CommunicationKind; label: string }[] = [
  { id: 'acknowledge', label: 'Acknowledge' },
  { id: 'status', label: 'Status update' },
  { id: 'mitigated', label: 'Mitigated' },
  { id: 'resolved', label: 'Resolved' },
]

function MessagesForm({ sent, disabled, onSend }: MessagesFormProps) {
  const [audience, setAudience] = useState<CommunicationAudience>('engineering')
  const [kind, setKind] = useState<CommunicationKind>('acknowledge')
  const [impact, setImpact] = useState('')
  const [status, setStatus] = useState('')
  const [next, setNext] = useState('')
  const ready = impact.trim().length >= 5 && status.trim().length >= 5

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!ready) return
    const minutes = next.trim() === '' ? null : Number(next)
    onSend({
      audience,
      kind,
      impact: impact.trim(),
      status: status.trim(),
      nextUpdateMinutes:
        minutes !== null && Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    })
    setImpact('')
    setStatus('')
    setNext('')
  }

  return (
    <Section
      title="Communications"
      hint="Each audience needs a different message. Say what is affected, what you know, and when they will hear next."
    >
      <Box
        component="form"
        onSubmit={submit}
        sx={{ display: 'grid', gap: 1 }}
        aria-label="Compose update"
      >
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            select
            size="small"
            label="Audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as CommunicationAudience)}
            disabled={disabled}
          >
            {audiences.map((a) => (
              <MenuItem key={a} value={a} sx={{ textTransform: 'capitalize' }}>
                {a}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            value={kind}
            onChange={(e) => setKind(e.target.value as CommunicationKind)}
            disabled={disabled}
          >
            {kinds.map((k) => (
              <MenuItem key={k.id} value={k.id}>
                {k.label}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <TextField
          size="small"
          label="Impact"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          disabled={disabled}
        />
        <TextField
          size="small"
          label="Current status and actions"
          multiline
          minRows={2}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={disabled}
        />
        <TextField
          size="small"
          type="number"
          label="Next update in (minutes)"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          disabled={disabled}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <Box>
          <Button type="submit" variant="contained" size="small" disabled={!ready || disabled}>
            Send update
          </Button>
        </Box>
      </Box>
      {sent.length > 0 && (
        <Box
          component="ul"
          aria-label="Sent updates"
          sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.75 }}
        >
          {sent.map(({ at, message }) => (
            <Box
              component="li"
              key={message.id}
              sx={(theme) => ({
                p: 1,
                borderRadius: `${theme.opsforge.radius.sm}px`,
                border: `1px solid ${theme.palette.border.subtle}`,
              })}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
                sx={{ textTransform: 'capitalize' }}
              >
                {formatElapsed(at)} · {message.audience} · {message.kind}
              </Typography>
              <Typography variant="body2">
                {message.impact} {message.status}
                {message.nextUpdateMinutes
                  ? ` Next update in ${message.nextUpdateMinutes} min.`
                  : ''}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Section>
  )
}

export interface ReportPanelProps {
  rca: RcaFormProps
  prevention: PreventionFormProps
  messages: MessagesFormProps
}

export function ReportPanel({ rca, prevention, messages }: ReportPanelProps) {
  return (
    <Box sx={{ p: 2, display: 'grid', gap: 2.5 }}>
      <MessagesForm {...messages} />
      <RcaForm {...rca} />
      <PreventionForm {...prevention} />
    </Box>
  )
}
