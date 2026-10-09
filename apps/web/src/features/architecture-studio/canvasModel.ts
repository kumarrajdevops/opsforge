import type {
  ArchitectureDocument,
  ArchitectureEvaluation,
  CheckSeverity,
  ComponentCategory,
  ConnectionKind,
  NodeImpact,
  SimulationResult,
} from '@opsforge/types'
import type { Edge, Node } from '@xyflow/react'
import { getComponent } from './catalog'
import type { Selection } from './useArchitectureEditor'

/** Pure mapping from the architecture document to React Flow elements. No React, no rendering. */

export type FindingCounts = Record<CheckSeverity, number>

export interface ComponentNodeData extends Record<string, unknown> {
  label: string
  componentName: string
  category: ComponentCategory
  provider: 'aws' | 'azure' | 'generic'
  facts: string[]
  findings: FindingCounts
  impact: NodeImpact | null
}

export interface ConnectionEdgeData extends Record<string, unknown> {
  kind: ConnectionKind
  encrypted: boolean
  /** Synchronous traffic or data without encryption in transit. */
  plaintext: boolean
}

export type ComponentFlowNode = Node<ComponentNodeData, 'component'>
export type ConnectionFlowEdge = Edge<ConnectionEdgeData>

export const NODE_WIDTH = 196
export const NODE_HEIGHT = 76

export function findingsByNode(evaluation: ArchitectureEvaluation): Map<string, FindingCounts> {
  const map = new Map<string, FindingCounts>()
  for (const check of evaluation.checks) {
    if (check.status !== 'fail') continue
    for (const id of new Set(check.nodeIds)) {
      const counts = map.get(id) ?? { critical: 0, major: 0, minor: 0 }
      counts[check.severity] += 1
      map.set(id, counts)
    }
  }
  return map
}

/** Short, human-readable facts shown on the node card. Only properties the component exposes. */
export function nodeFacts(
  componentId: string,
  config: ArchitectureDocument['nodes'][number]['config'],
): string[] {
  const def = getComponent(componentId)
  if (!def) return []
  const has = (key: (typeof def.properties)[number]) => def.properties.includes(key)
  const facts: string[] = []
  if (has('replicas')) facts.push(`×${config.replicas}`)
  if (has('zones')) facts.push(`${config.zones} AZ`)
  if (has('region') && config.region === 'secondary') facts.push('region B')
  if (has('autoscaling') && config.autoscaling) facts.push('autoscale')
  if (has('failover') && config.failover !== 'none') facts.push(`${config.failover} failover`)
  if (has('exposure') && config.exposure === 'public') facts.push('public')
  return facts
}

export interface CanvasOverrides {
  /** Positions of nodes being dragged right now (not yet committed to the document). */
  positions: Record<string, { x: number; y: number }>
  /** Sizes React Flow measured, required for controlled nodes. */
  measured: Record<string, { width: number; height: number }>
}

export function toFlowNodes(
  document: ArchitectureDocument,
  evaluation: ArchitectureEvaluation,
  simulation: SimulationResult | null,
  selection: Selection,
  overrides: CanvasOverrides,
): ComponentFlowNode[] {
  const findings = findingsByNode(evaluation)
  const none: FindingCounts = { critical: 0, major: 0, minor: 0 }
  const nodes: ComponentFlowNode[] = []
  for (const n of document.nodes) {
    const def = getComponent(n.componentId)
    if (!def) continue
    nodes.push({
      id: n.id,
      type: 'component',
      position: overrides.positions[n.id] ?? n.position,
      measured: overrides.measured[n.id],
      selected: selection?.kind === 'node' && selection.id === n.id,
      data: {
        label: n.label,
        componentName: def.name,
        category: def.category,
        provider: def.provider,
        facts: nodeFacts(n.componentId, n.config),
        findings: findings.get(n.id) ?? none,
        impact: simulation ? (simulation.nodeImpact[n.id] ?? 'ok') : null,
      },
    })
  }
  return nodes
}

function plaintext(e: ArchitectureDocument['edges'][number]): boolean {
  return !e.encrypted && (e.kind === 'traffic' || e.kind === 'data')
}

export function toFlowEdges(
  document: ArchitectureDocument,
  selection: Selection,
): ConnectionFlowEdge[] {
  const ids = new Set(document.nodes.map((n) => n.id))
  return document.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      selected: selection?.kind === 'edge' && selection.id === e.id,
      label: e.label ?? (plaintext(e) ? 'plaintext' : undefined),
      data: { kind: e.kind, encrypted: e.encrypted, plaintext: plaintext(e) },
    }))
}
