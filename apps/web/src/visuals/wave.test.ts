import { describe, expect, it } from 'vitest'
import { atHop, buildWave } from './wave'

// web -> api -> db ; web -> cache ; worker (async side effect, no sync edges)
const calls: Record<string, string[]> = {
  web: ['api', 'cache'],
  api: ['db'],
  db: [],
  cache: [],
  worker: [],
}
const dependenciesOf = (id: string) => calls[id] ?? []
const dependentsOf = (id: string) =>
  Object.entries(calls)
    .filter(([, deps]) => deps.includes(id))
    .map(([caller]) => caller)

describe('buildWave', () => {
  it('starts at the failed dependency and travels to its callers', () => {
    const wave = buildWave({ impacted: ['web', 'api', 'db'], dependenciesOf, dependentsOf })
    expect(wave.hops).toEqual({ db: 0, api: 1, web: 2 })
    expect(wave.steps.map((s) => s.ids)).toEqual([['db'], ['api'], ['web']])
  })

  it('lands steps strictly after the healthy start and before the end', () => {
    const wave = buildWave({ impacted: ['web', 'api', 'db'], dependenciesOf, dependentsOf })
    const times = wave.steps.map((s) => s.at)
    expect(times[0]).toBeGreaterThan(0)
    expect(times[times.length - 1]).toBeLessThan(1)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
  })

  it('keeps impacted ids it cannot reach in a final step instead of dropping them', () => {
    const cyclic = {
      a: ['b'],
      b: ['a'],
    } as Record<string, string[]>
    const wave = buildWave({
      impacted: ['a', 'b'],
      dependenciesOf: (id) => cyclic[id] ?? [],
      dependentsOf: (id) =>
        Object.entries(cyclic)
          .filter(([, d]) => d.includes(id))
          .map(([c]) => c),
    })
    expect(Object.keys(wave.hops).sort()).toEqual(['a', 'b'])
    expect(wave.steps).toHaveLength(1)
  })

  it('handles an empty impact set', () => {
    const wave = buildWave({ impacted: [], dependenciesOf, dependentsOf })
    expect(wave.steps).toEqual([])
  })

  it('atHop falls back to the end for an unknown hop', () => {
    const wave = buildWave({ impacted: ['db'], dependenciesOf, dependentsOf })
    expect(atHop(wave, 0)).toBeCloseTo(0.5)
    expect(atHop(wave, 9)).toBe(1)
  })
})
