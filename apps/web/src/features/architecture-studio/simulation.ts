import type {
  ArchitectureDocument,
  FailureScenario,
  NodeImpact,
  RecoveryAssessment,
  Scenario,
  SimulationResult,
  UserImpact,
} from '@opsforge/types'
import { hasTrait } from './catalog'
import { buildGraph, isSyncEdge, type Graph, type ResolvedNode } from './graph'

/*
 * Deterministic failure model. It is a reasoning aid, not a chaos test:
 *  - A node's own impact comes from the failure and its zone/region/failover configuration.
 *  - Impact travels backwards along synchronous edges. Successors of one category are redundant
 *    alternatives, so a partial loss degrades the caller; categories are all required, except
 *    caches, which can only degrade a caller.
 *  - A DNS node without failover cannot steer users away from a dead target.
 * Recovery times are fixed planning estimates per mechanism (see RECOVERY_MINUTES).
 */

const RANK: Record<NodeImpact, number> = { ok: 0, degraded: 1, down: 2 }
const worst = (a: NodeImpact, b: NodeImpact): NodeImpact => (RANK[a] >= RANK[b] ? a : b)

export const RECOVERY_MINUTES = {
  loadBalancerReroute: 1,
  automaticFailover: 3,
  autoscalingReplacement: 5,
  manualFailover: 30,
  manualRegionCutover: 60,
  daily_backup_rpo: 1440,
  replicationLag: 1,
} as const

interface Own {
  impact: NodeImpact
  reason?: string
}

function ownImpact(n: ResolvedNode, failure: FailureScenario): Own {
  const { node, def } = n
  const cfg = node.config
  switch (failure.kind) {
    case 'node-loss':
      return failure.nodeId === node.id
        ? { impact: 'down', reason: `${node.label} is lost.` }
        : { impact: 'ok' }
    case 'dependency-slow':
      return failure.nodeId === node.id
        ? { impact: 'degraded', reason: `${node.label} responds slowly.` }
        : { impact: 'ok' }
    case 'region-loss':
      return cfg.region === 'primary'
        ? { impact: 'down', reason: `${node.label} is in the lost region.` }
        : { impact: 'ok' }
    case 'zone-loss': {
      if (cfg.region !== 'primary') return { impact: 'ok' }
      if (cfg.zones < 2) return { impact: 'down', reason: `${node.label} runs in a single zone.` }
      if (def.category === 'database') {
        const failover = hasTrait(def, 'managed-ha') ? 'automatic' : cfg.failover
        return failover === 'none'
          ? {
              impact: 'down',
              reason: `${node.label} spans zones but has no failover, so it does not promote a replica.`,
            }
          : {
              impact: 'degraded',
              reason: `${node.label} fails over to another zone${failover === 'manual' ? ' manually' : ''}.`,
            }
      }
      if (def.category === 'kafka') {
        return cfg.replicas >= 3
          ? { impact: 'degraded', reason: `${node.label} loses a broker but keeps quorum.` }
          : { impact: 'down', reason: `${node.label} loses quorum.` }
      }
      if (def.category === 'compute' || def.category === 'kubernetes' || def.category === 'cache') {
        return cfg.autoscaling || hasTrait(def, 'serverless')
          ? { impact: 'ok' }
          : { impact: 'degraded', reason: `${node.label} loses a share of its capacity.` }
      }
      return { impact: 'ok' }
    }
  }
}

function groupImpact(source: ResolvedNode, category: string, members: NodeImpact[]): NodeImpact {
  if (members.every((m) => m === 'ok')) return 'ok'
  let result: NodeImpact
  if (members.every((m) => m === 'down')) {
    result = 'down'
  } else {
    const downCount = members.filter((m) => m === 'down').length
    const blind = source.def.category === 'dns' && source.node.config.failover === 'none'
    result = blind && downCount * 2 >= members.length ? 'down' : 'degraded'
  }
  return category === 'cache' && result === 'down' ? 'degraded' : result
}

export function simulateFailure(
  scenario: Scenario,
  document: ArchitectureDocument,
  failure: FailureScenario,
): SimulationResult {
  const graph = buildGraph(document)
  const owns = new Map<string, Own>(graph.nodes.map((n) => [n.node.id, ownImpact(n, failure)]))
  const memo = new Map<string, NodeImpact>()
  const visiting = new Set<string>()
  const notes: string[] = []

  function effective(n: ResolvedNode): NodeImpact {
    const cached = memo.get(n.node.id)
    if (cached) return cached
    if (visiting.has(n.node.id)) return owns.get(n.node.id)?.impact ?? 'ok'
    visiting.add(n.node.id)

    let result = owns.get(n.node.id)?.impact ?? 'ok'
    const groups = new Map<string, NodeImpact[]>()
    for (const edge of graph.out.get(n.node.id) ?? []) {
      if (!isSyncEdge(edge)) continue
      const target = graph.byId.get(edge.target)
      if (!target) continue
      const list = groups.get(target.def.category) ?? []
      list.push(effective(target))
      groups.set(target.def.category, list)
    }
    for (const [category, impacts] of groups)
      result = worst(result, groupImpact(n, category, impacts))

    // Async hand-offs: a broken queue delays producers and starves consumers, but never takes users down.
    for (const edge of graph.out.get(n.node.id) ?? []) {
      if (edge.kind === 'async' && (owns.get(edge.target)?.impact ?? 'ok') === 'down')
        result = worst(result, 'degraded')
    }
    for (const edge of graph.inc.get(n.node.id) ?? []) {
      if (edge.kind === 'async' && (owns.get(edge.source)?.impact ?? 'ok') === 'down')
        result = worst(result, 'degraded')
    }

    visiting.delete(n.node.id)
    memo.set(n.node.id, result)
    return result
  }

  const nodeImpact: Record<string, NodeImpact> = {}
  for (const n of graph.nodes) nodeImpact[n.node.id] = effective(n)

  // Observations
  for (const n of graph.nodes) {
    const own = owns.get(n.node.id)
    if (own?.reason) notes.push(own.reason)
  }
  for (const n of graph.nodes) {
    if (!owns.get(n.node.id)?.reason && nodeImpact[n.node.id] !== 'ok') {
      notes.push(
        `${n.node.label} is ${nodeImpact[n.node.id] === 'down' ? 'unavailable' : 'degraded'} because a dependency is affected.`,
      )
    }
  }
  for (const n of graph.nodes) {
    if (n.def.category === 'cache' && owns.get(n.node.id)?.impact === 'down') {
      notes.push(
        `With ${n.node.label} gone, ${Math.round(scenario.workload.readRatio * 100)}% read traffic falls through to the database.`,
      )
    }
    if (
      n.def.category === 'dns' &&
      n.node.config.failover === 'none' &&
      Object.values(nodeImpact).includes('down')
    ) {
      notes.push(`${n.node.label} has no failover, so it keeps sending users to unhealthy targets.`)
    }
  }

  const userImpact = computeUserImpact(graph, nodeImpact)
  if (userImpact === 'available' && !Object.values(nodeImpact).includes('down')) {
    notes.push('No user-visible impact in this design.')
  }

  return {
    failure,
    nodeImpact,
    userImpact,
    observations: [...new Set(notes)].slice(0, 12),
    recovery: assessRecovery(scenario, graph, failure, nodeImpact, userImpact),
  }
}

function computeUserImpact(graph: Graph, impact: Record<string, NodeImpact>): UserImpact {
  let entries = graph.nodes.filter((n) => n.def.category === 'client')
  if (entries.length === 0) {
    entries = graph.nodes.filter(
      (n) =>
        ['dns', 'cdn', 'waf', 'load-balancer', 'compute', 'kubernetes'].includes(n.def.category) &&
        !(graph.inc.get(n.node.id) ?? []).some(isSyncEdge),
    )
  }
  if (entries.length === 0) return 'available'
  const level = entries.reduce<NodeImpact>((acc, n) => worst(acc, impact[n.node.id] ?? 'ok'), 'ok')
  return level === 'down' ? 'outage' : level === 'degraded' ? 'degraded' : 'available'
}

function assessRecovery(
  scenario: Scenario,
  graph: Graph,
  failure: FailureScenario,
  impact: Record<string, NodeImpact>,
  userImpact: UserImpact,
): RecoveryAssessment | null {
  const affected = graph.nodes.filter((n) => impact[n.node.id] !== 'ok')
  const anyDown = affected.some((n) => impact[n.node.id] === 'down')
  if (failure.kind === 'dependency-slow' || (userImpact === 'available' && !anyDown)) return null

  const hasSecondary = graph.nodes.some(
    (n) =>
      n.node.config.region === 'secondary' && ['compute', 'kubernetes'].includes(n.def.category),
  )
  let rto: number | null = 0
  const need = (minutes: number | null) => {
    rto = rto === null || minutes === null ? null : Math.max(rto, minutes)
  }

  if (failure.kind === 'region-loss') {
    if (!hasSecondary) need(null)
    else {
      const dns = graph.nodes.filter((n) => n.def.category === 'dns')
      const mode = dns.some((n) => n.node.config.failover === 'automatic')
        ? 'automatic'
        : dns.some((n) => n.node.config.failover === 'manual')
          ? 'manual'
          : 'none'
      need(
        mode === 'automatic'
          ? RECOVERY_MINUTES.automaticFailover
          : mode === 'manual'
            ? RECOVERY_MINUTES.manualFailover
            : RECOVERY_MINUTES.manualRegionCutover,
      )
    }
  } else {
    for (const n of affected) {
      const state = impact[n.node.id]
      const cfg = n.node.config
      const stateful = ['database', 'kafka', 'storage', 'queue', 'cache'].includes(n.def.category)
      if (state === 'down') {
        if (stateful && n.def.category !== 'cache')
          need(cfg.backups ? RECOVERY_MINUTES.manualRegionCutover : null)
        else if (cfg.autoscaling || hasTrait(n.def, 'serverless'))
          need(RECOVERY_MINUTES.autoscalingReplacement)
        else if (failure.kind === 'zone-loss') need(null)
        else need(15)
      } else if (n.def.category === 'database') {
        need(
          cfg.failover === 'manual'
            ? RECOVERY_MINUTES.manualFailover
            : RECOVERY_MINUTES.automaticFailover,
        )
      } else {
        need(RECOVERY_MINUTES.autoscalingReplacement)
      }
    }
  }

  // Data loss window for stateful components that were hit.
  let rpo: number | null = 0
  const dataNodes = affected.filter(
    (n) =>
      (['database', 'storage', 'kafka', 'queue'].includes(n.def.category) &&
        n.node.config.region === 'primary') ||
      (failure.kind === 'node-loss' &&
        n.node.id === failure.nodeId &&
        ['database', 'storage', 'kafka', 'queue'].includes(n.def.category)),
  )
  for (const n of dataNodes) {
    const cfg = n.node.config
    let minutes: number | null
    if (failure.kind === 'region-loss') {
      minutes = cfg.crossRegionReplication
        ? RECOVERY_MINUTES.replicationLag
        : cfg.backups
          ? RECOVERY_MINUTES.daily_backup_rpo
          : null
    } else if (cfg.zones >= 2 || hasTrait(n.def, 'managed-ha')) {
      minutes = 0
    } else {
      minutes = cfg.backups ? RECOVERY_MINUTES.daily_backup_rpo : null
    }
    rpo = rpo === null || minutes === null ? null : Math.max(rpo, minutes)
  }

  return {
    estimatedRtoMinutes: rto,
    estimatedRpoMinutes: rpo,
    meetsRto: rto === null ? false : rto <= scenario.workload.rtoMinutes,
    meetsRpo: rpo === null ? false : rpo <= scenario.workload.rpoMinutes,
  }
}

export const FAILURE_LABELS: Record<FailureScenario['kind'], string> = {
  'node-loss': 'Lose component',
  'dependency-slow': 'Slow dependency',
  'zone-loss': 'Lose an availability zone',
  'region-loss': 'Lose the primary region',
}
