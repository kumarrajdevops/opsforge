import type {
  ArchitectureProgress,
  CommandCenterSnapshot,
  ContinueItem,
  DimensionScore,
  EvidenceEvent,
  EvidenceOrigin,
  FailureRisk,
  IncidentRecord,
  ReadinessAction,
  ReadinessEvidence,
  ReadinessFactorId,
  ReadinessReport,
  RecommendedAction,
  SkillCell,
  SkillModeId,
  SkillRow,
  WeakSkill,
} from '@opsforge/types'
import { CRITICAL_WEAK_SCORE, FACTORS, ORIGINS, WEAK_SCORE } from '../readiness/config'
import { bandFor, normalizeEvidence, round, weightedScore } from '../readiness/scoring'

/*
 * Pure view of a ReadinessReport for the Command Center. Every number here is taken from the
 * report or computed with the engine's own scoring functions; nothing is invented, and a factor
 * or skill without evidence stays null rather than becoming zero.
 */

export const SKILL_MODES: { id: SkillModeId; label: string }[] = [
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'hands-on', label: 'Hands-on' },
  { id: 'troubleshooting', label: 'Troubleshoot' },
  { id: 'interview', label: 'Interview' },
]

const MODE_OF: Record<EvidenceOrigin, SkillModeId> = {
  knowledge: 'knowledge',
  question: 'knowledge',
  flashcard: 'knowledge',
  lab: 'hands-on',
  architecture: 'hands-on',
  incident: 'troubleshooting',
  interview: 'interview',
  'resume-drill': 'interview',
}

const MAX_RISKS = 3
const MAX_SKILLS = 8
const MAX_WEAK_SKILLS = 4
const MAX_PLAN = 4
const MAX_CONTINUE = 4
const MAX_EVIDENCE = 8
const MAX_INCIDENTS = 4

export interface CommandCenterInput {
  report: ReadinessReport
  evidence: ReadinessEvidence[]
  /** Number of architecture scenarios that exist, so progress can be shown as a fraction. */
  architectureScenarioTotal: number
  now: number
}

const byRecent = (a: ReadinessEvidence, b: ReadinessEvidence) => b.at.localeCompare(a.at)

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length
}

function outcomeOf(score: number): EvidenceEvent['outcome'] {
  const band = bandFor(score)
  if (band === 'strong' || band === 'solid') return 'pass'
  return band === 'developing' ? 'partial' : 'fail'
}

function incidentOutcomeOf(score: number): IncidentRecord['outcome'] {
  const outcome = outcomeOf(score)
  return outcome === 'pass' ? 'resolved' : outcome === 'partial' ? 'partial' : 'failed'
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const k = key(item)
    const group = groups.get(k)
    if (group) group.push(item)
    else groups.set(k, [item])
  }
  return groups
}

function dimensionsOf(report: ReadinessReport): DimensionScore[] {
  return report.factors.map((f) => ({
    id: f.id,
    label: f.label,
    score: f.score === null ? null : round(f.score),
    band: f.band,
    target: f.target,
    evidenceCount: f.evidenceCount,
    confidence: f.evidenceConfidence,
    delta: f.trend.delta === null ? null : round(f.trend.delta),
  }))
}

function likelihoodOf(score: number): FailureRisk['likelihood'] {
  if (score < CRITICAL_WEAK_SCORE) return 'high'
  return score < WEAK_SCORE ? 'medium' : 'low'
}

function risksOf(report: ReadinessReport): FailureRisk[] {
  return report.factors
    .filter((f) => f.score !== null && f.score < f.target)
    .sort((a, b) => b.target - b.score! - (a.target - a.score!))
    .slice(0, MAX_RISKS)
    .map((f) => {
      const score = round(f.score!)
      const weakness = f.weaknesses[0]
      return {
        id: `risk:${f.id}`,
        title: `${f.label} may not hold up`,
        reason: weakness
          ? `${weakness.text} Scored ${score} against a target of ${f.target}.`
          : `Scored ${score} against a target of ${f.target}.`,
        likelihood: likelihoodOf(f.score!),
        dimension: f.id,
        evidenceCount: f.evidenceCount,
        action: {
          label: f.nextAction.title,
          module: f.nextAction.module,
          available: f.nextAction.available,
        },
      }
    })
}

function skillsOf(
  evidence: ReadinessEvidence[],
  target: number,
  now: number,
): { rows: SkillRow[]; weak: WeakSkill[] } {
  const topics = groupBy(
    evidence.filter((e) => e.topic),
    (e) => e.topic!,
  )
  const rows: (SkillRow & { items: ReadinessEvidence[] })[] = []
  for (const [topic, items] of topics) {
    const overall = weightedScore(items, now)
    if (!overall) continue
    const cells: SkillCell[] = SKILL_MODES.map(({ id }) => {
      const scored = weightedScore(
        items.filter((i) => MODE_OF[i.origin] === id),
        now,
      )
      return {
        mode: id,
        score: scored ? round(scored.score) : null,
        band: scored ? bandFor(scored.score) : null,
      }
    })
    rows.push({
      id: `skill:${topic}`,
      label: topic,
      overall: round(overall.score),
      band: bandFor(overall.score),
      target,
      evidenceCount: items.length,
      cells,
      items,
    })
  }
  rows.sort((a, b) => b.evidenceCount - a.evidenceCount || a.label.localeCompare(b.label))
  const shown = rows.slice(0, MAX_SKILLS)

  const weak: WeakSkill[] = rows
    .filter((r) => r.overall < r.target)
    .sort((a, b) => b.target - b.overall - (a.target - a.overall) || a.label.localeCompare(b.label))
    .slice(0, MAX_WEAK_SKILLS)
    .map((r) => {
      const lowest = [...r.items].sort((a, b) => a.score - b.score)[0]!
      const gap = r.items.flatMap((i) => i.gaps ?? [])[0]
      const origin = ORIGINS[lowest.origin]
      return {
        skillId: r.id,
        label: r.label,
        score: r.overall,
        target: r.target,
        band: r.band,
        reason: gap ?? `Scored ${r.overall} against a target of ${r.target}.`,
        action: { label: `Practise in ${origin.label}`, module: origin.module },
      }
    })

  return {
    rows: shown.map((r) => ({
      id: r.id,
      label: r.label,
      overall: r.overall,
      band: r.band,
      target: r.target,
      evidenceCount: r.evidenceCount,
      cells: r.cells,
    })),
    weak,
  }
}

function continueOf(evidence: ReadinessEvidence[]): ContinueItem[] {
  const latestByOrigin: ContinueItem[] = []
  for (const [origin, items] of groupBy(evidence, (e) => e.origin)) {
    const newest = [...items].sort(byRecent)[0]!
    const attempt = items.filter((i) => i.attemptId === newest.attemptId)
    latestByOrigin.push({
      id: `continue:${newest.attemptId}`,
      title: newest.label,
      detail:
        attempt.flatMap((i) => i.gaps ?? [])[0] ??
        newest.topic ??
        ORIGINS[origin as EvidenceOrigin].label,
      score: round(mean(attempt.map((i) => i.score))),
      lastActive: newest.at,
      module: ORIGINS[origin as EvidenceOrigin].module,
    })
  }
  return latestByOrigin
    .sort((a, b) => b.lastActive.localeCompare(a.lastActive))
    .slice(0, MAX_CONTINUE)
}

function recentEvidenceOf(evidence: ReadinessEvidence[], report: ReadinessReport): EvidenceEvent[] {
  return [...evidence]
    .sort(byRecent)
    .slice(0, MAX_EVIDENCE)
    .map((e) => {
      const factor = report.factors.find((f) => f.id === e.factor)
      const share = factor?.contributions.find((c) => c.evidenceId === e.id)?.share ?? 0
      return {
        id: e.id,
        at: e.at,
        source: ORIGINS[e.origin].label,
        subject: e.label,
        outcome: outcomeOf(e.score),
        score: round(e.score),
        dimension: e.factor,
        share,
        note: e.gaps?.[0] ?? e.topic ?? 'No gaps recorded.',
      }
    })
}

function incidentsOf(evidence: ReadinessEvidence[]): IncidentRecord[] {
  const attempts = groupBy(
    evidence.filter((e) => e.origin === 'incident'),
    (e) => e.attemptId,
  )
  return [...attempts.values()]
    .map((items) => {
      const newest = [...items].sort(byRecent)[0]!
      const score = round(mean(items.map((i) => i.score)))
      return {
        id: newest.attemptId,
        title: newest.topic ?? newest.label,
        outcome: incidentOutcomeOf(score),
        score,
        at: newest.at,
      }
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_INCIDENTS)
}

function architectureOf(evidence: ReadinessEvidence[], total: number): ArchitectureProgress {
  const attempts = groupBy(
    evidence.filter((e) => e.origin === 'architecture'),
    (e) => e.attemptId,
  )
  const scenarios = new Set(
    [...attempts.values()].map((items) => items[0]!.topic ?? items[0]!.attemptId),
  )
  const newestAt = (items: ReadinessEvidence[]) => [...items].sort(byRecent)[0]!.at
  const newestItems = [...attempts.values()].sort((a, b) =>
    newestAt(b).localeCompare(newestAt(a)),
  )[0]
  if (!newestItems) {
    return { scenariosCompleted: 0, scenariosTotal: total, latest: null }
  }
  const score = round(mean(newestItems.map((i) => i.score)))
  const first = newestItems[0]!
  return {
    scenariosCompleted: scenarios.size,
    scenariosTotal: total,
    latest: {
      title: first.topic ?? first.label,
      score,
      band: bandFor(score),
      gaps: [...new Set(newestItems.flatMap((i) => i.gaps ?? []))].slice(0, 5),
    },
  }
}

function impactOf(action: ReadinessAction): string | null {
  if (!action.projection) return null
  const label = action.id.startsWith('action:')
    ? (FACTORS[action.id.slice('action:'.length) as ReadinessFactorId]?.label ?? 'Score')
    : 'Score'
  const from = action.projection.from === null ? 'no score' : String(action.projection.from)
  return `A strong result moves ${label}: ${from} → ${action.projection.to}`
}

function nextActionOf(report: ReadinessReport): RecommendedAction | null {
  const top = report.nextActions[0]
  if (!top) return null
  return {
    title: top.title,
    why: top.why,
    estimatedMinutes: top.minutes,
    expectedImpact: impactOf(top),
    module: top.module,
    available: top.available,
  }
}

export function buildCommandCenter(input: CommandCenterInput): CommandCenterSnapshot {
  const { report, architectureScenarioTotal, now } = input
  const evidence = normalizeEvidence(input.evidence)
  const { rows, weak } = skillsOf(evidence, report.overall.target, now)

  const planActions = report.nextActions.slice(0, MAX_PLAN)
  const nextGate = report.level.next

  return {
    generatedAt: report.generatedAt,
    evidenceTotal: report.evidenceCount,
    overall: {
      score: report.overall.score === null ? null : round(report.overall.score),
      band: report.overall.band,
      target: report.overall.target,
      coverage: report.overall.coverage,
      confidence: report.overall.evidenceConfidence,
      confidenceReason: report.overall.confidenceReason,
      direction: report.overall.trend.direction,
      delta: report.overall.trend.delta === null ? null : round(report.overall.trend.delta),
      level: {
        value: report.level.value,
        label: report.level.label,
        reason: report.level.reason,
        next: nextGate
          ? {
              label: nextGate.label,
              requirements: nextGate.checks
                .filter((c) => !c.passed)
                .map((c) => `${c.label}: ${c.current} (needs ${c.required})`),
            }
          : null,
      },
      trend: report.overall.trend.points.map((p) => ({ date: p.at, score: round(p.score) })),
    },
    dimensions: dimensionsOf(report),
    failureRisks: risksOf(report),
    skillModes: SKILL_MODES,
    skills: rows,
    weakestSkills: weak,
    plan: {
      totalMinutes: planActions.reduce((sum, a) => sum + a.minutes, 0),
      items: planActions.map((a, i) => ({
        id: a.id,
        title: a.title,
        minutes: a.minutes,
        reason: a.why,
        status: i === 0 ? 'next' : 'todo',
        module: a.module,
        available: a.available,
      })),
    },
    continueTraining: continueOf(evidence),
    recentEvidence: recentEvidenceOf(evidence, report),
    recentIncidents: incidentsOf(evidence),
    architecture: architectureOf(evidence, architectureScenarioTotal),
    nextAction: nextActionOf(report),
  }
}
