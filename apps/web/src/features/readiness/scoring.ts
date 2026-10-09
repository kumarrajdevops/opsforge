import type {
  EvidenceConfidence,
  EvidenceContribution,
  ReadinessEvidence,
  ReadinessScoreBand,
  ReadinessTrend,
  ReadinessTrendPoint,
  ReadinessWeakness,
} from '@opsforge/types'
import {
  BANDS,
  BASIS_RELIABILITY,
  CONFIDENCE_RULES,
  CRITICAL_WEAK_SCORE,
  FACTORS,
  HALF_LIFE_DAYS,
  TOTAL_FACTOR_WEIGHT,
  TREND_RULES,
  WEAK_SCORE,
} from './config'

const DAY_MS = 86_400_000

export const clampScore = (value: number) => Math.min(100, Math.max(0, value))
export const round = (value: number, digits = 0) => {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export function bandFor(score: number): ReadinessScoreBand {
  return (BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1]!).band
}

export function dayOf(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

/** Drops anything that cannot be scored and clamps the rest. The engine never trusts its input. */
export function normalizeEvidence(items: ReadinessEvidence[]): ReadinessEvidence[] {
  const seen = new Set<string>()
  const out: ReadinessEvidence[] = []
  for (const item of items) {
    if (seen.has(item.id)) continue
    if (!Number.isFinite(item.score) || Number.isNaN(Date.parse(item.at))) continue
    if (!(item.factor in FACTORS)) continue
    seen.add(item.id)
    out.push({ ...item, score: clampScore(item.score) })
  }
  return out
}

/** Weight after recency decay, evidence basis and attempt reliability. */
export function weightOf(item: ReadinessEvidence, now: number): number {
  const ageDays = Math.max(0, (now - Date.parse(item.at)) / DAY_MS)
  const decay = 0.5 ** (ageDays / HALF_LIFE_DAYS)
  const reliability = Math.min(1, Math.max(0, item.reliability ?? 1))
  return decay * reliability * BASIS_RELIABILITY[item.basis]
}

export interface WeightedScore {
  score: number
  totalWeight: number
}

export function weightedScore(items: ReadinessEvidence[], now: number): WeightedScore | null {
  let sum = 0
  let total = 0
  for (const item of items) {
    const w = weightOf(item, now)
    sum += item.score * w
    total += w
  }
  return total > 0 ? { score: sum / total, totalWeight: total } : null
}

export function contributionsOf(items: ReadinessEvidence[], now: number): EvidenceContribution[] {
  const weights = items.map((item) => weightOf(item, now))
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return []
  return items
    .map((item, i) => {
      const share = weights[i]! / total
      return {
        evidenceId: item.id,
        label: item.label,
        origin: item.origin,
        at: item.at,
        score: round(item.score),
        weight: round(weights[i]!, 3),
        share: round(share, 4),
        points: round(item.score * share, 1),
      }
    })
    .sort((a, b) => b.share - a.share || b.at.localeCompare(a.at))
}

export function confidenceOf(
  items: ReadinessEvidence[],
  now: number,
): { level: EvidenceConfidence; reason: string } {
  const attempts = new Set(items.map((i) => i.attemptId)).size
  if (attempts === 0) {
    return { level: 'none', reason: 'No evidence yet, so there is nothing to score.' }
  }
  // One weight per attempt so a single answer that feeds several factors is not counted repeatedly.
  const perAttempt = new Map<string, number>()
  for (const item of items) {
    perAttempt.set(
      item.attemptId,
      Math.max(perAttempt.get(item.attemptId) ?? 0, weightOf(item, now)),
    )
  }
  const weight = [...perAttempt.values()].reduce((a, b) => a + b, 0)
  const days = new Set(items.map((i) => dayOf(i.at))).size
  const origins = new Set(items.map((i) => i.origin)).size
  const r = CONFIDENCE_RULES

  if (attempts < r.lowBelowItems || weight < r.lowBelowWeight) {
    const why =
      attempts < r.lowBelowItems
        ? `Only ${attempts} scored ${attempts === 1 ? 'attempt' : 'attempts'}; ${r.lowBelowItems} are needed before this is trusted.`
        : 'The evidence is old or low-reliability, so its combined weight is small.'
    return { level: 'low', reason: why }
  }
  if (
    attempts >= r.highItems &&
    weight >= r.highWeight &&
    days >= r.highDays &&
    origins >= r.highOrigins
  ) {
    return {
      level: 'high',
      reason: `${attempts} attempts across ${days} days and ${origins} modules.`,
    }
  }
  const missing: string[] = []
  if (attempts < r.highItems) missing.push(`${r.highItems - attempts} more attempts`)
  if (days < r.highDays) missing.push(`evidence from ${r.highDays - days} more days`)
  if (origins < r.highOrigins) missing.push('evidence from a second module')
  if (weight < r.highWeight && missing.length === 0) missing.push('more recent evidence')
  return { level: 'medium', reason: `High confidence needs ${missing.join(', ')}.` }
}

function dayEnd(day: string): number {
  return Date.parse(`${day}T23:59:59.999Z`)
}

/**
 * Replays the same scoring rules as of the end of each evidence day. Deterministic, so the trend
 * can be rebuilt from evidence alone and never depends on stored state.
 */
export function replayPoints(
  items: ReadinessEvidence[],
  scoreAt: (visible: ReadinessEvidence[], now: number) => number | null,
): ReadinessTrendPoint[] {
  const days = [...new Set(items.map((i) => dayOf(i.at)))].sort()
  const points: ReadinessTrendPoint[] = []
  for (const day of days) {
    const end = dayEnd(day)
    const visible = items.filter((i) => Date.parse(i.at) <= end)
    const score = scoreAt(visible, end)
    if (score !== null) points.push({ at: new Date(end).toISOString(), score: round(score) })
  }
  return points.slice(-TREND_RULES.maxPoints)
}

export function trendOf(
  items: ReadinessEvidence[],
  scoreAt: (visible: ReadinessEvidence[], now: number) => number | null,
): ReadinessTrend {
  const points = replayPoints(items, scoreAt)
  const sorted = [...items].sort((a, b) => a.at.localeCompare(b.at))
  const days = new Set(sorted.map((i) => dayOf(i.at))).size
  const half = Math.floor(sorted.length / 2)
  if (days < 2 || half < TREND_RULES.minPerSide || sorted.length - half < TREND_RULES.minPerSide) {
    return { direction: 'insufficient', delta: null, points }
  }
  const mean = (list: ReadinessEvidence[]) => list.reduce((s, i) => s + i.score, 0) / list.length
  const delta = round(mean(sorted.slice(half)) - mean(sorted.slice(0, half)), 1)
  const direction =
    Math.abs(delta) <= TREND_RULES.steadyWithin ? 'steady' : delta > 0 ? 'improving' : 'declining'
  return { direction, delta, points }
}

function severityOf(score: number): ReadinessWeakness['severity'] {
  if (score < CRITICAL_WEAK_SCORE) return 'high'
  if (score < 50) return 'medium'
  return 'low'
}

/** Weak topics first, each with the gaps the evidence recorded. */
export function weaknessesOf(items: ReadinessEvidence[], now: number): ReadinessWeakness[] {
  const groups = new Map<string, ReadinessEvidence[]>()
  for (const item of items) {
    const key = item.topic ?? item.label
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const out: ReadinessWeakness[] = []
  for (const [topic, group] of groups) {
    const agg = weightedScore(group, now)
    if (!agg || agg.score >= WEAK_SCORE) continue
    const gaps = [...new Set(group.flatMap((g) => g.gaps ?? []))].slice(0, 3)
    const answers = new Set(group.map((g) => g.attemptId)).size
    const text =
      `${topic}: averaging ${round(agg.score)} over ${answers} ${answers === 1 ? 'attempt' : 'attempts'}` +
      (gaps.length ? `. ${gaps.join('; ')}` : '')
    out.push({
      id: `weak:${topic}`,
      severity: severityOf(agg.score),
      text,
      topic,
      evidenceIds: group.map((g) => g.id),
    })
  }
  const rank = { high: 0, medium: 1, low: 2 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 6)
}

export function factorWeightShare(factors: Iterable<keyof typeof FACTORS>): number {
  let sum = 0
  for (const id of factors) sum += FACTORS[id].weight
  return sum / TOTAL_FACTOR_WEIGHT
}
