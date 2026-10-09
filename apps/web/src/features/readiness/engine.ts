import type {
  FactorReport,
  OverallReadiness,
  ReadinessAction,
  ReadinessEvidence,
  ReadinessFactorId,
  ReadinessReport,
} from '@opsforge/types'
import { actionPriority, nextActionFor, pickModule } from './actions'
import { calibrate } from './calibration'
import {
  CONFIG_VERSION,
  ENGINE_VERSION,
  FACTORS,
  FACTOR_ORDER,
  TOTAL_FACTOR_WEIGHT,
} from './config'
import { computeLevel } from './levels'
import {
  bandFor,
  confidenceOf,
  contributionsOf,
  dayOf,
  normalizeEvidence,
  round,
  trendOf,
  weaknessesOf,
  weightedScore,
} from './scoring'

export interface ReadinessOptions {
  /** Injected so a report is reproducible. */
  now?: Date
}

const OVERALL_TARGET = round(
  FACTOR_ORDER.reduce((sum, id) => sum + FACTORS[id].target * FACTORS[id].weight, 0) /
    TOTAL_FACTOR_WEIGHT,
)

function group(items: ReadinessEvidence[]): Map<ReadinessFactorId, ReadinessEvidence[]> {
  const map = new Map<ReadinessFactorId, ReadinessEvidence[]>()
  for (const id of FACTOR_ORDER) map.set(id, [])
  for (const item of items) map.get(item.factor)!.push(item)
  return map
}

/** Weighted mean of the factor scores that have evidence. Weights come from the config only. */
function overallScoreOf(items: ReadinessEvidence[], now: number): number | null {
  let sum = 0
  let weight = 0
  for (const [id, list] of group(items)) {
    const agg = weightedScore(list, now)
    if (!agg) continue
    sum += agg.score * FACTORS[id].weight
    weight += FACTORS[id].weight
  }
  return weight > 0 ? sum / weight : null
}

function fingerprintOf(items: ReadinessEvidence[]): string {
  const text = [CONFIG_VERSION, ...items.map((i) => `${i.id}:${Math.round(i.score)}`).sort()].join(
    '|',
  )
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function buildFactor(id: ReadinessFactorId, items: ReadinessEvidence[], now: number): FactorReport {
  const cfg = FACTORS[id]
  const agg = weightedScore(items, now)
  const score = agg ? round(agg.score) : null
  const confidence = confidenceOf(items, now)
  const weaknesses = weaknessesOf(items, now)
  if (items.length === 0) {
    const { available } = pickModule(id)
    weaknesses.push({
      id: `none:${id}`,
      severity: available ? 'medium' : 'low',
      text: available
        ? `No ${cfg.label.toLowerCase()} evidence yet; it is not counted in your readiness.`
        : `No ${cfg.label.toLowerCase()} evidence yet, and the module that produces it is not built.`,
      evidenceIds: [],
    })
  }
  const partial = {
    score,
    target: cfg.target,
    evidenceCount: items.length,
    evidenceConfidence: confidence.level,
    weaknesses,
  }
  return {
    id,
    label: cfg.label,
    score,
    band: score === null ? null : bandFor(score),
    target: cfg.target,
    evidenceCount: items.length,
    originCount: new Set(items.map((i) => i.origin)).size,
    evidenceConfidence: confidence.level,
    confidenceReason: confidence.reason,
    trend: trendOf(items, (visible, at) => {
      const a = weightedScore(visible, at)
      return a ? a.score : null
    }),
    contributions: contributionsOf(items, now),
    weaknesses,
    nextAction: nextActionFor(id, partial, items, now),
  }
}

function buildOverall(
  items: ReadinessEvidence[],
  factors: FactorReport[],
  now: number,
): OverallReadiness {
  const score = overallScoreOf(items, now)
  const evidencedWeight = factors
    .filter((f) => f.score !== null)
    .reduce((sum, f) => sum + FACTORS[f.id].weight, 0)
  const confidence = confidenceOf(items, now)
  return {
    score: score === null ? null : round(score),
    band: score === null ? null : bandFor(score),
    coverage: round(evidencedWeight / TOTAL_FACTOR_WEIGHT, 3),
    evidenceConfidence: confidence.level,
    confidenceReason: confidence.reason,
    trend: trendOf(items, overallScoreOf),
    target: OVERALL_TARGET,
  }
}

function rankActions(factors: FactorReport[], calibrationActions: ReadinessAction[]) {
  const scored = factors
    .map((f) => ({
      action: f.nextAction,
      priority: actionPriority(f.id, f, f.nextAction.available),
    }))
    .filter((x) => x.priority > 0)
  // A knowledge/confidence mismatch outranks routine gaps because it changes what to practise.
  const mismatch = calibrationActions.map((action) => ({ action, priority: 100 }))
  const merged = [...mismatch, ...scored].sort((a, b) => b.priority - a.priority)
  const seen = new Set<string>()
  const out: ReadinessAction[] = []
  for (const { action } of merged) {
    const key = `${action.module}:${action.title}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(action)
  }
  return out.slice(0, 4)
}

/**
 * Builds the full readiness report from evidence. Pure and deterministic: the same evidence, config
 * and clock always give the same report. It accepts evidence only; there is no input through which
 * a language model (or anything else) could set a score or a level.
 */
export function buildReadinessReport(
  input: ReadinessEvidence[],
  options: ReadinessOptions = {},
): ReadinessReport {
  const nowDate = options.now ?? new Date()
  const now = nowDate.getTime()
  const evidence = normalizeEvidence(input)
  const byFactor = group(evidence)

  const factors = FACTOR_ORDER.map((id) => buildFactor(id, byFactor.get(id)!, now))
  const overall = buildOverall(evidence, factors, now)
  const factor = (id: ReadinessFactorId) => factors.find((f) => f.id === id)!
  const calibration = calibrate(factor('knowledge'), factor('confidence'), evidence, now)

  const level = computeLevel({
    overall: overall.score,
    attempts: new Set(evidence.map((e) => e.attemptId)).size,
    days: new Set(evidence.map((e) => dayOf(e.at))).size,
    origins: new Set(evidence.map((e) => e.origin)).size,
    factorsWithEvidence: factors.filter((f) => f.score !== null).length,
    coverage: overall.coverage,
    confidence: overall.evidenceConfidence,
    factors,
  })

  return {
    engineVersion: ENGINE_VERSION,
    configVersion: CONFIG_VERSION,
    generatedAt: nowDate.toISOString(),
    evidenceCount: evidence.length,
    overall,
    level,
    factors,
    calibration,
    nextActions: rankActions(factors, calibration.actions),
    fingerprint: fingerprintOf(evidence),
  }
}
