import type {
  ArchitectureDocument,
  ArchitectureEdge,
  ArchitectureNode,
  ComponentConfig,
  ConnectionKind,
} from '@opsforge/types'
import { getComponent } from './catalog'
import { buildGraph, inferEdgeKind } from './graph'

export function newId(prefix: string): string {
  const raw =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${raw}`
}

export const EMPTY_DOCUMENT: ArchitectureDocument = { schemaVersion: 1, nodes: [], edges: [] }

export function emptyDocument(): ArchitectureDocument {
  return { schemaVersion: 1, nodes: [], edges: [] }
}

export function addNode(
  doc: ArchitectureDocument,
  componentId: string,
  position: { x: number; y: number },
  id: string = newId('n'),
): { document: ArchitectureDocument; nodeId: string | null } {
  const def = getComponent(componentId)
  if (!def) return { document: doc, nodeId: null }
  const sameCount = doc.nodes.filter((n) => n.componentId === componentId).length
  const node: ArchitectureNode = {
    id,
    componentId,
    label: sameCount === 0 ? def.name : `${def.name} ${sameCount + 1}`,
    position: { x: Math.round(position.x), y: Math.round(position.y) },
    config: { ...def.defaults },
  }
  return { document: { ...doc, nodes: [...doc.nodes, node] }, nodeId: id }
}

export function removeNodes(doc: ArchitectureDocument, nodeIds: string[]): ArchitectureDocument {
  const drop = new Set(nodeIds)
  return {
    ...doc,
    nodes: doc.nodes.filter((n) => !drop.has(n.id)),
    edges: doc.edges.filter((e) => !drop.has(e.source) && !drop.has(e.target)),
  }
}

export function removeEdges(doc: ArchitectureDocument, edgeIds: string[]): ArchitectureDocument {
  const drop = new Set(edgeIds)
  return { ...doc, edges: doc.edges.filter((e) => !drop.has(e.id)) }
}

export function moveNode(
  doc: ArchitectureDocument,
  nodeId: string,
  position: { x: number; y: number },
): ArchitectureDocument {
  const x = Math.round(position.x)
  const y = Math.round(position.y)
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === nodeId && (n.position.x !== x || n.position.y !== y)
        ? { ...n, position: { x, y } }
        : n,
    ),
  }
}

export function renameNode(
  doc: ArchitectureDocument,
  nodeId: string,
  label: string,
): ArchitectureDocument {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)) }
}

export function updateNodeConfig(
  doc: ArchitectureDocument,
  nodeId: string,
  patch: Partial<ComponentConfig>,
): ArchitectureDocument {
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      n.id === nodeId ? { ...n, config: { ...n.config, ...patch } } : n,
    ),
  }
}

/** Connects two nodes. Self-loops and duplicate (same direction) edges are ignored. */
export function connect(
  doc: ArchitectureDocument,
  source: string,
  target: string,
  id: string = newId('e'),
): { document: ArchitectureDocument; edgeId: string | null } {
  if (source === target) return { document: doc, edgeId: null }
  if (doc.edges.some((e) => e.source === source && e.target === target)) {
    return { document: doc, edgeId: null }
  }
  const graph = buildGraph(doc)
  const s = graph.byId.get(source)
  const t = graph.byId.get(target)
  if (!s || !t) return { document: doc, edgeId: null }
  const edge: ArchitectureEdge = {
    id,
    source,
    target,
    kind: inferEdgeKind(s.def.category, t.def.category),
    encrypted: true,
  }
  return { document: { ...doc, edges: [...doc.edges, edge] }, edgeId: id }
}

export function updateEdge(
  doc: ArchitectureDocument,
  edgeId: string,
  patch: Partial<Pick<ArchitectureEdge, 'kind' | 'encrypted' | 'label'>>,
): ArchitectureDocument {
  return { ...doc, edges: doc.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)) }
}

export function reverseEdge(doc: ArchitectureDocument, edgeId: string): ArchitectureDocument {
  return {
    ...doc,
    edges: doc.edges.map((e) =>
      e.id === edgeId ? { ...e, source: e.target, target: e.source } : e,
    ),
  }
}

export const KIND_OPTIONS: ConnectionKind[] = ['traffic', 'data', 'async', 'telemetry', 'deploy']

/**
 * Key that changes only when evaluation-relevant content changes (positions and labels excluded),
 * so dragging a node never re-runs the checks.
 */
export function semanticKey(doc: ArchitectureDocument): string {
  return JSON.stringify([
    doc.nodes.map((n) => [n.id, n.componentId, n.label, n.config]),
    doc.edges.map((e) => [e.id, e.source, e.target, e.kind, e.encrypted]),
  ])
}

/** Narrows persisted data: drops nodes of unknown components and dangling edges. */
export function sanitizeDocument(raw: unknown): ArchitectureDocument | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as Partial<ArchitectureDocument>
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return null
  const nodes: ArchitectureNode[] = []
  for (const n of candidate.nodes) {
    const def = n && typeof n.componentId === 'string' ? getComponent(n.componentId) : undefined
    if (
      !def ||
      typeof n.id !== 'string' ||
      typeof n.position?.x !== 'number' ||
      typeof n.position?.y !== 'number'
    )
      continue
    nodes.push({
      id: n.id,
      componentId: def.id,
      label: typeof n.label === 'string' ? n.label : def.name,
      position: { x: n.position.x, y: n.position.y },
      config: { ...def.defaults, ...(n.config ?? {}) },
    })
  }
  const ids = new Set(nodes.map((n) => n.id))
  const edges = candidate.edges.filter(
    (e): e is ArchitectureEdge =>
      !!e &&
      typeof e.id === 'string' &&
      ids.has(e.source) &&
      ids.has(e.target) &&
      KIND_OPTIONS.includes(e.kind),
  )
  return {
    schemaVersion: 1,
    nodes,
    edges: edges.map((e) => ({ ...e, encrypted: e.encrypted !== false })),
  }
}
