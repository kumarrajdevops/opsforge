import type { ArchitectureVersion, ReadinessEvidence, Scenario } from '@opsforge/types'
import { AttemptBuilder, day } from './shared'

export interface ArchitectureDesign {
  scenario: Scenario
  /** The latest saved version of the design. */
  version: ArchitectureVersion
}

/**
 * The latest saved version of each scenario is the evidence; earlier drafts are iteration, not
 * separate attempts. Scores come from the Studio's deterministic evaluator and nothing else.
 */
export function architectureEvidence(designs: ArchitectureDesign[]): ReadinessEvidence[] {
  const out: ReadinessEvidence[] = []
  for (const { scenario, version } of designs) {
    const summary = version.summary
    if (summary.overall === null) continue

    const builder = new AttemptBuilder({
      attemptId: `architecture:${scenario.id}:v${version.number}`,
      origin: 'architecture',
      at: version.createdAt,
      label: `Design ${day(version.createdAt)}, ${scenario.title}`,
      topic: scenario.title,
      basis: 'deterministic',
    })
    const weakDimensions = Object.entries(summary.dimensions)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] < 50)
      .map(([id, score]) => `${id.replace(/-/g, ' ')} scored ${Math.round(score)}`)
    const gaps = [
      ...(summary.criticalFailures > 0
        ? [
            `${summary.criticalFailures} critical check${summary.criticalFailures === 1 ? '' : 's'} failing`,
          ]
        : []),
      ...weakDimensions,
    ].slice(0, 3)

    builder.add('architecture', summary.overall, { gaps })
    const security = summary.dimensions.security
    if (typeof security === 'number') builder.add('security', security, { gaps })
    out.push(...builder.items)
  }
  return out
}
