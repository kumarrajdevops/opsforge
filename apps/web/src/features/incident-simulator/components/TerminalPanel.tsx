import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import type { CommandSpec } from '@opsforge/types'
import { useEffect, useMemo, useRef, useState } from 'react'
import { commandCategoryLabel } from '../presentation'
import { commandsByCategory, type TranscriptEntry } from '../terminal'
import type { BuiltinLine } from '../useIncidentSession'

export interface TerminalPanelProps {
  commands: CommandSpec[]
  transcript: TranscriptEntry[]
  builtins: BuiltinLine[]
  clearedBefore: number
  disabled: boolean
  host: string
  onRun: (input: string) => void
}

interface Line {
  key: string
  position: number
  input: string
  output: string
  kind: TranscriptEntry['kind']
  actionResult?: string
}

/** Simulated shell. Output comes from the scenario; nothing here is executed. */
export function TerminalPanel({
  commands,
  transcript,
  builtins,
  clearedBefore,
  disabled,
  host,
  onRun,
}: TerminalPanelProps) {
  const [value, setValue] = useState('')
  const [cursor, setCursor] = useState<number | null>(null)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  const lines: Line[] = useMemo(() => {
    const merged: Line[] = [
      ...transcript.map((t) => ({ ...t })),
      ...builtins.map((b) => ({ ...b, kind: 'builtin' as const })),
    ]
    return merged.filter((l) => l.position > clearedBefore).sort((a, b) => a.position - b.position)
  }, [transcript, builtins, clearedBefore])

  const history = useMemo(() => transcript.map((t) => t.input), [transcript])
  const starters = commands.filter((c) => c.starter && !c.mutating)
  const groups = useMemo(() => commandsByCategory(commands), [commands])

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines.length])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (disabled || value.trim() === '') return
    onRun(value)
    setValue('')
    setCursor(null)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp' && history.length > 0) {
      event.preventDefault()
      const next = cursor === null ? history.length - 1 : Math.max(cursor - 1, 0)
      setCursor(next)
      setValue(history[next] ?? '')
    } else if (event.key === 'ArrowDown' && cursor !== null) {
      event.preventDefault()
      const next = cursor + 1
      if (next >= history.length) {
        setCursor(null)
        setValue('')
      } else {
        setCursor(next)
        setValue(history[next] ?? '')
      }
    }
  }

  function run(command: string) {
    if (disabled) return
    onRun(command)
    input.current?.focus()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <Box
        sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75, px: 1.5, py: 1 }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Try:
        </Typography>
        {starters.map((c) => (
          <ButtonBase
            key={c.id}
            disabled={disabled}
            onClick={() => run(c.command)}
            aria-label={`Run ${c.command}`}
            sx={(theme) => ({
              px: 1,
              py: 0.25,
              borderRadius: `${theme.opsforge.radius.pill ?? 999}px`,
              border: `1px solid ${theme.palette.border.default}`,
              fontFamily: theme.typography.monoSmall.fontFamily,
              fontSize: 12,
              '&:hover': { backgroundColor: theme.palette.action.hover },
            })}
          >
            {c.command}
          </ButtonBase>
        ))}
        <ButtonBase
          onClick={() => setCatalogOpen((o) => !o)}
          aria-expanded={catalogOpen}
          sx={(theme) => ({
            ml: 'auto',
            typography: 'caption',
            color: theme.palette.primary.main,
            px: 0.5,
            textDecoration: 'underline',
          })}
        >
          {catalogOpen ? 'Hide command catalog' : 'Command catalog'}
        </ButtonBase>
      </Box>

      {catalogOpen && (
        <Box
          sx={(theme) => ({
            maxHeight: 180,
            overflow: 'auto',
            px: 1.5,
            pb: 1,
            borderBottom: `1px solid ${theme.palette.border.subtle}`,
          })}
        >
          {[...groups.entries()].map(([category, list]) => (
            <Box key={category} sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.secondary" component="h3">
                {commandCategoryLabel[category as keyof typeof commandCategoryLabel] ?? category}
              </Typography>
              <Box
                component="ul"
                sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 0.25 }}
              >
                {list.map((c) => (
                  <li key={c.id}>
                    <ButtonBase
                      disabled={disabled}
                      onClick={() => run(c.command)}
                      sx={{
                        display: 'block',
                        textAlign: 'left',
                        width: '100%',
                        py: 0.25,
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Typography variant="monoSmall" component="div">
                        {c.command}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.description}
                        {c.mutating ? ' · changes the system' : ''}
                      </Typography>
                    </ButtonBase>
                  </li>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box
        ref={scroller}
        role="log"
        aria-label="Terminal output"
        aria-live="off"
        tabIndex={0}
        onClick={() => input.current?.focus()}
        sx={(theme) => ({
          flex: 1,
          minHeight: 120,
          overflow: 'auto',
          px: 1.5,
          py: 1,
          backgroundColor: theme.palette.background.sunken,
          borderTop: `1px solid ${theme.palette.border.subtle}`,
        })}
      >
        {lines.length === 0 && (
          <Typography variant="monoSmall" color="text.secondary" component="div">
            Simulated shell on {host}. Type a command, or type help.
          </Typography>
        )}
        {lines.map((line) => (
          <Box key={line.key} sx={{ mb: 1.25 }}>
            <Typography variant="monoSmall" component="div" sx={{ fontWeight: 700 }}>
              <Box component="span" sx={{ color: 'primary.main' }}>
                {host} $
              </Box>{' '}
              {line.input}
            </Typography>
            <Typography
              variant="monoSmall"
              component="pre"
              sx={{
                m: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color:
                  line.kind === 'unknown' || line.kind === 'locked'
                    ? 'warning.main'
                    : 'text.primary',
              }}
            >
              {line.output}
            </Typography>
            {line.actionResult && (
              <Typography
                variant="monoSmall"
                component="pre"
                sx={{ m: 0, mt: 0.5, whiteSpace: 'pre-wrap', color: 'text.secondary' }}
              >
                {line.actionResult}
              </Typography>
            )}
          </Box>
        ))}
      </Box>

      <Box
        component="form"
        onSubmit={submit}
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.75,
          borderTop: `1px solid ${theme.palette.border.default}`,
          backgroundColor: theme.palette.background.paper,
        })}
      >
        <Typography variant="monoSmall" aria-hidden sx={{ color: 'primary.main', fontWeight: 700 }}>
          {host} $
        </Typography>
        <Box
          component="input"
          ref={input}
          value={value}
          disabled={disabled}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setValue(event.target.value)
            setCursor(null)
          }}
          onKeyDown={onKeyDown}
          aria-label="Terminal command"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          placeholder={disabled ? 'Terminal is read-only' : 'kubectl get pods -n payments'}
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            border: 0,
            outline: 0,
            background: 'transparent',
            color: theme.palette.text.primary,
            fontFamily: theme.typography.monoSmall.fontFamily,
            fontSize: 13,
            '&::placeholder': { color: theme.palette.text.disabled },
          })}
        />
      </Box>
    </Box>
  )
}
