import type { CommandSpec, IncidentScenario, SessionEvent } from '@opsforge/types'
import { isUnlocked, replay, resolveCommand, type SessionState } from './engine'

export type TranscriptKind = 'ok' | 'locked' | 'unknown' | 'builtin'

export interface TranscriptEntry {
  key: string
  /** Sort position: the event index for recorded commands, between events for built-ins. */
  position: number
  input: string
  output: string
  kind: TranscriptKind
  commandId: string | null
  /** Mutating commands: what the action did. */
  actionResult?: string
}

/** Local, unrecorded terminal helpers. They never reveal evidence and never count as investigation. */
export type BuiltinResult = { kind: 'clear' } | { kind: 'output'; output: string }

export function runBuiltin(
  input: string,
  scenario: IncidentScenario,
  state: SessionState,
  history: string[],
): BuiltinResult | null {
  const word = input.trim().toLowerCase()
  if (word === 'clear' || word === 'cls') return { kind: 'clear' }
  if (word === 'history') {
    return {
      kind: 'output',
      output:
        history.length === 0
          ? 'No commands yet.'
          : history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n'),
    }
  }
  if (word === 'help' || word === '?') {
    const visible = scenario.commands.filter((c) => isUnlocked(state, c.unlockedBy))
    const lines = visible.map((c) => `  ${c.command}`)
    return {
      kind: 'output',
      output: [
        'This is a simulated shell. Only the commands below produce output.',
        'Built-ins: help, history, clear',
        '',
        ...lines,
      ].join('\n'),
    }
  }
  return null
}

export function commandsByCategory(commands: CommandSpec[]): Map<string, CommandSpec[]> {
  const groups = new Map<string, CommandSpec[]>()
  for (const command of commands) {
    const list = groups.get(command.category) ?? []
    list.push(command)
    groups.set(command.category, list)
  }
  return groups
}

/** Rebuilds the terminal transcript from the recorded events, so it survives a reload. */
export function buildTranscript(
  scenario: IncidentScenario,
  events: SessionEvent[],
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = []
  replay(scenario, events, ({ event, index, state }) => {
    if (event.type !== 'command') return
    // `state` already includes this event; a command never changes what makes it runnable.
    const result = resolveCommand(scenario, state, event.input)
    const entry: TranscriptEntry = {
      key: `cmd-${index}`,
      position: index,
      input: event.input,
      output: result.output,
      kind: result.kind,
      commandId: event.commandId,
    }
    if (result.kind === 'ok' && result.command.mutating && result.command.remediationId) {
      entry.actionResult = scenario.remediation.find(
        (a) => a.id === result.command.remediationId,
      )?.result
    }
    entries.push(entry)
  })
  return entries
}
