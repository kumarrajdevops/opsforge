import type {
  ArchitectureEvaluation,
  ArchitectureEvaluator,
  CheckResult,
  CheckSeverity,
  DimensionEvaluation,
  EvaluationInput,
  ScoreDimensionId,
} from '@opsforge/types'
import { buildGraph } from './graph'
import { RULES, evaluateRequirementCheck, type RuleContext } from './rules'
import { estimateCost } from './sizing'

export const DIMENSIONS: { id: ScoreDimensionId; label: string; hint: string; weight: number }[] = [
  { id: 'requirements', label: 'Requirements', hint: 'Scenario requirements met', weight: 1.5 },
  {
    id: 'scalability',
    label: 'Scalability',
    hint: 'Capacity, caching and edge for the load',
    weight: 1,
  },
  {
    id: 'availability',
    label: 'Availability',
    hint: 'Redundancy, zones and failover',
    weight: 1.2,
  },
  {
    id: 'reliability',
    label: 'Reliability',
    hint: 'Failure isolation and async decoupling',
    weight: 1,
  },
  { id: 'security', label: 'Security', hint: 'Exposure, encryption and identity', weight: 1.2 },
  { id: 'networking', label: 'Networking', hint: 'Entry path, DNS and isolation', weight: 0.8 },
  { id: 'data', label: 'Data', hint: 'Durability and backups', weight: 1 },
  {
    id: 'disaster-recovery',
    label: 'Disaster recovery',
    hint: 'Regions, replication and RTO/RPO',
    weight: 0.8,
  },
  {
    id: 'observability',
    label: 'Observability',
    hint: 'Monitoring, alerting and tracing',
    weight: 0.8,
  },
  { id: 'cicd', label: 'CI/CD', hint: 'Pipeline, tests and release strategy', weight: 0.6 },
  {
    id: 'cost',
    label: 'Cost',
    hint: 'Budget fit and right-sizing (higher is more efficient)',
    weight: 0.6,
  },
  {
    id: 'operational-complexity',
    label: 'Operational complexity',
    hint: 'Higher is simpler to operate',
    weight: 0.6,
  },
]

/** Failed checks cost their weight; passes earn it. Not-applicable checks are ignored. */
export const SEVERITY_WEIGHT: Record<CheckSeverity, number> = { critical: 8, major: 4, minor: 2 }
/** A failed critical check caps the overall score here. */
export const CRITICAL_CAP = 59

export const EVALUATOR_ID = 'opsforge.deterministic'
export const EVALUATOR_VERSION = '1.0.0'

const severityRank: Record<CheckSeverity, number> = { critical: 0, major: 1, minor: 2 }

function runChecks(ctx: RuleContext): CheckResult[] {
  const results: CheckResult[] = []

  for (const rule of RULES) {
    if (!rule.applies(ctx)) {
      results.push({
        checkId: rule.id,
        dimension: rule.dimension,
        title: rule.title,
        status: 'not-applicable',
        severity: rule.severity,
        nodeIds: [],
        evidence: 'Does not apply to this scenario or design yet.',
      })
      continue
    }
    const outcome = rule.run(ctx)
    results.push({
      checkId: rule.id,
      dimension: rule.dimension,
      title: rule.title,
      status: outcome.ok ? 'pass' : 'fail',
      severity: outcome.severity ?? rule.severity,
      nodeIds: outcome.nodeIds ?? [],
      evidence: outcome.evidence,
      fix: outcome.ok ? undefined : rule.fix,
    })
  }

  ctx.scenario.requirements.forEach((req, index) => {
    const outcome = evaluateRequirementCheck(req.check, ctx.graph)
    results.push({
      checkId: `REQ-${String(index + 1).padStart(2, '0')}`,
      dimension: 'requirements',
      title: req.text,
      status: outcome.ok ? 'pass' : 'fail',
      severity: req.priority === 'must' ? 'critical' : 'major',
      nodeIds: outcome.nodeIds,
      evidence: outcome.evidence,
      fix: outcome.ok ? undefined : 'Change the design so this requirement is met.',
    })
  })

  return results
}

export function scoreDimensions(checks: CheckResult[], scorable: boolean): DimensionEvaluation[] {
  return DIMENSIONS.map(({ id }) => {
    const own = checks.filter((c) => c.dimension === id && c.status !== 'not-applicable')
    const earned = own
      .filter((c) => c.status === 'pass')
      .reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0)
    const total = own.reduce((s, c) => s + SEVERITY_WEIGHT[c.severity], 0)
    return {
      id,
      score: scorable && total > 0 ? Math.round((earned / total) * 100) : null,
      passed: own.filter((c) => c.status === 'pass').length,
      failed: own.filter((c) => c.status === 'fail').length,
    }
  })
}

export function scoreOverall(
  dimensions: DimensionEvaluation[],
  checks: CheckResult[],
): { overall: number | null; capped: boolean } {
  let weighted = 0
  let weights = 0
  for (const d of dimensions) {
    if (d.score === null) continue
    const weight = DIMENSIONS.find((x) => x.id === d.id)?.weight ?? 1
    weighted += d.score * weight
    weights += weight
  }
  if (weights === 0) return { overall: null, capped: false }
  const raw = Math.round(weighted / weights)
  const hasCritical = checks.some((c) => c.status === 'fail' && c.severity === 'critical')
  return hasCritical && raw > CRITICAL_CAP
    ? { overall: CRITICAL_CAP, capped: true }
    : { overall: raw, capped: false }
}

export function sortFailures(checks: CheckResult[]): CheckResult[] {
  return checks
    .filter((c) => c.status === 'fail')
    .sort(
      (a, b) =>
        severityRank[a.severity] - severityRank[b.severity] || a.checkId.localeCompare(b.checkId),
    )
}

export const deterministicEvaluator: ArchitectureEvaluator = {
  id: EVALUATOR_ID,
  version: EVALUATOR_VERSION,
  evaluate({ scenario, document }: EvaluationInput): ArchitectureEvaluation {
    const graph = buildGraph(document)
    const cost = estimateCost(graph, scenario.workload)
    const checks = runChecks({ scenario, graph, cost })
    const scorable = graph.nodes.length > 0
    const dimensions = scoreDimensions(checks, scorable)
    const { overall, capped } = scoreOverall(dimensions, checks)
    return {
      evaluator: { id: EVALUATOR_ID, version: EVALUATOR_VERSION },
      dimensions,
      overall,
      capped,
      checks,
      cost,
    }
  },
}
