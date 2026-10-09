import type { IncidentScenario, ServiceHealth } from '@opsforge/types'
import type { GraphModel, NodeShape, VisualEdge, VisualNode } from '../../../visuals/graphTypes'
import type { ScenePalette } from '../../../visuals/palette'
import { atHop, buildWave, waveCues, type Wave } from '../../../visuals/wave'

export interface MapService {
  id: string
  name: string
  kind: string
  dependsOn: string[]
  health: ServiceHealth
}

export const healthText: Record<ServiceHealth, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

const SHAPES: Record<string, NodeShape> = {
  database: 'box',
  cache: 'box',
  queue: 'box',
  storage: 'box',
  web: 'octahedron',
  external: 'octahedron',
  platform: 'octahedron',
}

const LAYER_GAP = 1.9
const SPREAD = 2.6

function healthColor(health: ServiceHealth, palette: ScenePalette): string {
  return health === 'down'
    ? palette.tones.error
    : health === 'degraded'
      ? palette.tones.warning
      : palette.tones.success
}

/** Distance from the nearest caller-less service, along dependencies. Cycles are cut by capping passes. */
export function serviceLayers(services: readonly MapService[]): Map<string, number> {
  const ids = new Set(services.map((s) => s.id))
  const depth = new Map(services.map((s) => [s.id, 0]))
  for (let pass = 0; pass < services.length; pass++) {
    let changed = false
    for (const service of services) {
      for (const dep of service.dependsOn) {
        if (!ids.has(dep)) continue
        const next = (depth.get(service.id) ?? 0) + 1
        if (next > (depth.get(dep) ?? 0) && next < services.length) {
          depth.set(dep, next)
          changed = true
        }
      }
    }
    if (!changed) break
  }
  return depth
}

function layout(services: readonly MapService[]) {
  const depth = serviceLayers(services)
  const rows = new Map<number, string[]>()
  for (const service of services) {
    const d = depth.get(service.id) ?? 0
    rows.set(d, [...(rows.get(d) ?? []), service.id])
  }
  const depths = [...rows.keys()].sort((a, b) => a - b)
  const mid = ((depths.length - 1) * LAYER_GAP) / 2
  const positions = new Map<string, readonly [number, number, number]>()
  depths.forEach((d, row) => {
    const ids = rows.get(d) ?? []
    ids.forEach((id, i) => {
      positions.set(id, [(i - (ids.length - 1) / 2) * SPREAD, mid - row * LAYER_GAP, 0])
    })
  })
  return { positions, rowCount: depths.length }
}

/** The outage as hops, from where the damage starts to the callers it reaches. Null when nothing is unhealthy. */
export function incidentWave(services: readonly MapService[]): Wave | null {
  const impacted = services.filter((s) => s.health !== 'healthy').map((s) => s.id)
  if (impacted.length === 0) return null
  const byId = new Map(services.map((s) => [s.id, s]))
  return buildWave({
    impacted,
    dependenciesOf: (id) => byId.get(id)?.dependsOn ?? [],
    dependentsOf: (id) => services.filter((s) => s.dependsOn.includes(id)).map((s) => s.id),
  })
}

export interface ServiceModelOptions {
  /** Replay the spread: services start healthy and change at the hop they are reached. */
  wave?: Wave | null
  /** Marks the root cause in the label. */
  rootCauseId?: string
}

export function buildServiceModel(
  services: readonly MapService[],
  palette: ScenePalette,
  { wave = null, rootCauseId }: ServiceModelOptions = {},
): GraphModel {
  const { positions, rowCount } = layout(services)
  const nodes: VisualNode[] = services.flatMap((s) => {
    const position = positions.get(s.id)
    if (!position) return []
    const hop = wave?.hops[s.id]
    const replayed = wave !== null && hop !== undefined
    return [
      {
        id: s.id,
        label: s.id === rootCauseId ? `${s.name} (root cause)` : s.name,
        position: [position[0], position[1], position[2]] as const,
        color: wave ? palette.tones.success : healthColor(s.health, palette),
        size: 0.34,
        shape: SHAPES[s.kind] ?? 'sphere',
        pulse: !wave && s.health === 'down',
        changeAt: replayed ? atHop(wave, hop) : undefined,
        changedColor: replayed ? healthColor(s.health, palette) : undefined,
        changedPulse: replayed && s.health === 'down',
      },
    ]
  })

  const known = new Set(services.map((s) => s.id))
  const edges: VisualEdge[] = services.flatMap((s) =>
    s.dependsOn
      .filter((dep) => known.has(dep))
      .map((dep) => {
        const callerHop = wave?.hops[s.id]
        const calleeHop = wave?.hops[dep]
        const flows =
          wave && callerHop !== undefined && calleeHop !== undefined && callerHop > calleeHop
        return {
          id: `${s.id}->${dep}`,
          from: s.id,
          to: dep,
          color: palette.muted,
          flow: flows
            ? {
                start: atHop(wave, calleeHop),
                end: atHop(wave, callerHop),
                color: palette.tones.error,
                reverse: true,
              }
            : undefined,
        }
      }),
  )

  return {
    nodes,
    edges,
    planes: [],
    cameraPosition: [0, 0.4, Math.max(8, rowCount * 2.6 + 3)],
    target: [0, 0, 0],
  }
}

export interface ServiceRow {
  id: string
  name: string
  kind: string
  health: string
  dependsOn: string
  spread: string
}

/** Text equivalent of the map. `wave` adds the hop at which each service is reached. */
export function serviceRows(services: readonly MapService[], wave: Wave | null): ServiceRow[] {
  const names = new Map(services.map((s) => [s.id, s.name]))
  return services.map((s) => {
    const hop = wave?.hops[s.id]
    return {
      id: s.id,
      name: s.name,
      kind: s.kind,
      health: healthText[s.health],
      dependsOn: s.dependsOn.map((d) => names.get(d) ?? d).join(', ') || 'None',
      spread: hop === undefined ? '—' : hop === 0 ? 'Origin' : `Hop ${hop}`,
    }
  })
}

export function mapDescription(services: readonly MapService[], replay: boolean): string {
  const count = (h: ServiceHealth) => services.filter((s) => s.health === h).length
  const base = `Service map of ${services.length} services. ${count('down')} down, ${count('degraded')} degraded, ${count('healthy')} healthy. Callers sit above the services they depend on.`
  return replay
    ? `${base} The outage is replayed from where it started to the callers it reached.`
    : base
}

/** The service the scenario's model answer names as the root cause, if any. */
export function rootCauseServiceId(scenario: IncidentScenario): string | undefined {
  return scenario.hypotheses.find((h) => h.verdict === 'root-cause')?.serviceId
}

export { waveCues }
