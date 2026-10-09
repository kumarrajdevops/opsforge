import { describe, expect, it } from 'vitest'
import type { IncidentEvaluation, IncidentScenario, SessionEvent } from '@opsforge/types'
import {
  availableCommands,
  buildTimeline,
  deriveState,
  discoverableEvidence,
  filterLogs,
  impactViews,
  matchCommand,
  metricPoints,
  resolveCommand,
  serviceViews,
  visibleLogs,
} from './engine'
import { evaluateSession } from './evaluator'
import {
  IncidentReviewRegistry,
  IncidentReviewValidationError,
  runIncidentReview,
  validateIncidentReview,
} from './review'
import { LocalStorageIncidentRepository } from './repository'
import { scenarios, getScenario } from './scenarios'
import { validateScenario } from './validateScenario'

const scenario = getScenario('payment-api-latency') as IncidentScenario

let clock = 0
const at = () => (clock += 20)
const run = (events: SessionEvent[]) => deriveState(scenario, { events })
const start: SessionEvent = { at: 0, type: 'start' }

function command(input: string): SessionEvent {
  const spec = matchCommand(scenario, input)
  return { at: at(), type: 'command', input, commandId: spec?.id ?? null }
}

describe('scenario content', () => {
  it.each(scenarios.map((s) => [s.id, s] as const))('%s is structurally sound', (_id, s) => {
    expect(validateScenario(s)).toEqual([])
  })

  it('hides the cause in the briefing', () => {
    const briefing = `${scenario.summary} ${scenario.page}`.toLowerCase()
    for (const term of ['idle in transaction', 'nested', 'audit_log', 'preauth', 'rollout']) {
      expect(briefing).not.toContain(term)
    }
  })

  it('catches broken references', () => {
    const broken: IncidentScenario = {
      ...scenario,
      evidence: scenario.evidence.map((e, i) => (i === 0 ? { ...e, requires: ['nope'] } : e)),
    }
    expect(validateScenario(broken).join('\n')).toContain('unknown evidence "nope"')
  })
})

describe('progressive reveal', () => {
  it('shows only start evidence on arrival', () => {
    const state = run([start])
    const ids = [...state.revealedIds]
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) {
      expect(scenario.evidence.find((e) => e.id === id)?.trigger.kind).toBe('start')
    }
    expect(state.revealedIds.has('e-cmd-pg-idle-detail')).toBe(false)
  })

  it('reveals evidence when a view is opened', () => {
    const state = run([
      start,
      { at: 5, type: 'view', channel: 'metrics', target: 'm-db-connections' },
    ])
    expect(state.revealedIds.has('e-metric-db-conn')).toBe(true)
  })

  it('respects requires: the rollout diff needs the history first', () => {
    const diffFirst = run([
      start,
      command('kubectl rollout history deploy/payment-api -n payments'),
    ])
    expect(diffFirst.revealedIds.has('e-cmd-rollout-history')).toBe(true)
    expect(diffFirst.revealedIds.has('e-cmd-rollout-diff')).toBe(false)
    const both = run([
      start,
      command('kubectl rollout history deploy/payment-api -n payments'),
      command('argocd app diff payment-api'),
    ])
    expect(both.revealedIds.size).toBeGreaterThanOrEqual(diffFirst.revealedIds.size)
  })

  it('gates a command behind evidence', () => {
    const fresh = run([start])
    const idle = scenario.commands.find((c) => c.unlockedBy?.length)
    expect(idle).toBeDefined()
    expect(resolveCommand(scenario, fresh, idle!.command).kind).toBe('locked')
    expect(availableCommands(scenario, fresh).some((c) => c.id === idle!.id)).toBe(false)
  })

  it('reveals gated logs only after the matching search', () => {
    const before = run([start])
    const hiddenBefore = visibleLogs(scenario, before, 'payment-api').some((l) => l.gatedBy)
    expect(hiddenBefore).toBe(false)
    const after = run([
      start,
      { at: 10, type: 'log-search', serviceId: 'payment-api', query: 'pool exhausted' },
    ])
    expect(visibleLogs(scenario, after, 'payment-api').some((l) => l.gatedBy)).toBe(true)
  })

  it('ignores too-short log searches', () => {
    const state = run([
      start,
      { at: 10, type: 'log-search', serviceId: 'payment-api', query: 'po' },
    ])
    expect(state.revealedIds.has('e-log-pool')).toBe(false)
  })

  it('does not link hypotheses to unrevealed evidence', () => {
    const state = run([
      start,
      {
        at: 1,
        type: 'hypothesis-add',
        id: 'h1',
        category: 'change',
        serviceId: 'payment-api',
        statement: 'deploy',
      },
      {
        at: 2,
        type: 'hypothesis-link',
        id: 'h1',
        evidenceId: 'e-cmd-rollout-diff',
        relation: 'supports',
      },
    ])
    expect(state.hypotheses[0]?.links).toEqual([])
    expect(state.hypotheses[0]?.specId).toBe('h-deploy')
  })

  it('has more discoverable evidence than is visible at start', () => {
    expect(discoverableEvidence(scenario).length).toBeGreaterThan(15)
  })
})

describe('commands', () => {
  it('matches regardless of whitespace, case and flag order', () => {
    expect(matchCommand(scenario, '  KUBECTL   get pods -n payments ;')?.id).toBe('cmd-pods')
    expect(matchCommand(scenario, 'kubectl -n payments get pods')?.id).toBe('cmd-pods')
    expect(matchCommand(scenario, 'rm -rf /')).toBeNull()
  })

  it('reports unknown commands without revealing anything', () => {
    const result = resolveCommand(scenario, run([start]), 'whoami')
    expect(result.kind).toBe('unknown')
  })

  it('shows resolved output only after recovery', () => {
    const pods = scenario.commands.find((c) => c.id === 'cmd-pods')!
    expect(pods.outputResolved).toBeDefined()
    const before = resolveCommand(scenario, run([start]), pods.command)
    const resolved = run([
      start,
      { at: 30, type: 'remediation', actionId: 'act-rollback', via: 'panel' },
    ])
    const after = resolveCommand(scenario, resolved, pods.command)
    expect(before.kind === 'ok' && after.kind === 'ok' && before.output !== after.output).toBe(true)
  })
})

describe('remediation state', () => {
  it('rollback resolves; services and impact recover', () => {
    const state = run([
      start,
      { at: 100, type: 'remediation', actionId: 'act-rollback', via: 'panel' },
    ])
    expect(state.resolved).toBe(true)
    expect(serviceViews(scenario, state).find((s) => s.id === 'payment-api')?.health).toBe(
      'healthy',
    )
  })

  it('a worsening action overrides metrics but does not resolve', () => {
    const state = run([
      start,
      { at: 100, type: 'remediation', actionId: 'act-scale-api', via: 'panel' },
    ])
    expect(state.resolved).toBe(false)
    expect(state.effects.length).toBeGreaterThan(0)
  })

  it('recovery tail reveals gradually in simulated time', () => {
    const series = scenario.metrics.find((m) => m.recoveredTail)!
    const state = run([
      start,
      { at: 100, type: 'remediation', actionId: 'act-rollback', via: 'panel' },
    ])
    const early = metricPoints(series, state, 100).length
    const later = metricPoints(series, state, 100 + 60).length
    expect(early).toBe(series.points.length + 1)
    expect(later).toBeGreaterThan(early)
  })

  it('locks impact facts until their evidence is found', () => {
    const locked = impactViews(scenario, run([start])).filter((i) => i.locked)
    expect(locked.length).toBeGreaterThan(0)
    expect(locked.every((i) => i.value === null)).toBe(true)
  })
})

describe('timeline and logs', () => {
  it('never includes unrevealed evidence', () => {
    const events = [start]
    const state = run(events)
    const titles = buildTimeline(scenario, state, events).map((t) => t.title)
    expect(titles).toContain('You were paged')
    const rootEvidence = scenario.evidence.find((e) => e.id === 'e-cmd-rollout-history')!
    expect(titles).not.toContain(rootEvidence.title)
  })

  it('filters log lines', () => {
    const lines = visibleLogs(scenario, run([start]), 'payment-api')
    const filtered = filterLogs(lines, 'timeout')
    expect(filtered.length).toBeLessThanOrEqual(lines.length)
    expect(filtered.every((l) => l.message.toLowerCase().includes('timeout'))).toBe(true)
  })
})

function idealRun(): SessionEvent[] {
  clock = 0
  const events: SessionEvent[] = [start]
  const push = (e: SessionEvent) => events.push(e)
  push({
    at: at(),
    type: 'note',
    promptId: scenario.prompts[0]!.id,
    text: 'Checking impact and scope first.',
  })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-checkout-success' })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-errors' })
  push(command('kubectl rollout history deploy/payment-api -n payments'))
  push(command('argocd app diff payment-api'))
  push({ at: at(), type: 'view', channel: 'traces', target: 'tr-wallet-ok' })
  push({ at: at(), type: 'severity', severity: scenario.expectedSeverity })
  push({
    at: at(),
    type: 'message',
    message: {
      id: 'm1',
      audience: 'engineering',
      kind: 'acknowledge',
      impact: 'Checkout failing for a share of customers',
      status: 'Investigating a recent deploy',
      nextUpdateMinutes: 15,
    },
  })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-db-connections' })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-cpu' })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-kafka-lag' })
  push(
    command(
      'kubectl exec -n payments postgres-payments-0 -- psql -c "select state, count(*) from pg_stat_activity group by state"',
    ),
  )
  push({
    at: at(),
    type: 'hypothesis-add',
    id: 'h1',
    category: 'change',
    serviceId: 'payment-api',
    statement: 'Recent deploy holds DB connections',
  })
  push({
    at: at(),
    type: 'hypothesis-add',
    id: 'h2',
    category: 'capacity',
    serviceId: 'payment-api',
    statement: 'Not CPU-bound',
  })
  push({ at: at(), type: 'hypothesis-status', id: 'h2', status: 'ruled-out' })
  push({ at: at(), type: 'remediation', actionId: 'act-rollback', via: 'panel' })
  push({ at: at(), type: 'view', channel: 'metrics', target: 'm-errors' })
  return events
}

const sampleEvaluation = (events: SessionEvent[]): IncidentEvaluation =>
  evaluateSession(scenario, events, 600)

describe('evaluator', () => {
  it('returns no score when nothing was attempted', () => {
    const result = evaluateSession(scenario, [start], 0)
    expect(result.overall).toBeNull()
    expect(result.complete).toBe(false)
    expect(result.dimensions.every((d) => d.score === null || d.score >= 0)).toBe(true)
  })

  it('is deterministic', () => {
    const events = idealRun()
    expect(sampleEvaluation(events)).toEqual(sampleEvaluation(events))
  })

  it('credits an evidence-led run and never reports NaN', () => {
    const result = sampleEvaluation(idealRun())
    expect(result.stats.resolved).toBe(true)
    expect(result.stats.keyEvidenceFound).toBeGreaterThan(0)
    for (const d of result.dimensions) {
      if (d.score !== null) expect(Number.isFinite(d.score)).toBe(true)
    }
    const mitigation = result.dimensions.find((d) => d.id === 'mitigation')
    expect(mitigation?.score).not.toBeNull()
    expect(mitigation!.score!).toBeGreaterThan(50)
  })

  it('penalises a blind rollback with no investigation', () => {
    clock = 0
    const blind: SessionEvent[] = [
      start,
      { at: 20, type: 'remediation', actionId: 'act-rollback', via: 'panel' },
    ]
    const informed = idealRun()
    const blindScore =
      sampleEvaluation(blind).dimensions.find((d) => d.id === 'mitigation')?.score ?? 0
    const informedScore =
      sampleEvaluation(informed).dimensions.find((d) => d.id === 'mitigation')?.score ?? 0
    expect(blindScore).toBeLessThan(informedScore)
  })

  it('punishes a harmful action', () => {
    clock = 0
    const harm: SessionEvent[] = [
      start,
      { at: 20, type: 'remediation', actionId: 'act-scale-api', via: 'panel' },
      { at: 40, type: 'remediation', actionId: 'act-flush-redis', via: 'panel' },
    ]
    const result = sampleEvaluation(harm)
    const mitigation = result.dimensions.find((d) => d.id === 'mitigation')
    expect(mitigation?.score ?? 0).toBeLessThan(40)
  })

  it('flags internal jargon in customer messages', () => {
    const noisy: SessionEvent[] = [
      start,
      {
        at: 30,
        type: 'message',
        message: {
          id: 'm1',
          audience: 'customers',
          kind: 'status',
          impact: 'Hikari pool exhausted on postgres-payments',
          status: 'Investigating',
          nextUpdateMinutes: null,
        },
      },
    ]
    const result = sampleEvaluation(noisy)
    const check = result.dimensions
      .flatMap((d) => d.checks)
      .find((c) => c.id === 'comm-customer-clarity')
    expect(check?.credit ?? 1).toBeLessThan(1)
  })

  it('has checks mapped onto every troubleshooting skill', () => {
    const result = sampleEvaluation(idealRun())
    expect(result.skills.length).toBe(11)
  })
})

describe('review providers', () => {
  const good = {
    providerId: 'p',
    summary: 'Solid triage.',
    observations: [
      { dimension: 'mitigation', kind: 'strength', note: 'Rolled back with evidence.' },
    ],
    followUps: ['What would you alert on?'],
  }

  it('starts empty: no provider ships with the app', () => {
    expect(new IncidentReviewRegistry().isConfigured).toBe(false)
  })

  it('accepts qualitative results', () => {
    expect(validateIncidentReview(good).observations).toHaveLength(1)
  })

  it.each(['score', 'overall', 'rating', 'percentage'])('rejects a "%s" field', (key) => {
    expect(() => validateIncidentReview({ ...good, [key]: 90 })).toThrow(
      IncidentReviewValidationError,
    )
    expect(() =>
      validateIncidentReview({ ...good, observations: [{ ...good.observations[0], [key]: 1 }] }),
    ).toThrow(IncidentReviewValidationError)
  })

  it('rejects unknown dimensions and empty text', () => {
    expect(() =>
      validateIncidentReview({
        ...good,
        observations: [{ dimension: 'luck', kind: 'gap', note: 'x' }],
      }),
    ).toThrow(/unknown dimension/)
    expect(() => validateIncidentReview({ ...good, summary: '  ' })).toThrow(/summary/)
  })

  it('validates provider output when running a review', async () => {
    const registry = new IncidentReviewRegistry()
    const unregister = registry.register({
      id: 'p',
      label: 'P',
      review: async () => ({ ...good, score: 5 }),
    })
    const session = { scenarioId: scenario.id, startedAt: '', elapsedSeconds: 0, events: [start] }
    const request = { scenario, session, evaluation: sampleEvaluation([start]) }
    await expect(runIncidentReview(registry.get('p')!, request)).rejects.toThrow(
      IncidentReviewValidationError,
    )
    unregister()
    expect(registry.isConfigured).toBe(false)
  })
})

describe('repository', () => {
  const session = {
    scenarioId: 'payment-api-latency',
    startedAt: '2026-01-01T00:00:00Z',
    elapsedSeconds: 42,
    events: [start],
  }

  it('round-trips a session', async () => {
    const data = new Map<string, string>()
    const repo = new LocalStorageIncidentRepository({
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k),
    })
    await repo.save(session)
    expect(await repo.load(session.scenarioId)).toEqual(session)
    await repo.clear(session.scenarioId)
    expect(await repo.load(session.scenarioId)).toBeNull()
  })

  it('ignores corrupt data', async () => {
    const repo = new LocalStorageIncidentRepository({
      getItem: () => '{not json',
      setItem: () => undefined,
      removeItem: () => undefined,
    })
    expect(await repo.load('x')).toBeNull()
  })

  it('falls back to memory when storage throws', async () => {
    const throwing = () => {
      throw new Error('denied')
    }
    const repo = new LocalStorageIncidentRepository({
      getItem: throwing,
      setItem: throwing,
      removeItem: throwing,
    })
    await repo.save(session)
    expect(await repo.load(session.scenarioId)).toEqual(session)
  })
})
