import { describe, expect, it } from 'vitest'
import type { ScenePalette } from '../../../visuals/palette'
import { scenarios } from '../scenarios'
import {
  buildServiceModel,
  incidentWave,
  mapDescription,
  rootCauseServiceId,
  serviceLayers,
  serviceRows,
  type MapService,
} from './serviceGraph'

const palette: ScenePalette = {
  text: '#111',
  muted: '#888',
  surface: '#fff',
  border: '#ccc',
  tones: {
    neutral: 'neutral',
    primary: 'primary',
    ai: 'ai',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  },
}

const chain: MapService[] = [
  { id: 'web', name: 'Web', kind: 'web', dependsOn: ['api'], health: 'degraded' },
  { id: 'api', name: 'API', kind: 'api', dependsOn: ['db', 'cache'], health: 'degraded' },
  { id: 'db', name: 'DB', kind: 'database', dependsOn: [], health: 'down' },
  { id: 'cache', name: 'Cache', kind: 'cache', dependsOn: [], health: 'healthy' },
]

describe('service graph', () => {
  it('layers callers above their dependencies', () => {
    const layers = serviceLayers(chain)
    expect(layers.get('web')).toBe(0)
    expect(layers.get('api')).toBe(1)
    expect(layers.get('db')).toBe(2)
  })

  it('terminates on a dependency cycle', () => {
    const cyclic: MapService[] = [
      { id: 'a', name: 'A', kind: 'api', dependsOn: ['b'], health: 'down' },
      { id: 'b', name: 'B', kind: 'api', dependsOn: ['a'], health: 'down' },
    ]
    expect(serviceLayers(cyclic).size).toBe(2)
    expect(buildServiceModel(cyclic, palette).nodes).toHaveLength(2)
  })

  it('starts the wave at the failing dependency and walks up to its callers', () => {
    const wave = incidentWave(chain)!
    expect(wave.hops).toEqual({ db: 0, api: 1, web: 2 })
    expect(incidentWave(chain.map((s) => ({ ...s, health: 'healthy' as const })))).toBeNull()
  })

  it('shows current health live and starts healthy in a replay', () => {
    const live = buildServiceModel(chain, palette)
    expect(live.nodes.find((n) => n.id === 'db')!.color).toBe('error')
    expect(live.nodes.find((n) => n.id === 'cache')!.color).toBe('success')
    const replay = buildServiceModel(chain, palette, {
      wave: incidentWave(chain),
      rootCauseId: 'db',
    })
    const db = replay.nodes.find((n) => n.id === 'db')!
    expect(db.color).toBe('success')
    expect(db.changedColor).toBe('error')
    expect(db.label).toContain('root cause')
    expect(replay.nodes.find((n) => n.id === 'cache')!.changeAt).toBeUndefined()
    expect(replay.edges.find((e) => e.id === 'api->db')!.flow?.reverse).toBe(true)
    expect(replay.edges.find((e) => e.id === 'api->cache')!.flow).toBeUndefined()
  })

  it('tables every service with its place in the spread', () => {
    const rows = serviceRows(chain, incidentWave(chain))
    expect(rows.map((r) => r.spread)).toEqual(['Hop 2', 'Hop 1', 'Origin', '—'])
    expect(rows[1]!.dependsOn).toBe('DB, Cache')
    expect(mapDescription(chain, false)).toContain('1 down, 2 degraded, 1 healthy')
  })

  it('works on every shipped scenario', () => {
    for (const scenario of scenarios) {
      const services = scenario.services
      const model = buildServiceModel(services, palette, { wave: incidentWave(services) })
      expect(model.nodes).toHaveLength(services.length)
      const wave = incidentWave(services)
      if (wave)
        expect(Object.keys(wave.hops).sort()).toEqual(
          services
            .filter((s) => s.health !== 'healthy')
            .map((s) => s.id)
            .sort(),
        )
      const root = rootCauseServiceId(scenario)
      if (root) expect(services.some((s) => s.id === root)).toBe(true)
    }
  })
})
