import type {
  ArchitectureDocument,
  ArchitectureEdge,
  ArchitectureNode,
  ComponentCategory,
  ComponentDefinition,
  ConnectionKind,
} from '@opsforge/types'
import { getComponent } from './catalog'

export interface ResolvedNode {
  node: ArchitectureNode
  def: ComponentDefinition
}

export interface Graph {
  nodes: ResolvedNode[]
  byId: Map<string, ResolvedNode>
  edges: ArchitectureEdge[]
  out: Map<string, ArchitectureEdge[]>
  inc: Map<string, ArchitectureEdge[]>
}

const SYNC_KINDS: ConnectionKind[] = ['traffic', 'data']

export function isSyncEdge(edge: ArchitectureEdge): boolean {
  return SYNC_KINDS.includes(edge.kind)
}

/** Resolves catalog definitions and drops nodes/edges that reference unknown components. */
export function buildGraph(doc: ArchitectureDocument): Graph {
  const nodes: ResolvedNode[] = []
  for (const node of doc.nodes) {
    const def = getComponent(node.componentId)
    if (def) nodes.push({ node, def })
  }
  const byId = new Map(nodes.map((n) => [n.node.id, n]))
  const edges = doc.edges.filter((e) => byId.has(e.source) && byId.has(e.target))
  const out = new Map<string, ArchitectureEdge[]>()
  const inc = new Map<string, ArchitectureEdge[]>()
  for (const n of nodes) {
    out.set(n.node.id, [])
    inc.set(n.node.id, [])
  }
  for (const e of edges) {
    out.get(e.source)?.push(e)
    inc.get(e.target)?.push(e)
  }
  return { nodes, byId, edges, out, inc }
}

export function ofCategory(graph: Graph, ...categories: ComponentCategory[]): ResolvedNode[] {
  return graph.nodes.filter((n) => categories.includes(n.def.category))
}

export function successors(
  graph: Graph,
  id: string,
  edgeFilter?: (e: ArchitectureEdge) => boolean,
) {
  return (graph.out.get(id) ?? [])
    .filter((e) => (edgeFilter ? edgeFilter(e) : true))
    .map((e) => graph.byId.get(e.target))
    .filter((n): n is ResolvedNode => n !== undefined)
}

export function neighbours(graph: Graph, id: string): ResolvedNode[] {
  const ids = new Set<string>()
  for (const e of graph.out.get(id) ?? []) ids.add(e.target)
  for (const e of graph.inc.get(id) ?? []) ids.add(e.source)
  return [...ids].map((i) => graph.byId.get(i)).filter((n): n is ResolvedNode => n !== undefined)
}

/** Is there a directed path over the given edge kinds from any node of `from` to any node of `to`? */
export function hasPath(
  graph: Graph,
  from: ComponentCategory,
  to: ComponentCategory,
  kinds: ConnectionKind[] = ['traffic', 'data', 'async'],
): boolean {
  const targets = new Set(ofCategory(graph, to).map((n) => n.node.id))
  const seen = new Set<string>()
  const stack: string[] = []
  for (const n of ofCategory(graph, from)) {
    for (const e of graph.out.get(n.node.id) ?? []) if (kinds.includes(e.kind)) stack.push(e.target)
  }
  while (stack.length) {
    const id = stack.pop() as string
    if (seen.has(id)) continue
    seen.add(id)
    if (targets.has(id)) return true
    for (const e of graph.out.get(id) ?? []) {
      if (kinds.includes(e.kind)) stack.push(e.target)
    }
  }
  return false
}

/** Nodes taking part in a cycle over synchronous edges. */
export function syncCycleNodes(graph: Graph): string[] {
  const state = new Map<string, 0 | 1 | 2>()
  const inCycle = new Set<string>()
  const path: string[] = []

  function visit(id: string) {
    state.set(id, 1)
    path.push(id)
    for (const e of graph.out.get(id) ?? []) {
      if (!isSyncEdge(e)) continue
      const s = state.get(e.target) ?? 0
      if (s === 1) {
        for (const p of path.slice(path.indexOf(e.target))) inCycle.add(p)
      } else if (s === 0) {
        visit(e.target)
      }
    }
    path.pop()
    state.set(id, 2)
  }

  for (const n of graph.nodes) if (!state.get(n.node.id)) visit(n.node.id)
  return [...inCycle]
}

/** Longest synchronous call chain (in nodes) counting only serving components. Cycles are cut. */
export function longestSyncChain(graph: Graph): { depth: number; nodeIds: string[] } {
  const memo = new Map<string, string[]>()
  const visiting = new Set<string>()

  function chain(id: string): string[] {
    const cached = memo.get(id)
    if (cached) return cached
    if (visiting.has(id)) return []
    visiting.add(id)
    const self = graph.byId.get(id)
    const serving = self && (self.def.category === 'compute' || self.def.category === 'kubernetes')
    let best: string[] = []
    for (const e of graph.out.get(id) ?? []) {
      if (!isSyncEdge(e)) continue
      const next = chain(e.target)
      if (next.length > best.length) best = next
    }
    visiting.delete(id)
    const result = serving ? [id, ...best] : best
    memo.set(id, result)
    return result
  }

  let longest: string[] = []
  for (const n of graph.nodes) {
    const c = chain(n.node.id)
    if (c.length > longest.length) longest = c
  }
  return { depth: longest.length, nodeIds: longest }
}

/** Edge kind a new connection most likely represents. Always editable in the inspector. */
export function inferEdgeKind(
  source: ComponentCategory,
  target: ComponentCategory,
): ConnectionKind {
  if (source === 'monitoring' || target === 'monitoring') return 'telemetry'
  if (source === 'cicd') return 'deploy'
  if (target === 'queue' || target === 'kafka') return 'async'
  if (source === 'queue' || source === 'kafka') return 'async'
  if (['database', 'cache', 'storage'].includes(target)) return 'data'
  return 'traffic'
}

export const CONNECTION_KIND_LABELS: Record<ConnectionKind, string> = {
  traffic: 'Request traffic',
  data: 'Data access',
  async: 'Async / events',
  telemetry: 'Telemetry',
  deploy: 'Deployment',
}
