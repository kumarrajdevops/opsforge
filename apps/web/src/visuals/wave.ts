export interface WaveStep {
  hop: number
  ids: string[]
  /** Normalised playback time (0..1) at which this step lands. */
  at: number
}

export interface Wave {
  /** Hop at which each impacted id is reached. Absent for ids that are not impacted. */
  hops: Record<string, number>
  steps: WaveStep[]
}

export interface WaveInput {
  /** Ids that end up unhealthy, in a stable display order. */
  impacted: readonly string[]
  /** What `id` calls (its dependencies). */
  dependenciesOf: (id: string) => readonly string[]
  /** Who calls `id` (the things that break when it breaks). */
  dependentsOf: (id: string) => readonly string[]
}

/**
 * Orders an outage as hops. Hop 0 is where the damage starts: impacted things with no impacted
 * dependency. Each further hop is whatever calls the previous hop, because failures travel
 * against the direction of the call. Impacted ids that cannot be reached that way (a cycle, or an
 * asynchronous side effect) land in a final step instead of being dropped.
 * Playback time 0 is the healthy system, so the first step lands after a short lead-in.
 */
export function buildWave({ impacted, dependenciesOf, dependentsOf }: WaveInput): Wave {
  const set = new Set(impacted)
  const hops: Record<string, number> = {}
  let frontier = impacted.filter((id) => !dependenciesOf(id).some((d) => set.has(d)))
  const levels: string[][] = []

  while (frontier.length > 0) {
    const hop = levels.length
    levels.push(frontier)
    for (const id of frontier) hops[id] = hop
    const next: string[] = []
    for (const id of frontier) {
      for (const caller of dependentsOf(id)) {
        if (set.has(caller) && hops[caller] === undefined && !next.includes(caller)) {
          next.push(caller)
        }
      }
    }
    frontier = next
  }

  const rest = impacted.filter((id) => hops[id] === undefined)
  if (rest.length > 0) {
    for (const id of rest) hops[id] = levels.length
    levels.push([...rest])
  }

  const total = levels.length
  return {
    hops,
    steps: levels.map((ids, hop) => ({ hop, ids, at: (hop + 1) / (total + 1) })),
  }
}

/** Playback time at which a hop lands. */
export function atHop(wave: Wave, hop: number): number {
  return wave.steps[hop]?.at ?? 1
}

/** One playback cue per hop, named after what fails there. */
export function waveCues(
  wave: Wave,
  nameOf: (id: string) => string,
): { id: string; label: string; at: number }[] {
  return wave.steps.map((step) => ({
    id: `hop-${step.hop}`,
    label: `${step.hop === 0 ? 'Origin' : `Hop ${step.hop}`}: ${step.ids.map(nameOf).join(', ')}`,
    at: step.at,
  }))
}
