import type {
  FactorReport,
  ModuleKey,
  ReadinessAction,
  ReadinessEvidence,
  ReadinessFactorId,
} from '@opsforge/types'
import { FACTORS, LIVE_MODULES, PROJECTION_SCORE } from './config'
import { round, weightedScore } from './scoring'

export function pickModule(factor: ReadinessFactorId): { module: ModuleKey; available: boolean } {
  const modules = FACTORS[factor].modules
  const live = modules.find((m) => LIVE_MODULES.includes(m))
  return live ? { module: live, available: true } : { module: modules[0]!, available: false }
}

/** Score after one more result of `PROJECTION_SCORE`, using the same weights as the engine. */
function project(items: ReadinessEvidence[], now: number): ReadinessAction['projection'] {
  const current = weightedScore(items, now)
  const sum = (current?.score ?? 0) * (current?.totalWeight ?? 0) + PROJECTION_SCORE
  const total = (current?.totalWeight ?? 0) + 1
  return { from: current ? round(current.score) : null, to: round(sum / total) }
}

export function actionFor(
  factor: ReadinessFactorId,
  items: ReadinessEvidence[],
  now: number,
  title: string,
  why: string,
): ReadinessAction {
  const cfg = FACTORS[factor]
  const { module, available } = pickModule(factor)
  return {
    id: `action:${factor}`,
    title,
    why,
    module,
    available,
    minutes: cfg.minutes,
    projection: project(items, now),
  }
}

/** The single most useful thing to do for one factor, chosen by fixed rules. */
export function nextActionFor(
  factor: ReadinessFactorId,
  report: Pick<
    FactorReport,
    'score' | 'target' | 'evidenceCount' | 'evidenceConfidence' | 'weaknesses'
  >,
  items: ReadinessEvidence[],
  now: number,
): ReadinessAction {
  const cfg = FACTORS[factor]
  const label = cfg.label.toLowerCase()
  const weakest = report.weaknesses[0]

  if (report.score === null) {
    return actionFor(
      factor,
      items,
      now,
      `Create the first ${label} evidence`,
      `Nothing has been scored for ${label}, so it is not part of your readiness yet. ${cfg.practice}.`,
    )
  }
  if (weakest && report.score < report.target) {
    return actionFor(
      factor,
      items,
      now,
      `Fix the weakest ${label} topic`,
      `${weakest.text}. ${cfg.practice}.`,
    )
  }
  if (report.evidenceConfidence === 'low') {
    return actionFor(
      factor,
      items,
      now,
      `Add more ${label} evidence`,
      `Only ${report.evidenceCount} ${report.evidenceCount === 1 ? 'item stands' : 'items stand'} behind a score of ${report.score}; one more result could move it a lot. ${cfg.practice}.`,
    )
  }
  if (report.score < report.target) {
    return actionFor(
      factor,
      items,
      now,
      `Close the ${report.target - report.score}-point ${label} gap`,
      `${report.score} against a senior target of ${report.target}. ${cfg.practice}.`,
    )
  }
  return actionFor(
    factor,
    items,
    now,
    `Keep ${label} fresh`,
    `At or above the senior target of ${report.target}. Evidence loses half its weight every 30 days, so repeat it before it ages.`,
  )
}

/** How much a factor's action is worth doing now. Zero means nothing useful to do. */
export function actionPriority(
  factor: ReadinessFactorId,
  report: Pick<FactorReport, 'score' | 'target' | 'evidenceConfidence'>,
  available: boolean,
): number {
  const weight = FACTORS[factor].weight
  let gap: number
  if (report.score === null) gap = 1
  else gap = Math.max(0, (report.target - report.score) / report.target)
  if (report.evidenceConfidence === 'low') gap = Math.max(gap, 0.25)
  const reach = available ? 1 : 0.25
  return weight * gap * reach
}
