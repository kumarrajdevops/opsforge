import type { CostEstimate, ScenarioWorkload } from '@opsforge/types'
import { TIER_FACTORS, hasTrait } from './catalog'
import type { Graph, ResolvedNode } from './graph'

/** Throughput one autoscaled group can reach relative to its baseline. */
export const AUTOSCALE_BURST_FACTOR = 3
/** Average utilisation of an autoscaled group relative to its baseline replica count. */
const AUTOSCALE_COST_FACTOR = 1.4
const MULTI_ZONE_COST_FACTOR = 1.8
const CROSS_REGION_COST_FACTOR = 0.7

/** Baseline requests per second a serving node sustains. Serverless is treated as unbounded. */
export function baselineCapacity({ node, def }: ResolvedNode): number {
  if (hasTrait(def, 'serverless')) return Number.POSITIVE_INFINITY
  const perReplica = def.rpsPerReplica ?? 300
  return node.config.replicas * perReplica * TIER_FACTORS[node.config.tier].capacity
}

/** Capacity including autoscaling headroom. */
export function burstCapacity(resolved: ResolvedNode): number {
  const base = baselineCapacity(resolved)
  return resolved.node.config.autoscaling ? base * AUTOSCALE_BURST_FACTOR : base
}

export function nodeMonthlyCost({ node, def }: ResolvedNode, workload: ScenarioWorkload): number {
  const { base, unit, perRps } = {
    base: def.pricing.baseMonthlyUsd,
    unit: def.pricing.unitMonthlyUsd,
    perRps: def.pricing.perRpsUsd,
  }
  const tier = TIER_FACTORS[node.config.tier].cost
  let units = def.category === 'database' ? 1 + node.config.readReplicas : node.config.replicas
  if (node.config.autoscaling && !hasTrait(def, 'serverless')) units *= AUTOSCALE_COST_FACTOR
  const zoneFactor =
    (def.category === 'database' || def.category === 'cache') && node.config.zones > 1
      ? MULTI_ZONE_COST_FACTOR
      : 1
  let cost = tier * (base + unit * units * zoneFactor) + perRps * workload.peakRps
  if (node.config.crossRegionReplication) cost *= 1 + CROSS_REGION_COST_FACTOR
  return Math.round(cost)
}

/** A planning heuristic built from a coarse price model. It is not a quote. */
export function estimateCost(graph: Graph, workload: ScenarioWorkload): CostEstimate {
  const byNode: Record<string, number> = {}
  let monthlyUsd = 0
  for (const resolved of graph.nodes) {
    const cost = nodeMonthlyCost(resolved, workload)
    byNode[resolved.node.id] = cost
    monthlyUsd += cost
  }
  return { monthlyUsd, byNode, indicative: true }
}
