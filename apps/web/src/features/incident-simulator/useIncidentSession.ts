import type {
  EvidenceRelation,
  HypothesisCategory,
  HypothesisStatus,
  IncidentEvaluation,
  IncidentMessage,
  IncidentRepository,
  IncidentScenario,
  IncidentSeverity,
  RcaDraft,
  SessionEvent,
  TelemetryChannel,
} from '@opsforge/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deriveState, isUnlocked, matchCommand, type SessionState } from './engine'
import { evaluateSession } from './evaluator'
import { objectives, objectiveProgress, type Objective } from './progress'
import { incidentRepository } from './repository'
import { buildTranscript, runBuiltin, type TranscriptEntry } from './terminal'

export type SessionStatus = 'loading' | 'briefing' | 'running' | 'submitted'

type NewEvent = SessionEvent extends infer E
  ? E extends { at: number }
    ? Omit<E, 'at'>
    : never
  : never

export interface BuiltinLine {
  key: string
  position: number
  input: string
  output: string
}

export interface IncidentSessionApi {
  status: SessionStatus
  state: SessionState
  events: SessionEvent[]
  /** Session seconds, ticking while the incident is live. */
  elapsed: number
  startedAt: string | null
  transcript: TranscriptEntry[]
  builtins: BuiltinLine[]
  /** Transcript entries at or before this position are hidden by `clear`. */
  clearedBefore: number
  objectives: Objective[]
  progress: { done: number; total: number }
  evaluation: IncidentEvaluation | null
  /** Screen-reader text for newly revealed evidence and recovery. */
  announcement: string

  begin: () => void
  restart: () => void
  openView: (channel: TelemetryChannel, target: string) => void
  searchLogs: (serviceId: string, query: string) => void
  runCommand: (input: string) => void
  applyRemediation: (actionId: string) => void
  setSeverity: (severity: IncidentSeverity) => void
  addHypothesis: (input: {
    category: HypothesisCategory
    serviceId: string
    statement: string
  }) => void
  linkEvidence: (hypothesisId: string, evidenceId: string, relation: EvidenceRelation) => void
  unlinkEvidence: (hypothesisId: string, evidenceId: string) => void
  setHypothesisStatus: (hypothesisId: string, status: HypothesisStatus) => void
  removeHypothesis: (hypothesisId: string) => void
  saveRca: (rca: RcaDraft) => void
  savePrevention: (optionIds: string[], notes: string) => void
  sendMessage: (message: Omit<IncidentMessage, 'id'>) => void
  saveNote: (promptId: string, text: string) => void
  submit: () => void
}

export interface IncidentSessionOptions {
  repository?: IncidentRepository
  /** Injectable wall clock in milliseconds, for tests. */
  now?: () => number
}

export function useIncidentSession(
  scenario: IncidentScenario,
  { repository = incidentRepository, now = Date.now }: IncidentSessionOptions = {},
): IncidentSessionApi {
  const [loaded, setLoaded] = useState(false)
  const [events, setEvents] = useState<SessionEvent[]>([])
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [baseline, setBaseline] = useState(0)
  const [builtins, setBuiltins] = useState<BuiltinLine[]>([])
  const [clearedBefore, setClearedBefore] = useState(-1)

  const anchor = useRef({ base: 0, wall: 0 })
  const elapsedRef = useRef(0)

  const state = useMemo(() => deriveState(scenario, { events }), [scenario, events])
  const status: SessionStatus = !loaded
    ? 'loading'
    : state.submitted
      ? 'submitted'
      : state.started
        ? 'running'
        : 'briefing'
  const running = status === 'running'

  useEffect(() => {
    let cancelled = false
    repository.load(scenario.id).then((saved) => {
      if (cancelled) return
      if (saved) {
        setEvents(saved.events)
        setStartedAt(saved.startedAt)
        setElapsed(saved.elapsedSeconds)
        elapsedRef.current = saved.elapsedSeconds
        anchor.current = { base: saved.elapsedSeconds, wall: now() }
        setBaseline(deriveState(scenario, { events: saved.events }).revealed.length)
      }
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [repository, scenario, now])

  useEffect(() => {
    if (!running) return
    anchor.current = { base: elapsedRef.current, wall: now() }
    const id = window.setInterval(() => {
      const next = anchor.current.base + (now() - anchor.current.wall) / 1000
      elapsedRef.current = next
      setElapsed(next)
    }, 1000)
    return () => window.clearInterval(id)
  }, [running, now])

  useEffect(() => {
    if (!loaded || events.length === 0 || startedAt === null) return
    void repository.save({
      scenarioId: scenario.id,
      startedAt,
      elapsedSeconds: Math.floor(elapsedRef.current),
      events,
    })
  }, [loaded, events, startedAt, repository, scenario.id])

  const secondsNow = useCallback(() => {
    if (!running) return Math.floor(elapsedRef.current)
    const next = anchor.current.base + (now() - anchor.current.wall) / 1000
    elapsedRef.current = next
    return Math.floor(next)
  }, [running, now])

  const append = useCallback(
    (event: NewEvent) => {
      const at = secondsNow()
      setEvents((previous) => [...previous, { ...event, at } as SessionEvent])
    },
    [secondsNow],
  )

  const begin = useCallback(() => {
    elapsedRef.current = 0
    anchor.current = { base: 0, wall: now() }
    setElapsed(0)
    setStartedAt(new Date(now()).toISOString())
    setBaseline(0)
    setBuiltins([])
    setClearedBefore(-1)
    setEvents([{ at: 0, type: 'start' }])
  }, [now])

  const restart = useCallback(() => {
    void repository.clear(scenario.id)
    elapsedRef.current = 0
    setElapsed(0)
    setStartedAt(null)
    setEvents([])
    setBaseline(0)
    setBuiltins([])
    setClearedBefore(-1)
  }, [repository, scenario.id])

  const openView = useCallback(
    (channel: TelemetryChannel, target: string) => {
      const last = events[events.length - 1]
      if (last?.type === 'view' && last.channel === channel && last.target === target) return
      append({ type: 'view', channel, target })
    },
    [append, events],
  )

  const searchLogs = useCallback(
    (serviceId: string, query: string) => {
      const trimmed = query.trim()
      if (trimmed) append({ type: 'log-search', serviceId, query: trimmed })
    },
    [append],
  )

  const runCommand = useCallback(
    (input: string) => {
      const trimmed = input.trim()
      if (!trimmed) return
      const history = state.commands.map((c) => c.input)
      const builtin = runBuiltin(trimmed, scenario, state, history)
      if (builtin) {
        const position = events.length - 0.5 + builtins.length * 0.0001
        if (builtin.kind === 'clear') {
          setClearedBefore(position)
        } else {
          setBuiltins((previous) => [
            ...previous,
            { key: `builtin-${previous.length}`, position, input: trimmed, output: builtin.output },
          ])
        }
        return
      }
      const spec = matchCommand(scenario, trimmed)
      const runnable = spec !== null && isUnlocked(state, spec.unlockedBy)
      append({ type: 'command', input: trimmed, commandId: runnable ? spec.id : null })
      if (
        runnable &&
        spec.mutating &&
        spec.remediationId &&
        !state.applied.some((a) => a.actionId === spec.remediationId)
      ) {
        append({ type: 'remediation', actionId: spec.remediationId, via: 'terminal' })
      }
    },
    [append, builtins.length, events.length, scenario, state],
  )

  const applyRemediation = useCallback(
    (actionId: string) => {
      if (state.resolved || state.applied.some((a) => a.actionId === actionId)) return
      append({ type: 'remediation', actionId, via: 'panel' })
    },
    [append, state.applied, state.resolved],
  )

  const addHypothesis = useCallback(
    (input: { category: HypothesisCategory; serviceId: string; statement: string }) => {
      const statement = input.statement.trim()
      if (!statement) return
      append({ type: 'hypothesis-add', id: `h${events.length}`, ...input, statement })
    },
    [append, events.length],
  )

  const submit = useCallback(() => {
    const at = secondsNow()
    elapsedRef.current = at
    setElapsed(at)
    setEvents((previous) => [...previous, { type: 'submit', at }])
  }, [secondsNow])

  const evaluation = useMemo(
    () => (status === 'submitted' ? evaluateSession(scenario, events, Math.floor(elapsed)) : null),
    [status, scenario, events, elapsed],
  )

  const transcript = useMemo(() => buildTranscript(scenario, events), [scenario, events])
  const list = useMemo(() => objectives(scenario, state), [scenario, state])

  const announcement = useMemo(() => {
    const fresh = state.revealed.slice(baseline)
    const latest = fresh[fresh.length - 1]
    if (state.resolved && state.resolvedAt !== null)
      return 'Incident resolved. Verify recovery in the metrics.'
    const node = latest && scenario.evidence.find((e) => e.id === latest.id)
    return node ? `New evidence: ${node.title}` : ''
  }, [baseline, scenario.evidence, state.resolved, state.resolvedAt, state.revealed])

  return {
    status,
    state,
    events,
    elapsed,
    startedAt,
    transcript,
    builtins,
    clearedBefore,
    objectives: list,
    progress: objectiveProgress(list),
    evaluation,
    announcement,
    begin,
    restart,
    openView,
    searchLogs,
    runCommand,
    applyRemediation,
    setSeverity: (severity) => append({ type: 'severity', severity }),
    addHypothesis,
    linkEvidence: (id, evidenceId, relation) =>
      append({ type: 'hypothesis-link', id, evidenceId, relation }),
    unlinkEvidence: (id, evidenceId) => append({ type: 'hypothesis-unlink', id, evidenceId }),
    setHypothesisStatus: (id, next) => append({ type: 'hypothesis-status', id, status: next }),
    removeHypothesis: (id) => append({ type: 'hypothesis-remove', id }),
    saveRca: (rca) => append({ type: 'rca', rca }),
    savePrevention: (optionIds, notes) => append({ type: 'prevention', optionIds, notes }),
    sendMessage: (message) =>
      append({ type: 'message', message: { ...message, id: `msg${events.length}` } }),
    saveNote: (promptId, text) => append({ type: 'note', promptId, text }),
    submit,
  }
}
