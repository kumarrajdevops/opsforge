import type {
  ArchitectureDocument,
  ComponentCategory,
  NodeImpact,
  RegionRole,
  SimulationResult,
} from '@opsforge/types'
import type {
  GraphModel,
  NodeShape,
  VisualEdge,
  VisualNode,
  VisualPlane,
} from '../../../visuals/graphTypes'
import type { ScenePalette } from '../../../visuals/palette'
import { atHop, buildWave, waveCues, type Wave } from '../../../visuals/wave'
import { buildGraph, isSyncEdge, longestSyncChain, type Graph } from '../graph'

export type ArchitectureView = 'topology' | 'depth'

const SHAPES: Partial<Record<ComponentCategory, NodeShape>> = {
  client: 'octahedron',
  dns: 'octahedron',
  cdn: 'octahedron',
  waf: 'octahedron',
  'load-balancer': 'octahedron',
  database: 'box',
  cache: 'box',
  queue: 'box',
  kafka: 'box',
  storage: 'box',
}

/** Serving and stateful components that should span more than one zone to survive a zone loss. */
const ZONE_SENSITIVE: ComponentCategory[] = [
  'load-balancer',
  'compute',
  'kubernetes',
  'database',
  'cache',
  'queue',
  'kafka',
]

const REGION_ORDER: RegionRole[] = ['global', 'primary', 'secondary']
const REGION_LABEL: Record<RegionRole, string> = {
  global: 'Global',
  primary: 'Primary region',
  secondary: 'Secondary region',
}

const LAYER_GAP = 1.8
const REGION_GAP = 2.8
const SLAB_WIDTH = 10.4
const SLAB_DEPTH = 6

const IMPACT_LABEL: Record<NodeImpact, string> = {
  ok: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

/** The impact wave of a simulation over the document's synchronous dependencies. Null when nothing is affected. */
export function impactWaveOf(graph: Graph, simulation: SimulationResult): Wave | null {
  const impacted = graph.nodes
    .map((n) => n.node.id)
    .filter((id) => (simulation.nodeImpact[id] ?? 'ok') !== 'ok')
  if (impacted.length === 0) return null
  const callees = (id: string) => (graph.out.get(id) ?? []).filter(isSyncEdge).map((e) => e.target)
  const callers = (id: string) => (graph.inc.get(id) ?? []).filter(isSyncEdge).map((e) => e.source)
  return buildWave({ impacted, dependenciesOf: callees, dependentsOf: callers })
}

interface Placed {
  position: readonly [number, number, number]
}

function normaliser(graph: Graph) {
  const xs = graph.nodes.map((n) => n.node.position.x)
  const ys = graph.nodes.map((n) => n.node.position.y)
  const min = (v: number[]) => (v.length ? Math.min(...v) : 0)
  const max = (v: number[]) => (v.length ? Math.max(...v) : 0)
  const cx = (min(xs) + max(xs)) / 2
  const cy = (min(ys) + max(ys)) / 2
  const scale = Math.max((max(xs) - min(xs)) / 9, (max(ys) - min(ys)) / 4.6, 1)
  return (x: number, y: number) => [(x - cx) / scale, (y - cy) / scale] as const
}

/** Longest synchronous distance from an entry point. Cycles are cut by capping the passes. */
export function layerDepths(graph: Graph): { depths: Map<string, number>; supporting: string[] } {
  const involved = new Set<string>()
  for (const e of graph.edges) {
    if (isSyncEdge(e)) {
      involved.add(e.source)
      involved.add(e.target)
    }
  }
  const depths = new Map<string, number>()
  for (const id of involved) depths.set(id, 0)
  const limit = involved.size
  for (let pass = 0; pass < limit; pass++) {
    let changed = false
    for (const e of graph.edges) {
      if (!isSyncEdge(e)) continue
      const next = (depths.get(e.source) ?? 0) + 1
      if (next > (depths.get(e.target) ?? 0) && next < limit) {
        depths.set(e.target, next)
        changed = true
      }
    }
    if (!changed) break
  }
  const supporting = graph.nodes.map((n) => n.node.id).filter((id) => !involved.has(id))
  return { depths, supporting }
}

interface Colors {
  base: (id: string) => string
  changed: (id: string) => string | undefined
}

function impactTone(impact: NodeImpact, palette: ScenePalette): string {
  return impact === 'down'
    ? palette.tones.error
    : impact === 'degraded'
      ? palette.tones.warning
      : palette.tones.success
}

function edgeStyle(kind: string, palette: ScenePalette) {
  const sync = kind === 'traffic' || kind === 'data'
  return { color: sync ? palette.muted : palette.border, dashed: !sync }
}

export interface BuiltArchitecture {
  model: GraphModel
  wave: Wave | null
}

export function buildArchitectureModel(
  document: ArchitectureDocument,
  view: ArchitectureView,
  palette: ScenePalette,
  simulation: SimulationResult | null,
): BuiltArchitecture {
  const graph = buildGraph(document)
  const wave = simulation ? impactWaveOf(graph, simulation) : null
  const critical = new Set(view === 'depth' ? longestSyncChain(graph).nodeIds : [])
  const zoneRisk = (id: string) => {
    const n = graph.byId.get(id)
    return Boolean(n && ZONE_SENSITIVE.includes(n.def.category) && n.node.config.zones < 2)
  }

  const colors: Colors = wave
    ? {
        base: () => palette.tones.success,
        changed: (id) => impactTone(simulation?.nodeImpact[id] ?? 'ok', palette),
      }
    : {
        base: (id) =>
          view === 'depth'
            ? critical.has(id)
              ? palette.tones.primary
              : palette.tones.neutral
            : zoneRisk(id)
              ? palette.tones.warning
              : palette.tones.primary,
        changed: () => undefined,
      }

  const placed = new Map<string, Placed>()
  const planes: VisualPlane[] = []
  let cameraPosition: GraphModel['cameraPosition']
  let target: GraphModel['target']

  if (view === 'topology') {
    const norm = normaliser(graph)
    const regions = REGION_ORDER.filter((r) => graph.nodes.some((n) => n.node.config.region === r))
    const top = ((regions.length - 1) * REGION_GAP) / 2
    regions.forEach((region, i) => {
      const y = top - i * REGION_GAP
      planes.push({
        id: `region-${region}`,
        label: REGION_LABEL[region],
        position: [0, y, 0],
        width: SLAB_WIDTH,
        depth: SLAB_DEPTH,
        color: palette.muted,
      })
      for (const n of graph.nodes.filter((m) => m.node.config.region === region)) {
        const [x, z] = norm(n.node.position.x, n.node.position.y)
        placed.set(n.node.id, { position: [x, y + 0.3, z] })
      }
    })
    cameraPosition = [0, top + 4.5, 11.5]
    target = [0, 0, 0]
  } else {
    const { depths, supporting } = layerDepths(graph)
    const maxDepth = Math.max(0, ...depths.values())
    const layers = new Map<number, string[]>()
    for (const [id, depth] of depths) layers.set(depth, [...(layers.get(depth) ?? []), id])
    if (supporting.length > 0) layers.set(maxDepth + 1, supporting)
    const rows = [...layers.keys()].sort((a, b) => a - b)
    const mid = ((rows.length - 1) * LAYER_GAP) / 2
    rows.forEach((depth, row) => {
      const ids = (layers.get(depth) ?? []).sort(
        (a, b) =>
          (graph.byId.get(a)?.node.position.x ?? 0) - (graph.byId.get(b)?.node.position.x ?? 0),
      )
      const y = mid - row * LAYER_GAP
      const isSupport = supporting.length > 0 && depth === maxDepth + 1
      planes.push({
        id: `layer-${depth}`,
        label: isSupport ? 'Off the request path' : depth === 0 ? 'Entry' : `Hop ${depth}`,
        position: [0, y, 0],
        width: Math.max(5, ids.length * 2.3 + 1),
        depth: 2.2,
        color: palette.muted,
      })
      const spread = 2.3
      ids.forEach((id, i) => {
        placed.set(id, { position: [(i - (ids.length - 1) / 2) * spread, y + 0.3, 0] })
      })
    })
    cameraPosition = [0, 0.6, Math.max(11, mid * 2 + 8)]
    target = [0, 0, 0]
  }

  const nodes: VisualNode[] = graph.nodes.flatMap((n) => {
    const spot = placed.get(n.node.id)
    if (!spot) return []
    const hop = wave?.hops[n.node.id]
    const impact = simulation?.nodeImpact[n.node.id] ?? 'ok'
    const impacted = wave !== null && hop !== undefined
    return [
      {
        id: n.node.id,
        label: n.node.label,
        position: spot.position,
        color: colors.base(n.node.id),
        size: critical.has(n.node.id) ? 0.38 : 0.3,
        shape: SHAPES[n.def.category] ?? 'sphere',
        changeAt: impacted ? atHop(wave, hop) : undefined,
        changedColor: impacted ? colors.changed(n.node.id) : undefined,
        changedPulse: impacted && impact === 'down',
      },
    ]
  })

  const edges: VisualEdge[] = graph.edges.flatMap((e) => {
    if (!placed.has(e.source) || !placed.has(e.target)) return []
    const style = edgeStyle(e.kind, palette)
    const callerHop = wave?.hops[e.source]
    const calleeHop = wave?.hops[e.target]
    const flows =
      wave &&
      isSyncEdge(e) &&
      callerHop !== undefined &&
      calleeHop !== undefined &&
      callerHop > calleeHop
    return [
      {
        id: e.id,
        from: e.source,
        to: e.target,
        ...style,
        flow: flows
          ? {
              start: atHop(wave, calleeHop),
              end: atHop(wave, callerHop),
              color: palette.tones.error,
              reverse: true,
            }
          : undefined,
      },
    ]
  })

  return { model: { nodes, edges, planes, cameraPosition, target }, wave }
}

export interface ComponentRow {
  id: string
  label: string
  category: string
  region: string
  zones: number
  replicas: number
  layer: string
  impact: string
}

/** Text equivalent of the 3D views: one row per component. */
export function componentRows(
  document: ArchitectureDocument,
  simulation: SimulationResult | null,
): ComponentRow[] {
  const graph = buildGraph(document)
  const { depths, supporting } = layerDepths(graph)
  const maxDepth = Math.max(0, ...depths.values())
  return graph.nodes.map((n) => {
    const id = n.node.id
    const depth = depths.get(id)
    return {
      id,
      label: n.node.label,
      category: n.def.category,
      region: REGION_LABEL[n.node.config.region],
      zones: n.node.config.zones,
      replicas: n.node.config.replicas,
      layer: supporting.includes(id)
        ? `Off the request path (layer ${maxDepth + 1})`
        : depth === 0
          ? 'Entry'
          : `Hop ${depth ?? 0}`,
      impact: simulation ? IMPACT_LABEL[simulation.nodeImpact[id] ?? 'ok'] : '—',
    }
  })
}

export function viewDescription(view: ArchitectureView, rows: ComponentRow[], hasWave: boolean) {
  const regions = new Set(rows.map((r) => r.region)).size
  const base =
    view === 'topology'
      ? `Topology of ${rows.length} components across ${regions} ${regions === 1 ? 'region' : 'regions'}, stacked as one slab per region. Components outlined in amber run in a single zone.`
      : `Dependency depth of ${rows.length} components, one row per hop from the entry point along synchronous calls. The longest serving call chain is highlighted.`
  return hasWave ? `${base} A failure is being replayed hop by hop.` : base
}

export { waveCues }
