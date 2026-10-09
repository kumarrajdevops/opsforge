import type {
  EvidenceNode,
  HypothesisCategory,
  HypothesisStatus,
  EvidenceRelation,
  ImpactFact,
  IncidentMessage,
  IncidentScenario,
  IncidentService,
  IncidentSession,
  IncidentSeverity,
  LogEntry,
  MetricOverride,
  MetricSeries,
  MetricState,
  RcaDraft,
  RevealTrigger,
  ServiceHealth,
  SessionEvent,
  CommandSpec,
  HypothesisSpec,
} from '@opsforge/types'

/* ---------------------------------------------------------------- state ---- */

export interface RevealedEvidence {
  id: string
  /** Session seconds at which it was discovered. */
  at: number
}

export interface HypothesisState {
  id: string
  category: HypothesisCategory
  serviceId: string
  statement: string
  status: HypothesisStatus
  links: { evidenceId: string; relation: EvidenceRelation }[]
  createdAt: number
  /** Scenario hypothesis this one corresponds to (same category and service), if any. */
  specId: string | null
}

export interface AppliedRemediation {
  actionId: string
  at: number
  via: 'panel' | 'terminal'
}

export interface SessionState {
  started: boolean
  revealed: RevealedEvidence[]
  revealedIds: Set<string>
  commands: { at: number; input: string; commandId: string | null }[]
  views: { at: number; channel: string; target: string }[]
  searches: { at: number; serviceId: string; query: string }[]
  severity: IncidentSeverity
  severityChanges: { at: number; severity: IncidentSeverity }[]
  hypotheses: HypothesisState[]
  applied: AppliedRemediation[]
  resolved: boolean
  resolvedAt: number | null
  /** Metric overrides from non-resolving actions, cleared on resolution. */
  effects: MetricOverride[]
  rca: { at: number; draft: RcaDraft } | null
  prevention: { at: number; optionIds: string[]; notes: string } | null
  messages: { at: number; message: IncidentMessage }[]
  notes: Record<string, { at: number; text: string }>
  submitted: boolean
  submittedAt: number | null
  /** Seconds of the last recorded event. */
  lastEventAt: number
}

export function emptyState(scenario: IncidentScenario): SessionState {
  return {
    started: false,
    revealed: [],
    revealedIds: new Set(),
    commands: [],
    views: [],
    searches: [],
    severity: scenario.initialSeverity,
    severityChanges: [],
    hypotheses: [],
    applied: [],
    resolved: false,
    resolvedAt: null,
    effects: [],
    rca: null,
    prevention: null,
    messages: [],
    notes: {},
    submitted: false,
    submittedAt: null,
    lastEventAt: 0,
  }
}

/* ---------------------------------------------------------------- reveal ---- */

const MIN_SEARCH_LENGTH = 3

function triggerMatches(
  trigger: RevealTrigger,
  event: SessionEvent,
  resolved: boolean,
  node: EvidenceNode,
): boolean {
  switch (trigger.kind) {
    case 'start':
      return event.type === 'start'
    case 'command':
      return (
        event.type === 'command' &&
        event.commandId !== null &&
        trigger.commandIds.includes(event.commandId)
      )
    case 'view':
      if (
        event.type !== 'view' ||
        event.channel !== trigger.channel ||
        event.target !== trigger.target
      )
        return false
      // Verification evidence only exists once the incident has actually recovered.
      return node.phase !== 'verification' || resolved
    case 'search': {
      if (event.type !== 'log-search' || event.serviceId !== trigger.serviceId) return false
      const query = event.query.trim().toLowerCase()
      return query.length >= MIN_SEARCH_LENGTH && trigger.terms.some((term) => query.includes(term))
    }
    case 'action':
      return event.type === 'remediation' && event.actionId === trigger.actionId
  }
}

function reveal(scenario: IncidentScenario, state: SessionState, event: SessionEvent): void {
  let changed = true
  while (changed) {
    changed = false
    for (const node of scenario.evidence) {
      if (state.revealedIds.has(node.id)) continue
      if (!node.requires.every((id) => state.revealedIds.has(id))) continue
      if (!triggerMatches(node.trigger, event, state.resolved, node)) continue
      state.revealedIds.add(node.id)
      state.revealed.push({ id: node.id, at: event.at })
      changed = true
    }
  }
}

export function findHypothesisSpec(
  scenario: IncidentScenario,
  category: HypothesisCategory,
  serviceId: string,
): HypothesisSpec | undefined {
  return scenario.hypotheses.find(
    (spec) => spec.category === category && spec.serviceId === serviceId,
  )
}

function applyEvent(scenario: IncidentScenario, state: SessionState, event: SessionEvent): void {
  state.lastEventAt = Math.max(state.lastEventAt, event.at)
  switch (event.type) {
    case 'start':
      state.started = true
      break
    case 'command':
      state.commands.push({ at: event.at, input: event.input, commandId: event.commandId })
      break
    case 'view':
      state.views.push({ at: event.at, channel: event.channel, target: event.target })
      break
    case 'log-search':
      state.searches.push({ at: event.at, serviceId: event.serviceId, query: event.query })
      break
    case 'severity':
      state.severity = event.severity
      state.severityChanges.push({ at: event.at, severity: event.severity })
      break
    case 'hypothesis-add':
      if (!state.hypotheses.some((h) => h.id === event.id)) {
        state.hypotheses.push({
          id: event.id,
          category: event.category,
          serviceId: event.serviceId,
          statement: event.statement,
          status: 'testing',
          links: [],
          createdAt: event.at,
          specId: findHypothesisSpec(scenario, event.category, event.serviceId)?.id ?? null,
        })
      }
      break
    case 'hypothesis-link': {
      const hypothesis = state.hypotheses.find((h) => h.id === event.id)
      if (hypothesis && state.revealedIds.has(event.evidenceId)) {
        hypothesis.links = hypothesis.links.filter((link) => link.evidenceId !== event.evidenceId)
        hypothesis.links.push({ evidenceId: event.evidenceId, relation: event.relation })
      }
      break
    }
    case 'hypothesis-unlink': {
      const hypothesis = state.hypotheses.find((h) => h.id === event.id)
      if (hypothesis)
        hypothesis.links = hypothesis.links.filter((link) => link.evidenceId !== event.evidenceId)
      break
    }
    case 'hypothesis-status': {
      const hypothesis = state.hypotheses.find((h) => h.id === event.id)
      if (hypothesis) hypothesis.status = event.status
      break
    }
    case 'hypothesis-remove':
      state.hypotheses = state.hypotheses.filter((h) => h.id !== event.id)
      break
    case 'remediation': {
      const action = scenario.remediation.find((a) => a.id === event.actionId)
      if (!action) break
      state.applied.push({ actionId: action.id, at: event.at, via: event.via })
      if (action.outcome === 'resolves' && !state.resolved) {
        state.resolved = true
        state.resolvedAt = event.at
        state.effects = []
      } else if (!state.resolved && action.effects) {
        for (const effect of action.effects) {
          state.effects = state.effects.filter(
            (e) => !(e.serviceId === effect.serviceId && e.metricId === effect.metricId),
          )
          state.effects.push(effect)
        }
      }
      break
    }
    case 'rca':
      state.rca = { at: event.at, draft: event.rca }
      break
    case 'prevention':
      state.prevention = { at: event.at, optionIds: event.optionIds, notes: event.notes }
      break
    case 'message':
      state.messages.push({ at: event.at, message: event.message })
      break
    case 'note':
      state.notes[event.promptId] = { at: event.at, text: event.text }
      break
    case 'submit':
      state.submitted = true
      state.submittedAt = event.at
      break
  }
  reveal(scenario, state, event)
}

export interface ReplayStep {
  event: SessionEvent
  index: number
  /** Evidence ids that were already revealed before this event. */
  before: ReadonlySet<string>
  state: SessionState
}

/** Applies events in order, calling `visit` after each with the state at that moment. */
export function replay(
  scenario: IncidentScenario,
  events: SessionEvent[],
  visit?: (step: ReplayStep) => void,
): SessionState {
  const state = emptyState(scenario)
  events.forEach((event, index) => {
    const before = visit ? new Set(state.revealedIds) : new Set<string>()
    applyEvent(scenario, state, event)
    visit?.({ event, index, before, state })
  })
  return state
}

/** Folds the raw event log into everything the console and the evaluator need. Pure and replayable. */
export function deriveState(
  scenario: IncidentScenario,
  session: Pick<IncidentSession, 'events'>,
): SessionState {
  return replay(scenario, session.events)
}

export function isRevealed(state: SessionState, id: string): boolean {
  return state.revealedIds.has(id)
}

/* ------------------------------------------------------------- commands ---- */

export function normalizeCommand(input: string): string {
  const collapsed = input
    .trim()
    .replace(/;+\s*$/, '')
    .replace(/\s+/g, ' ')
  return collapsed
    .replace(/--namespace[ =]/g, '-n ')
    .replace(/-n=/g, '-n ')
    .replace(/["']/g, '')
    .toLowerCase()
}

/** Order-insensitive key so `-n payments` may appear before or after the resource. */
function commandKey(input: string): string {
  return normalizeCommand(input).split(' ').filter(Boolean).sort().join(' ')
}

export function matchCommand(scenario: IncidentScenario, input: string): CommandSpec | null {
  const key = commandKey(input)
  if (!key) return null
  for (const command of scenario.commands) {
    if (commandKey(command.command) === key) return command
    if (command.aliases?.some((alias) => commandKey(alias) === key)) return command
  }
  return null
}

export function isUnlocked(state: SessionState, unlockedBy?: string[]): boolean {
  return !unlockedBy || unlockedBy.every((id) => state.revealedIds.has(id))
}

export function availableCommands(scenario: IncidentScenario, state: SessionState): CommandSpec[] {
  return scenario.commands.filter((command) => isUnlocked(state, command.unlockedBy))
}

export type CommandResult =
  | { kind: 'ok'; command: CommandSpec; output: string }
  | { kind: 'locked'; output: string }
  | { kind: 'unknown'; output: string }

export const UNKNOWN_COMMAND_OUTPUT =
  'Command not recognised in this simulation. Type "help" to list the commands you can run.'
export const LOCKED_COMMAND_OUTPUT =
  'No matching resource. Gather more context before running this.'

export function resolveCommand(
  scenario: IncidentScenario,
  state: SessionState,
  input: string,
): CommandResult {
  const command = matchCommand(scenario, input)
  if (!command) return { kind: 'unknown', output: UNKNOWN_COMMAND_OUTPUT }
  if (!isUnlocked(state, command.unlockedBy))
    return { kind: 'locked', output: LOCKED_COMMAND_OUTPUT }
  const output = state.resolved && command.outputResolved ? command.outputResolved : command.output
  return { kind: 'ok', command, output }
}

/* ----------------------------------------------------------- derived views ---- */

export interface ServiceView {
  id: string
  name: string
  kind: IncidentService['kind']
  dependsOn: string[]
  health: ServiceHealth
  note: string
  headline: { id: string; label: string; value: string; state: MetricState }[]
}

export function serviceViews(scenario: IncidentScenario, state: SessionState): ServiceView[] {
  return scenario.services.map((service) => {
    const resolved = state.resolved
    const health: ServiceHealth = resolved ? (service.recoveredHealth ?? 'healthy') : service.health
    const note = resolved ? (service.recoveredNote ?? service.note) : service.note
    const headline = service.headline.map((metric) => {
      const override = state.effects.find(
        (e) => e.serviceId === service.id && e.metricId === metric.id,
      )
      if (override)
        return { id: metric.id, label: metric.label, value: override.value, state: override.state }
      if (resolved && metric.recovered) {
        return {
          id: metric.id,
          label: metric.label,
          value: metric.recovered.value,
          state: metric.recovered.state,
        }
      }
      return { id: metric.id, label: metric.label, value: metric.value, state: metric.state }
    })
    return {
      id: service.id,
      name: service.name,
      kind: service.kind,
      dependsOn: service.dependsOn,
      health,
      note,
      headline,
    }
  })
}

export interface ImpactView {
  id: string
  label: string
  value: string | null
  state?: MetricState
  locked: boolean
}

export function impactViews(scenario: IncidentScenario, state: SessionState): ImpactView[] {
  return scenario.impact.map((fact: ImpactFact) => {
    const locked = fact.gatedBy !== undefined && !state.revealedIds.has(fact.gatedBy)
    if (locked) return { id: fact.id, label: fact.label, value: null, locked: true }
    if (state.resolved && fact.recovered) {
      return {
        id: fact.id,
        label: fact.label,
        value: fact.recovered.value,
        state: fact.recovered.state,
        locked: false,
      }
    }
    return { id: fact.id, label: fact.label, value: fact.value, state: fact.state, locked: false }
  })
}

/** Simulated seconds of session time between recovery samples after a fix. */
export const RECOVERY_SECONDS_PER_SAMPLE = 6

export function metricPoints(
  series: MetricSeries,
  state: SessionState,
  nowSeconds: number,
): number[] {
  if (!state.resolved || state.resolvedAt === null || !series.recoveredTail) return series.points
  const elapsed = Math.max(0, nowSeconds - state.resolvedAt)
  const visible = Math.min(
    series.recoveredTail.length,
    Math.floor(elapsed / RECOVERY_SECONDS_PER_SAMPLE) + 1,
  )
  return [...series.points, ...series.recoveredTail.slice(0, visible)]
}

export function visibleLogs(
  scenario: IncidentScenario,
  state: SessionState,
  serviceId: string,
): LogEntry[] {
  return scenario.logs
    .filter((entry) => entry.serviceId === serviceId)
    .filter((entry) => !entry.gatedBy || state.revealedIds.has(entry.gatedBy))
    .sort((a, b) => a.atSeconds - b.atSeconds)
}

export function filterLogs(entries: LogEntry[], query: string): LogEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return entries
  return entries.filter((entry) => entry.message.toLowerCase().includes(needle))
}

/* ----------------------------------------------------------------- time ---- */

export function incidentMinute(scenario: IncidentScenario, sessionSeconds: number): number {
  return scenario.pagedAtMinute + sessionSeconds / 60
}

export function formatIncidentTime(minutes: number): string {
  const whole = Math.floor(minutes)
  const seconds = Math.min(59, Math.round((minutes - whole) * 60))
  return `T+${String(whole).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export interface TimelineEntry {
  id: string
  minute: number
  kind: 'incident' | 'evidence' | 'action'
  title: string
  detail?: string
}

/** What is known to have happened, in incident time. Unrevealed evidence never appears. */
export function buildTimeline(
  scenario: IncidentScenario,
  state: SessionState,
  events: SessionEvent[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      id: 'paged',
      minute: scenario.pagedAtMinute,
      kind: 'incident',
      title: 'You were paged',
      detail: scenario.page,
    },
  ]
  for (const item of state.revealed) {
    const node = scenario.evidence.find((n) => n.id === item.id)
    if (node?.at !== undefined) {
      entries.push({ id: `ev-${node.id}`, minute: node.at, kind: 'evidence', title: node.title })
    }
  }
  events.forEach((event, index) => {
    const minute = incidentMinute(scenario, event.at)
    const id = `act-${index}`
    switch (event.type) {
      case 'severity':
        entries.push({
          id,
          minute,
          kind: 'action',
          title: `Severity set to ${event.severity.toUpperCase()}`,
        })
        break
      case 'remediation': {
        const action = scenario.remediation.find((a) => a.id === event.actionId)
        if (action) entries.push({ id, minute, kind: 'action', title: `Applied: ${action.label}` })
        break
      }
      case 'message':
        entries.push({
          id,
          minute,
          kind: 'action',
          title: `Update sent to ${event.message.audience}`,
          detail: event.message.status,
        })
        break
      case 'hypothesis-add':
        entries.push({
          id,
          minute,
          kind: 'action',
          title: 'Hypothesis recorded',
          detail: event.statement,
        })
        break
      default:
        break
    }
  })
  return entries.sort((a, b) => a.minute - b.minute)
}

export function unrevealedEvidence(
  scenario: IncidentScenario,
  state: SessionState,
): EvidenceNode[] {
  return scenario.evidence.filter((node) => !state.revealedIds.has(node.id))
}

/** Evidence that can be found by investigating (excludes free-on-arrival items and post-fix confirmations). */
export function discoverableEvidence(scenario: IncidentScenario): EvidenceNode[] {
  return scenario.evidence.filter(
    (node) => node.trigger.kind !== 'start' && node.phase !== 'verification',
  )
}
