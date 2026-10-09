import type {
  EvidenceConfidence,
  FactorReport,
  LevelGate,
  LevelGateCheck,
  ReadinessLevelResult,
} from '@opsforge/types'
import { CONFIDENCE_RANK, FACTORS, GATES, LEVELS, type GateRule } from './config'

/** Everything a gate looks at. Built from evidence by the engine; never supplied by a caller. */
export interface LevelMetrics {
  overall: number | null
  attempts: number
  days: number
  origins: number
  factorsWithEvidence: number
  coverage: number
  confidence: EvidenceConfidence
  factors: FactorReport[]
}

const pct = (share: number) => `${Math.round(share * 100)}%`

function evaluateGate(rule: GateRule, m: LevelMetrics): LevelGate {
  const checks: LevelGateCheck[] = []
  const add = (id: string, label: string, current: string, required: string, passed: boolean) =>
    checks.push({ id, label, current, required, passed })

  add(
    'overall',
    'Overall score',
    m.overall === null ? 'no evidence' : String(Math.round(m.overall)),
    `${rule.minOverall}+`,
    m.overall !== null && m.overall >= rule.minOverall,
  )
  add(
    'attempts',
    'Scored attempts',
    String(m.attempts),
    `${rule.minAttempts}+`,
    m.attempts >= rule.minAttempts,
  )
  add('days', 'Days with evidence', String(m.days), `${rule.minDays}+`, m.days >= rule.minDays)
  add(
    'origins',
    'Modules contributing',
    String(m.origins),
    `${rule.minOrigins}+`,
    m.origins >= rule.minOrigins,
  )
  add(
    'factors',
    'Areas with evidence',
    String(m.factorsWithEvidence),
    `${rule.minFactors}+`,
    m.factorsWithEvidence >= rule.minFactors,
  )
  add(
    'coverage',
    'Evidence coverage',
    pct(m.coverage),
    `${pct(rule.minCoverage)}+`,
    m.coverage >= rule.minCoverage,
  )
  add(
    'confidence',
    'Evidence confidence',
    m.confidence,
    rule.minConfidence,
    CONFIDENCE_RANK[m.confidence] >= CONFIDENCE_RANK[rule.minConfidence],
  )

  if (rule.floor > 0) {
    const scored = m.factors.filter((f) => f.score !== null)
    const lowest = scored.reduce<FactorReport | null>(
      (min, f) => (min === null || (f.score ?? 0) < (min.score ?? 0) ? f : min),
      null,
    )
    add(
      'floor',
      'Weakest area',
      lowest ? `${lowest.label} ${lowest.score}` : 'no evidence',
      `${rule.floor}+ in every area`,
      lowest !== null && (lowest.score ?? 0) >= rule.floor,
    )
  }

  for (const req of rule.factors) {
    const f = m.factors.find((x) => x.id === req.id)
    const score = f?.score ?? null
    const count = f?.evidenceCount ?? 0
    add(
      `factor:${req.id}`,
      FACTORS[req.id].label,
      score === null ? 'no evidence' : `${score} from ${count} ${count === 1 ? 'item' : 'items'}`,
      `${req.min}+ from ${req.minItems}+ items`,
      score !== null && score >= req.min && count >= req.minItems,
    )
  }

  return { level: rule.level, label: rule.label, passed: checks.every((c) => c.passed), checks }
}

/**
 * The level is the highest one whose gate, and every gate below it, passes. Gates demand volume,
 * spread across days and modules, and coverage as well as score, so a single strong quiz cannot
 * lift it. No model output is consulted.
 */
export function computeLevel(m: LevelMetrics): ReadinessLevelResult {
  const gates: LevelGate[] = [
    {
      level: 1,
      label: LEVELS[0]!.label,
      passed: true,
      checks: [
        { id: 'start', label: 'Starting level', current: 'always', required: 'none', passed: true },
      ],
    },
    ...GATES.map((rule) => evaluateGate(rule, m)),
  ]

  let value: ReadinessLevelResult['value'] = 1
  for (const gate of gates) {
    if (!gate.passed) break
    value = gate.level
  }

  const next = gates.find((g) => g.level === value + 1) ?? null
  const label = LEVELS.find((l) => l.value === value)!.label

  let reason: string
  if (m.attempts === 0) {
    reason = 'No scored evidence yet, so the level starts at Learner.'
  } else if (next) {
    const failing = next.checks.filter((c) => !c.passed)
    const shown = failing
      .slice(0, 3)
      .map((c) => `${c.label.toLowerCase()} ${c.required}`)
      .join(', ')
    reason = `${label} is the highest gate cleared. ${next.label} still needs: ${shown}${
      failing.length > 3 ? ` and ${failing.length - 3} more` : ''
    }.`
  } else {
    reason = 'Every gate is cleared.'
  }

  return { value, label, next, gates, reason }
}
