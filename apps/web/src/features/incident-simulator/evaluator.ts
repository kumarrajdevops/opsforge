import type {
  EvidenceNode,
  IncidentCheck,
  IncidentDimensionId,
  IncidentDimensionResult,
  IncidentEvaluation,
  IncidentScenario,
  IncidentSeverity,
  PreventionQuality,
  RemediationAction,
  SessionEvent,
  TroubleshootingSkillId,
  TroubleshootingSkillResult,
} from '@opsforge/types'
import {
  discoverableEvidence,
  findHypothesisSpec,
  replay,
  type ReplayStep,
  type SessionState,
} from './engine'

export const DIMENSION_LABELS: Record<IncidentDimensionId, string> = {
  'investigation-order': 'Investigation order',
  'evidence-gathering': 'Evidence gathering',
  hypothesis: 'Hypothesis quality',
  'root-cause': 'Root cause',
  mitigation: 'Mitigation',
  prevention: 'Prevention',
  communication: 'Communication',
}

/** Relative weight of each dimension in the overall score (sums to 100). */
export const DIMENSION_WEIGHTS: Record<IncidentDimensionId, number> = {
  'investigation-order': 12,
  'evidence-gathering': 18,
  hypothesis: 14,
  'root-cause': 20,
  mitigation: 14,
  prevention: 10,
  communication: 12,
}

export const SKILL_LABELS: Record<TroubleshootingSkillId, string> = {
  'problem-clarification': 'Problem clarification',
  'scope-identification': 'Scope identification',
  'timeline-analysis': 'Timeline and recent changes',
  'hypothesis-formation': 'Hypothesis formation',
  'evidence-gathering': 'Evidence gathering',
  isolation: 'Isolation',
  'root-cause-reasoning': 'Root-cause reasoning',
  prioritization: 'Prioritization',
  mitigation: 'Mitigation',
  prevention: 'Prevention',
  communication: 'Communication',
}

const SEVERITY_RANK: Record<IncidentSeverity, number> = { sev1: 1, sev2: 2, sev3: 3, sev4: 4 }
const PREVENTION_POINTS: Record<PreventionQuality, number> = {
  strong: 1,
  acceptable: 0.5,
  weak: 0,
  counterproductive: -1,
}
const OUTCOME_CREDIT = { resolves: 1, relieves: 0.4, 'no-effect': 0.1, worsens: 0 } as const
const RISK_CREDIT = { low: 1, medium: 0.7, high: 0.4 } as const

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const pct = (value: number) => Math.round(clamp01(value) * 100)

type CheckInput = Omit<IncidentCheck, 'credit'> & { credit: number }

function check(input: CheckInput): IncidentCheck {
  return { ...input, credit: clamp01(input.credit) }
}

interface Context {
  scenario: IncidentScenario
  events: SessionEvent[]
  state: SessionState
  steps: ReplayStep[]
  nodes: Map<string, EvidenceNode>
  /** Discovery actions (non-mutating commands, views, log searches) up to and including each step. */
  discoveryAt: number[]
  discoveryActions: number
  elapsedSeconds: number
}

function isDiscovery(scenario: IncidentScenario, event: SessionEvent): boolean {
  if (event.type === 'view' || event.type === 'log-search') return true
  if (event.type !== 'command' || event.commandId === null) return false
  return !scenario.commands.find((c) => c.id === event.commandId)?.mutating
}

/** Evidence ids known once step `i` has been applied. */
function revealedAfter(ctx: Context, i: number): ReadonlySet<string> {
  return ctx.steps[i + 1]?.before ?? ctx.state.revealedIds
}

/* ---------------------------------------------------------- dimensions ---- */

function investigationOrder(ctx: Context): IncidentCheck[] {
  const { scenario, state, steps, nodes } = ctx
  if (ctx.discoveryActions === 0) return []
  const checks: IncidentCheck[] = []

  const firstRemediation = steps.find((s) => s.event.type === 'remediation')
  if (firstRemediation) {
    const found = [...firstRemediation.before].filter(
      (id) => nodes.get(id)?.trigger.kind !== 'start',
    ).length
    checks.push(
      check({
        id: 'ord-evidence-before-action',
        dimension: 'investigation-order',
        label: 'Gathered evidence before changing anything',
        credit: found / 6,
        weight: 3,
        detail:
          found >= 6
            ? `You had ${found} findings before your first change.`
            : `You had ${found} finding${found === 1 ? '' : 's'} before your first change. Changing production on thin evidence is a guess.`,
        skills: ['evidence-gathering', 'prioritization'],
      }),
    )
  }

  const changeNodes = [...nodes.values()].filter((n) => n.channel === 'change')
  if (changeNodes.length > 0) {
    let ordinal: number | null = null
    for (let i = 0; i < steps.length && ordinal === null; i++) {
      const before = steps[i]!.before
      if (changeNodes.some((n) => revealedAfter(ctx, i).has(n.id) && !before.has(n.id))) {
        ordinal = ctx.discoveryAt[i] ?? null
      }
    }
    const credit = ordinal === null ? 0 : ordinal <= 6 ? 1 : ordinal <= 10 ? 0.6 : 0.3
    checks.push(
      check({
        id: 'ord-recent-change',
        dimension: 'investigation-order',
        label: 'Asked what changed recently',
        credit,
        weight: 2,
        detail:
          ordinal === null
            ? 'You never established what changed before the incident began.'
            : ordinal <= 6
              ? 'You checked recent changes early.'
              : 'You checked recent changes, but late. "What changed?" is usually the cheapest first question.',
        skills: ['timeline-analysis', 'prioritization'],
      }),
    )
  }

  const triage = [...nodes.values()].filter(
    (n) => n.phase === 'triage' && n.trigger.kind !== 'start',
  )
  if (triage.length > 0) {
    const earlyIds = new Set<string>()
    steps.forEach((_step, i) => {
      if ((ctx.discoveryAt[i] ?? 0) > 5) return
      for (const id of revealedAfter(ctx, i)) earlyIds.add(id)
    })
    const early = triage.filter((n) => earlyIds.has(n.id)).length
    checks.push(
      check({
        id: 'ord-impact-first',
        dimension: 'investigation-order',
        label: 'Established customer impact early',
        credit: early / 2,
        weight: 1.5,
        detail:
          early >= 2
            ? 'Within your first few steps you confirmed how customers are affected.'
            : 'Establish what customers experience and how widely before going deep on one theory.',
        skills: ['problem-clarification', 'scope-identification'],
      }),
    )
  }

  const unknown = state.commands.filter((c) => c.commandId === null).length
  const seen = new Set<string>()
  let repeats = 0
  for (const c of state.commands) {
    if (c.commandId === null) continue
    if (seen.has(c.commandId)) repeats++
    seen.add(c.commandId)
  }
  const wasted = unknown + repeats
  checks.push(
    check({
      id: 'ord-efficiency',
      dimension: 'investigation-order',
      label: 'Focused, non-repetitive investigation',
      credit: 1 - wasted / 6,
      weight: 1,
      detail:
        wasted === 0
          ? 'Every command you ran was recognised and new.'
          : `${unknown} unrecognised and ${repeats} repeated command${wasted === 1 ? '' : 's'}.`,
      skills: ['prioritization'],
    }),
  )

  const diff = Math.abs(SEVERITY_RANK[state.severity] - SEVERITY_RANK[scenario.expectedSeverity])
  checks.push(
    check({
      id: 'ord-severity',
      dimension: 'investigation-order',
      label: 'Severity matched the impact',
      credit: diff === 0 ? 1 : diff === 1 ? 0.6 : 0.2,
      weight: 1.5,
      detail:
        diff === 0
          ? `You settled on ${state.severity.toUpperCase()}, which fits the impact.`
          : `You ended on ${state.severity.toUpperCase()}. Re-weigh customer and revenue impact when you learn more.`,
      skills: ['problem-clarification', 'prioritization'],
    }),
  )

  return checks
}

function evidenceGathering(ctx: Context): IncidentCheck[] {
  const { scenario, state, nodes } = ctx
  if (ctx.discoveryActions === 0) return []
  const checks: IncidentCheck[] = []

  const discoverable = discoverableEvidence(scenario)
  const key = discoverable.filter((n) => n.role === 'root-cause' || n.role === 'mechanism')
  const keyFound = key.filter((n) => state.revealedIds.has(n.id)).length
  checks.push(
    check({
      id: 'ev-key',
      dimension: 'evidence-gathering',
      label: 'Found the evidence that explains the failure',
      credit: key.length ? keyFound / key.length : 1,
      weight: 3,
      detail: `${keyFound} of ${key.length} key findings uncovered.`,
      skills: ['evidence-gathering', 'root-cause-reasoning'],
    }),
  )

  const channels = new Set<string>()
  for (const v of state.views) channels.add(v.channel)
  if (state.searches.length) channels.add('logs')
  const telemetryUsed = ['metrics', 'logs', 'traces'].filter((c) => channels.has(c)).length
  checks.push(
    check({
      id: 'ev-breadth',
      dimension: 'evidence-gathering',
      label: 'Used metrics, logs and traces',
      credit: telemetryUsed / 3,
      weight: 1,
      detail: `${telemetryUsed} of 3 telemetry types consulted.`,
      skills: ['evidence-gathering'],
    }),
  )

  const ruledOut = discoverable.filter((n) => n.role === 'ruled-out')
  const ruledOutFound = ruledOut.filter((n) => state.revealedIds.has(n.id)).length
  if (ruledOut.length > 0) {
    const target = Math.min(4, ruledOut.length)
    checks.push(
      check({
        id: 'ev-isolation',
        dimension: 'evidence-gathering',
        label: 'Ruled out plausible alternatives',
        credit: ruledOutFound / target,
        weight: 2,
        detail: `${ruledOutFound} alternative explanation${ruledOutFound === 1 ? '' : 's'} eliminated with evidence.`,
        skills: ['isolation', 'evidence-gathering'],
      }),
    )
  }

  const gated = scenario.impact.filter((f) => f.gatedBy)
  if (gated.length > 0) {
    const unlocked = gated.filter((f) => f.gatedBy && state.revealedIds.has(f.gatedBy)).length
    checks.push(
      check({
        id: 'ev-scope',
        dimension: 'evidence-gathering',
        label: 'Sized the impact and its scope',
        credit: unlocked / gated.length,
        weight: 1.5,
        detail: `${unlocked} of ${gated.length} impact questions answered.`,
        skills: ['scope-identification', 'problem-clarification'],
      }),
    )
  }

  if (state.applied.length > 0 && state.resolved) {
    const verification = [...nodes.values()].filter(
      (n) => n.phase === 'verification' && n.trigger.kind !== 'action',
    )
    const verified = verification.some((n) => state.revealedIds.has(n.id))
    checks.push(
      check({
        id: 'ev-verify',
        dimension: 'evidence-gathering',
        label: 'Verified recovery with data',
        credit: verified ? 1 : 0,
        weight: 1.5,
        detail: verified
          ? 'You confirmed recovery in the telemetry rather than assuming it.'
          : 'After the fix you did not re-check the telemetry. Confirm recovery before declaring it.',
        skills: ['evidence-gathering', 'mitigation'],
      }),
    )
  }

  return checks
}

function hypothesisQuality(ctx: Context): IncidentCheck[] {
  const { scenario, state, steps, nodes } = ctx
  const hypotheses = state.hypotheses
  if (hypotheses.length === 0) return []
  const checks: IncidentCheck[] = []

  const firstRemediationAt = steps.find((s) => s.event.type === 'remediation')?.index ?? Infinity
  const firstHypothesisAt = steps.find((s) => s.event.type === 'hypothesis-add')?.index ?? Infinity
  checks.push(
    check({
      id: 'hyp-timing',
      dimension: 'hypothesis',
      label: 'Formed a hypothesis before acting',
      credit: firstHypothesisAt < firstRemediationAt ? 1 : 0.3,
      weight: 1,
      detail:
        firstHypothesisAt < firstRemediationAt
          ? 'You wrote down a theory before changing anything.'
          : 'You changed production before you had a recorded hypothesis.',
      skills: ['hypothesis-formation', 'prioritization'],
    }),
  )

  checks.push(
    check({
      id: 'hyp-alternatives',
      dimension: 'hypothesis',
      label: 'Kept competing explanations alive',
      credit: hypotheses.length / 3,
      weight: 1.5,
      detail: `${hypotheses.length} hypothes${hypotheses.length === 1 ? 'is' : 'es'} recorded. Three or more competing ideas show you are not anchoring.`,
      skills: ['hypothesis-formation', 'isolation'],
    }),
  )

  const linked = hypotheses.filter((h) => h.links.length > 0).length
  checks.push(
    check({
      id: 'hyp-linked',
      dimension: 'hypothesis',
      label: 'Tied hypotheses to evidence',
      credit: linked / hypotheses.length,
      weight: 2,
      detail: `${linked} of ${hypotheses.length} hypotheses cite evidence.`,
      skills: ['hypothesis-formation', 'evidence-gathering'],
    }),
  )

  let right = 0
  let wrong = 0
  for (const h of hypotheses) {
    if (!h.specId) continue
    for (const link of h.links) {
      const bears = nodes.get(link.evidenceId)?.bearsOn
      const supports = bears?.supports?.includes(h.specId) ?? false
      const refutes = bears?.refutes?.includes(h.specId) ?? false
      if (!supports && !refutes) continue
      if ((link.relation === 'supports' && supports) || (link.relation === 'refutes' && refutes))
        right++
      else wrong++
    }
  }
  if (right + wrong > 0) {
    checks.push(
      check({
        id: 'hyp-direction',
        dimension: 'hypothesis',
        label: 'Read the evidence in the right direction',
        credit: right / (right + wrong),
        weight: 2,
        detail: `${right} of ${right + wrong} evidence links supported or refuted the hypothesis correctly.`,
        skills: ['hypothesis-formation', 'root-cause-reasoning'],
      }),
    )
  }

  let judged = 0
  let judgedRight = 0
  for (const h of hypotheses) {
    if (!h.specId || h.status === 'testing') continue
    const verdict = scenario.hypotheses.find((s) => s.id === h.specId)?.verdict
    if (!verdict) continue
    judged++
    const real = verdict === 'root-cause' || verdict === 'mechanism' || verdict === 'contributing'
    if ((h.status === 'confirmed' && real) || (h.status === 'ruled-out' && !real)) judgedRight++
  }
  if (judged > 0) {
    checks.push(
      check({
        id: 'hyp-conclusions',
        dimension: 'hypothesis',
        label: 'Confirmed and eliminated the right things',
        credit: judgedRight / judged,
        weight: 2,
        detail: `${judgedRight} of ${judged} conclusions you drew were sound.`,
        skills: ['root-cause-reasoning', 'isolation'],
      }),
    )
  }

  const rootSpec = scenario.hypotheses.find((h) => h.verdict === 'root-cause')
  const rootHypothesis = rootSpec ? hypotheses.find((h) => h.specId === rootSpec.id) : undefined
  const supported = rootHypothesis?.links.some((l) => l.relation === 'supports') ?? false
  const ruledOutByCandidate = rootHypothesis?.status === 'ruled-out'
  checks.push(
    check({
      id: 'hyp-root',
      dimension: 'hypothesis',
      label: 'Considered the true cause with evidence behind it',
      credit: !rootHypothesis || ruledOutByCandidate ? 0 : supported ? 1 : 0.5,
      weight: 3,
      detail: !rootHypothesis
        ? 'None of your hypotheses pointed at the part of the system that actually failed.'
        : ruledOutByCandidate
          ? 'You ruled out a hypothesis that the evidence does not eliminate.'
          : supported
            ? 'One of your hypotheses pointed at the right place and cited supporting evidence.'
            : 'One of your hypotheses pointed at the right place but cited no supporting evidence.',
      skills: ['root-cause-reasoning', 'hypothesis-formation'],
    }),
  )

  return checks
}

function rootCause(ctx: Context): IncidentCheck[] {
  const { scenario, state } = ctx
  if (!state.rca) return []
  const draft = state.rca.draft
  const spec = scenario.rootCause
  const checks: IncidentCheck[] = []

  const match = draft.category
    ? findHypothesisSpec(scenario, draft.category, draft.serviceId)
    : undefined
  const verdictCredit = {
    'root-cause': 1,
    mechanism: 0.5,
    contributing: 0.3,
    symptom: 0,
    'ruled-out': 0,
  } as const
  checks.push(
    check({
      id: 'rca-diagnosis',
      dimension: 'root-cause',
      label: 'Identified the originating fault',
      credit: match ? verdictCredit[match.verdict] : 0,
      weight: 4,
      detail: !match
        ? 'The category and service you chose do not describe the originating fault.'
        : match.verdict === 'root-cause'
          ? 'You identified the originating fault.'
          : match.verdict === 'mechanism' || match.verdict === 'contributing'
            ? 'You described how the failure unfolded, not what started it. Keep asking why.'
            : 'You named a symptom or a component that was not at fault.',
      skills: ['root-cause-reasoning'],
    }),
  )

  const cited = new Set(draft.evidenceIds.filter((id) => state.revealedIds.has(id)))
  const satisfied = spec.requiredEvidence.filter((group) =>
    group.some((id) => cited.has(id)),
  ).length
  checks.push(
    check({
      id: 'rca-evidence',
      dimension: 'root-cause',
      label: 'Backed the RCA with evidence',
      credit: spec.requiredEvidence.length ? satisfied / spec.requiredEvidence.length : 1,
      weight: 3,
      detail: `You cited evidence for ${satisfied} of ${spec.requiredEvidence.length} parts of a sound argument.`,
      skills: ['root-cause-reasoning', 'evidence-gathering'],
    }),
  )

  const text = `${draft.statement} ${draft.trigger} ${draft.contributing}`.toLowerCase()
  const covered = spec.concepts.filter((concept) =>
    concept.anyOf.some((term) => text.includes(term)),
  ).length
  checks.push(
    check({
      id: 'rca-concepts',
      dimension: 'root-cause',
      label: 'Explained the mechanism, not only the symptom',
      credit: spec.concepts.length ? covered / spec.concepts.length : 1,
      weight: 2,
      detail: `Your write-up covers ${covered} of ${spec.concepts.length} expected points. Keyword matching is a coarse signal; reviewers should read it.`,
      skills: ['root-cause-reasoning', 'communication'],
    }),
  )

  const structure =
    (draft.statement.trim().length >= 40 ? 0.5 : draft.statement.trim() ? 0.2 : 0) +
    (draft.trigger.trim() ? 0.25 : 0) +
    (draft.contributing.trim() ? 0.25 : 0)
  checks.push(
    check({
      id: 'rca-structure',
      dimension: 'root-cause',
      label: 'Separated trigger from contributing factors',
      credit: structure,
      weight: 1,
      detail:
        structure >= 1
          ? 'Your RCA states the cause, the trigger and what made it worse.'
          : 'A strong RCA states the cause, the trigger, and the conditions that let it become an outage.',
      skills: ['root-cause-reasoning', 'communication'],
    }),
  )

  return checks
}

function justified(action: RemediationAction, before: ReadonlySet<string>): boolean {
  return action.evidenceBasis.some((id) => before.has(id))
}

function mitigation(ctx: Context): IncidentCheck[] {
  const { scenario, state, steps } = ctx
  if (state.applied.length === 0) return []
  const checks: IncidentCheck[] = []

  const actions = state.applied
    .map((a) => scenario.remediation.find((r) => r.id === a.actionId))
    .filter((a): a is RemediationAction => Boolean(a))

  const bestUnresolved = Math.max(...actions.map((a) => OUTCOME_CREDIT[a.outcome]))
  checks.push(
    check({
      id: 'mit-outcome',
      dimension: 'mitigation',
      label: 'Stopped the impact',
      credit: state.resolved ? 1 : bestUnresolved,
      weight: 4,
      detail: state.resolved
        ? 'Your mitigation restored service.'
        : 'Nothing you applied restored service. A stop-gap that relapses is not a resolution.',
      skills: ['mitigation'],
    }),
  )

  const remediationSteps = steps.filter((s) => s.event.type === 'remediation')
  let justifiedCount = 0
  for (const step of remediationSteps) {
    if (step.event.type !== 'remediation') continue
    const action = scenario.remediation.find(
      (a) => a.id === (step.event as { actionId: string }).actionId,
    )
    if (action && justified(action, step.before)) justifiedCount++
  }
  checks.push(
    check({
      id: 'mit-justified',
      dimension: 'mitigation',
      label: 'Every change was backed by evidence',
      credit: remediationSteps.length ? justifiedCount / remediationSteps.length : 1,
      weight: 3,
      detail: `${justifiedCount} of ${remediationSteps.length} changes were made after you had evidence pointing to them.`,
      skills: ['mitigation', 'evidence-gathering', 'prioritization'],
    }),
  )

  const worsened = actions.filter((a) => a.outcome === 'worsens').length
  checks.push(
    check({
      id: 'mit-harm',
      dimension: 'mitigation',
      label: 'Avoided making it worse',
      credit: 1 - worsened * 0.5,
      weight: 2,
      detail:
        worsened === 0
          ? 'None of your actions made the incident worse.'
          : `${worsened} action${worsened === 1 ? '' : 's'} made the incident worse. Prefer reversible, low-risk changes you can justify.`,
      skills: ['mitigation', 'prioritization'],
    }),
  )

  if (state.resolved && state.resolvedAt !== null) {
    const fraction = state.resolvedAt / (scenario.timeboxMinutes * 60)
    const speed = fraction <= 0.5 ? 1 : fraction >= 1 ? 0.3 : 1 - ((fraction - 0.5) / 0.5) * 0.7
    checks.push(
      check({
        id: 'mit-speed',
        dimension: 'mitigation',
        label: 'Restored service in good time',
        credit: speed,
        weight: 1,
        detail: `Recovered ${Math.round(fraction * 100)}% of the way through the time-box.`,
        skills: ['prioritization', 'mitigation'],
      }),
    )
    const resolving = actions.find((a) => a.outcome === 'resolves')
    if (resolving) {
      checks.push(
        check({
          id: 'mit-risk',
          dimension: 'mitigation',
          label: 'Chose a low-risk, reversible fix',
          credit: RISK_CREDIT[resolving.risk],
          weight: 1,
          detail: `The fix you used carries ${resolving.risk} risk.`,
          skills: ['mitigation'],
        }),
      )
    }
  }

  return checks
}

function prevention(ctx: Context): IncidentCheck[] {
  const { scenario, state } = ctx
  const submitted = state.prevention
  if (!submitted || (submitted.optionIds.length === 0 && !submitted.notes.trim())) return []
  const chosen = scenario.prevention.filter((p) => submitted.optionIds.includes(p.id))
  const checks: IncidentCheck[] = []

  const points = chosen.reduce((sum, p) => sum + PREVENTION_POINTS[p.quality], 0)
  const strong = chosen.filter((p) => p.quality === 'strong').length
  const bad = chosen.filter((p) => p.quality === 'counterproductive' || p.quality === 'weak').length
  checks.push(
    check({
      id: 'prev-quality',
      dimension: 'prevention',
      label: 'Chose effective follow-ups',
      credit: points / 3,
      weight: 4,
      detail: `${strong} strong follow-up${strong === 1 ? '' : 's'} chosen${bad ? `; ${bad} weak or counterproductive` : ''}.`,
      skills: ['prevention'],
    }),
  )

  const kinds = new Set(
    chosen.filter((p) => p.quality === 'strong' || p.quality === 'acceptable').map((p) => p.kind),
  )
  checks.push(
    check({
      id: 'prev-coverage',
      dimension: 'prevention',
      label: 'Covered detect, prevent and respond',
      credit: kinds.size / 3,
      weight: 2,
      detail: `${kinds.size} of 3 kinds of follow-up covered (detect, prevent, respond or process).`,
      skills: ['prevention'],
    }),
  )

  const notes = submitted.notes.trim()
  checks.push(
    check({
      id: 'prev-reasoning',
      dimension: 'prevention',
      label: 'Explained why',
      credit: notes.length >= 60 ? 1 : notes.length >= 20 ? 0.6 : notes ? 0.3 : 0,
      weight: 1,
      detail: notes
        ? 'You explained your reasoning.'
        : 'Say why these follow-ups would have prevented or shortened this incident.',
      skills: ['prevention', 'communication'],
    }),
  )

  return checks
}

function communication(ctx: Context): IncidentCheck[] {
  const { scenario, state } = ctx
  if (state.messages.length === 0) return []
  const spec = scenario.communication
  const checks: IncidentCheck[] = []

  const first = state.messages[0]!.at
  checks.push(
    check({
      id: 'comm-first-update',
      dimension: 'communication',
      label: 'Sent a first update promptly',
      credit:
        first <= spec.firstUpdateWithinSeconds
          ? 1
          : first <= spec.firstUpdateWithinSeconds * 2
            ? 0.5
            : 0.2,
      weight: 2,
      detail: `First update after ${Math.round(first / 60)} min (target ${Math.round(spec.firstUpdateWithinSeconds / 60)}).`,
      skills: ['communication', 'prioritization'],
    }),
  )

  const audiences = new Set(state.messages.map((m) => m.message.audience))
  const reached = spec.requiredAudiences.filter((a) => audiences.has(a)).length
  checks.push(
    check({
      id: 'comm-audiences',
      dimension: 'communication',
      label: 'Reached engineering, leadership and customers',
      credit: reached / spec.requiredAudiences.length,
      weight: 3,
      detail: `${reached} of ${spec.requiredAudiences.length} audiences updated.`,
      skills: ['communication', 'scope-identification'],
    }),
  )

  const end = state.submittedAt ?? ctx.elapsedSeconds
  const times = [
    ...state.messages.map((m) => m.at),
    Math.max(end, state.messages[state.messages.length - 1]!.at),
  ]
  let maxGap = 0
  for (let i = 1; i < times.length; i++) maxGap = Math.max(maxGap, times[i]! - times[i - 1]!)
  checks.push(
    check({
      id: 'comm-cadence',
      dimension: 'communication',
      label: 'Kept stakeholders updated on a cadence',
      credit:
        maxGap <= spec.cadenceSeconds
          ? 1
          : 1 - (maxGap - spec.cadenceSeconds) / spec.cadenceSeconds,
      weight: 1.5,
      detail: `Longest gap between updates: ${Math.round(maxGap / 60)} min (target ${Math.round(spec.cadenceSeconds / 60)}).`,
      skills: ['communication'],
    }),
  )

  const complete = state.messages.filter((m) => {
    const { impact, status, kind, nextUpdateMinutes } = m.message
    const needsNext = kind === 'acknowledge' || kind === 'status'
    return impact.trim() && status.trim() && (!needsNext || nextUpdateMinutes !== null)
  }).length
  checks.push(
    check({
      id: 'comm-content',
      dimension: 'communication',
      label: 'Updates stated impact, status and next update',
      credit: complete / state.messages.length,
      weight: 2,
      detail: `${complete} of ${state.messages.length} updates were complete.`,
      skills: ['communication'],
    }),
  )

  const customerText = state.messages
    .filter((m) => m.message.audience === 'customers')
    .map((m) => `${m.message.impact} ${m.message.status}`.toLowerCase())
    .join(' ')
  if (customerText.trim()) {
    const leaked = spec.internalTerms.filter((term) => customerText.includes(term)).length
    checks.push(
      check({
        id: 'comm-customer-clarity',
        dimension: 'communication',
        label: 'Customer update avoided internal jargon',
        credit: 1 - leaked / 3,
        weight: 2,
        detail:
          leaked === 0
            ? 'Your customer message is in plain language.'
            : `Your customer message uses ${leaked} internal term${leaked === 1 ? '' : 's'}. Describe the effect, not the infrastructure.`,
        skills: ['communication'],
      }),
    )
  }

  if (state.resolved && state.resolvedAt !== null) {
    const closed = state.messages.some(
      (m) =>
        (m.message.kind === 'mitigated' || m.message.kind === 'resolved') &&
        m.at >= state.resolvedAt!,
    )
    checks.push(
      check({
        id: 'comm-closed',
        dimension: 'communication',
        label: 'Told people when it was fixed',
        credit: closed ? 1 : 0,
        weight: 1.5,
        detail: closed
          ? 'You announced the mitigation.'
          : 'Service recovered but no mitigated or resolved update followed.',
        skills: ['communication'],
      }),
    )
  }

  return checks
}

/* ------------------------------------------------------------ aggregate ---- */

function weightedScore(checks: IncidentCheck[]): number | null {
  if (checks.length === 0) return null
  const total = checks.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return null
  return pct(checks.reduce((sum, c) => sum + c.credit * c.weight, 0) / total)
}

export function evaluateSession(
  scenario: IncidentScenario,
  events: SessionEvent[],
  elapsedSeconds = 0,
): IncidentEvaluation {
  const steps: ReplayStep[] = []
  const state = replay(scenario, events, (step) => steps.push(step))

  let discovery = 0
  const discoveryAt = steps.map((step) => {
    if (isDiscovery(scenario, step.event)) discovery++
    return discovery
  })

  const ctx: Context = {
    scenario,
    events,
    state,
    steps,
    nodes: new Map(scenario.evidence.map((n) => [n.id, n])),
    discoveryAt,
    discoveryActions: discovery,
    elapsedSeconds: Math.max(elapsedSeconds, state.lastEventAt),
  }

  const byDimension: Record<IncidentDimensionId, IncidentCheck[]> = {
    'investigation-order': investigationOrder(ctx),
    'evidence-gathering': evidenceGathering(ctx),
    hypothesis: hypothesisQuality(ctx),
    'root-cause': rootCause(ctx),
    mitigation: mitigation(ctx),
    prevention: prevention(ctx),
    communication: communication(ctx),
  }

  const dimensions: IncidentDimensionResult[] = (
    Object.keys(byDimension) as IncidentDimensionId[]
  ).map((id) => ({
    id,
    label: DIMENSION_LABELS[id],
    score: weightedScore(byDimension[id]),
    checks: byDimension[id],
  }))

  const attempted = dimensions.filter((d) => d.score !== null)
  const weightSum = attempted.reduce((sum, d) => sum + DIMENSION_WEIGHTS[d.id], 0)
  const overall =
    attempted.length === 0
      ? null
      : Math.round(
          attempted.reduce((sum, d) => sum + (d.score as number) * DIMENSION_WEIGHTS[d.id], 0) /
            weightSum,
        )

  const allChecks = dimensions.flatMap((d) => d.checks)
  const skills: TroubleshootingSkillResult[] = (
    Object.keys(SKILL_LABELS) as TroubleshootingSkillId[]
  ).map((id) => ({
    id,
    label: SKILL_LABELS[id],
    score: weightedScore(allChecks.filter((c) => c.skills.includes(id))),
  }))

  const discoverable = discoverableEvidence(scenario)
  const key = discoverable.filter((n) => n.role === 'root-cause' || n.role === 'mechanism')

  return {
    overall,
    complete: attempted.length === dimensions.length,
    dimensions,
    skills,
    stats: {
      evidenceFound: discoverable.filter((n) => state.revealedIds.has(n.id)).length,
      evidenceTotal: discoverable.length,
      keyEvidenceFound: key.filter((n) => state.revealedIds.has(n.id)).length,
      keyEvidenceTotal: key.length,
      discoveryActions: discovery,
      elapsedSeconds: ctx.elapsedSeconds,
      resolved: state.resolved,
      resolvedAtSeconds: state.resolvedAt,
    },
  }
}
