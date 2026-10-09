import { describe, expect, it } from 'vitest'
import type { FailureScenario } from '@opsforge/types'
import type { ScenePalette } from '../../../visuals/palette'
import { buildGraph } from '../graph'
import { SCENARIOS, starterDocument } from '../scenarios'
import { simulateFailure } from '../simulation'
import {
  buildArchitectureModel,
  componentRows,
  impactWaveOf,
  layerDepths,
  viewDescription,
  waveCues,
} from './graphModels'

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

const scenario = SCENARIOS[0]!
const doc = starterDocument(scenario.id)

function simulate(failure: FailureScenario) {
  return simulateFailure(scenario, doc, failure)
}

describe('architecture visual models', () => {
  it('places every component in both views', () => {
    for (const view of ['topology', 'depth'] as const) {
      const { model } = buildArchitectureModel(doc, view, palette, null)
      expect(model.nodes.map((n) => n.id).sort()).toEqual(doc.nodes.map((n) => n.id).sort())
      expect(model.planes.length).toBeGreaterThan(0)
      for (const edge of model.edges) {
        expect(model.nodes.some((n) => n.id === edge.from)).toBe(true)
        expect(model.nodes.some((n) => n.id === edge.to)).toBe(true)
      }
    }
  })

  it('stacks topology by region and depth by hop', () => {
    const topology = buildArchitectureModel(doc, 'topology', palette, null).model
    expect(topology.planes.every((p) => p.id.startsWith('region-'))).toBe(true)
    const depth = buildArchitectureModel(doc, 'depth', palette, null).model
    expect(depth.planes.every((p) => p.id.startsWith('layer-'))).toBe(true)
  })

  it('puts callers on earlier layers than their callees', () => {
    const { depths } = layerDepths(buildGraph(doc))
    const graph = buildGraph(doc)
    for (const edge of graph.edges) {
      const from = depths.get(edge.source)
      const to = depths.get(edge.target)
      if (
        from !== undefined &&
        to !== undefined &&
        (edge.kind === 'traffic' || edge.kind === 'data')
      )
        expect(to).toBeGreaterThan(from)
    }
  })

  it('has no wave without a simulation, and a hop-ordered wave with one', () => {
    expect(buildArchitectureModel(doc, 'depth', palette, null).wave).toBeNull()
    const target = doc.nodes.find(
      (n) => buildGraph(doc).byId.get(n.id)?.def.category === 'database',
    )!
    const sim = simulate({ kind: 'node-loss', nodeId: target.id })
    const graph = buildGraph(doc)
    const wave = impactWaveOf(graph, sim)
    expect(wave).not.toBeNull()
    expect(wave!.hops[target.id]).toBe(0)
    const { model } = buildArchitectureModel(doc, 'depth', palette, sim)
    const failed = model.nodes.find((n) => n.id === target.id)!
    expect(failed.changeAt).toBeDefined()
    expect(failed.changedColor).toBe(palette.tones.error)
    const healthy = model.nodes.filter((n) => n.changeAt === undefined)
    for (const node of healthy) expect(sim.nodeImpact[node.id] ?? 'ok').toBe('ok')
  })

  it('table rows and cues cover the same components', () => {
    const sim = simulate({ kind: 'region-loss' })
    const rows = componentRows(doc, sim)
    expect(rows).toHaveLength(doc.nodes.length)
    const wave = impactWaveOf(buildGraph(doc), sim)
    if (wave) {
      const cues = waveCues(wave, (id) => id)
      expect(cues).toHaveLength(wave.steps.length)
      expect(rows.filter((r) => r.impact !== 'Healthy' && r.impact !== '—').length).toBe(
        Object.keys(wave.hops).length,
      )
    }
    expect(componentRows(doc, null).every((r) => r.impact === '—')).toBe(true)
  })

  it('describes the view for assistive tech', () => {
    const rows = componentRows(doc, null)
    expect(viewDescription('topology', rows, false)).toContain(`${rows.length} components`)
    expect(viewDescription('depth', rows, true)).toContain('replayed')
  })
})
