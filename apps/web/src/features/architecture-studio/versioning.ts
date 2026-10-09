import type {
  ArchitectureDocument,
  ArchitectureEvaluation,
  ArchitectureVersion,
  ArchitectureVersionSummary,
  ScoreDimensionId,
  VersionDiff,
} from '@opsforge/types'

/** Order-independent, position-rounded JSON used for hashing. */
export function canonicalize(doc: ArchitectureDocument): string {
  const nodes = [...doc.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => ({
      id: n.id,
      componentId: n.componentId,
      label: n.label,
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
      config: Object.fromEntries(Object.entries(n.config).sort(([a], [b]) => a.localeCompare(b))),
    }))
  const edges = [...doc.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      kind: e.kind,
      encrypted: e.encrypted,
      label: e.label ?? '',
    }))
  return JSON.stringify({ nodes, edges })
}

/** FNV-1a 32-bit. Content fingerprint for change detection, not a security primitive. */
export function contentHash(doc: ArchitectureDocument): string {
  const text = canonicalize(doc)
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function summarize(evaluation: ArchitectureEvaluation): ArchitectureVersionSummary {
  return {
    evaluatorVersion: evaluation.evaluator.version,
    overall: evaluation.overall,
    dimensions: Object.fromEntries(evaluation.dimensions.map((d) => [d.id, d.score])),
    criticalFailures: evaluation.checks.filter(
      (c) => c.status === 'fail' && c.severity === 'critical',
    ).length,
  }
}

function changedFields(
  a: ArchitectureDocument['nodes'][number],
  b: ArchitectureDocument['nodes'][number],
): string[] {
  const fields: string[] = []
  if (a.componentId !== b.componentId) fields.push('component')
  if (a.label !== b.label) fields.push('label')
  for (const key of Object.keys(b.config) as (keyof typeof b.config)[]) {
    if (a.config[key] !== b.config[key]) fields.push(key)
  }
  return fields
}

/** Describes what changed going from `from` to `to`. */
export function diffVersions(from: ArchitectureVersion, to: ArchitectureVersion): VersionDiff {
  const fromNodes = new Map(from.document.nodes.map((n) => [n.id, n]))
  const toNodes = new Map(to.document.nodes.map((n) => [n.id, n]))
  const nodesChanged: VersionDiff['nodesChanged'] = []
  let nodesMoved = 0
  for (const [id, next] of toNodes) {
    const prev = fromNodes.get(id)
    if (!prev) continue
    const fields = changedFields(prev, next)
    if (fields.length) nodesChanged.push({ nodeId: id, label: next.label, fields })
    if (
      Math.round(prev.position.x) !== Math.round(next.position.x) ||
      Math.round(prev.position.y) !== Math.round(next.position.y)
    ) {
      nodesMoved++
    }
  }
  const fromEdges = new Map(from.document.edges.map((e) => [e.id, e]))
  const toEdges = new Map(to.document.edges.map((e) => [e.id, e]))
  let edgesChanged = 0
  for (const [id, next] of toEdges) {
    const prev = fromEdges.get(id)
    if (
      prev &&
      (prev.kind !== next.kind ||
        prev.encrypted !== next.encrypted ||
        prev.source !== next.source ||
        prev.target !== next.target)
    ) {
      edgesChanged++
    }
  }
  const dimensionDeltas: VersionDiff['dimensionDeltas'] = {}
  for (const [id, score] of Object.entries(to.summary.dimensions) as [
    ScoreDimensionId,
    number | null,
  ][]) {
    const before = from.summary.dimensions[id]
    if (typeof score === 'number' && typeof before === 'number' && score !== before)
      dimensionDeltas[id] = score - before
  }
  return {
    nodesAdded: [...toNodes.keys()]
      .filter((id) => !fromNodes.has(id))
      .map((id) => toNodes.get(id)?.label ?? id),
    nodesRemoved: [...fromNodes.keys()]
      .filter((id) => !toNodes.has(id))
      .map((id) => fromNodes.get(id)?.label ?? id),
    nodesChanged,
    nodesMoved,
    edgesAdded: [...toEdges.keys()].filter((id) => !fromEdges.has(id)).length,
    edgesRemoved: [...fromEdges.keys()].filter((id) => !toEdges.has(id)).length,
    edgesChanged,
    overallDelta:
      from.summary.overall !== null && to.summary.overall !== null
        ? to.summary.overall - from.summary.overall
        : null,
    dimensionDeltas,
  }
}

export function isEmptyDiff(diff: VersionDiff): boolean {
  return (
    diff.nodesAdded.length === 0 &&
    diff.nodesRemoved.length === 0 &&
    diff.nodesChanged.length === 0 &&
    diff.nodesMoved === 0 &&
    diff.edgesAdded === 0 &&
    diff.edgesRemoved === 0 &&
    diff.edgesChanged === 0
  )
}
