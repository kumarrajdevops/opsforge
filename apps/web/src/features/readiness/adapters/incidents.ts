import type {
  IncidentEvaluation,
  IncidentScenario,
  IncidentSession,
  ReadinessEvidence,
  TroubleshootingSkillId,
} from '@opsforge/types'
import { evaluateSession } from '../../incident-simulator/evaluator'
import { AttemptBuilder, day, mean } from './shared'

export interface IncidentRun {
  scenario: IncidentScenario
  session: IncidentSession
}

/** Investigation skills that evidence troubleshooting; mitigation and prevention score as incident response. */
const TROUBLESHOOTING_SKILLS: TroubleshootingSkillId[] = [
  'problem-clarification',
  'scope-identification',
  'timeline-analysis',
  'hypothesis-formation',
  'evidence-gathering',
  'isolation',
  'root-cause-reasoning',
  'prioritization',
]

function gapsOf(evaluation: IncidentEvaluation): string[] {
  return evaluation.dimensions
    .flatMap((d) => d.checks)
    .filter((c) => c.credit < 0.5)
    .sort((a, b) => b.weight * (1 - b.credit) - a.weight * (1 - a.credit))
    .slice(0, 3)
    .map((c) => c.label)
}

/**
 * The simulator's deterministic evaluator is the only scorer. An unfinished run still counts, at
 * half weight, because the dimensions it never attempted are simply absent rather than zero.
 */
export function incidentEvidence(runs: IncidentRun[]): ReadinessEvidence[] {
  const out: ReadinessEvidence[] = []
  for (const { scenario, session } of runs) {
    if (session.events.length === 0) continue
    const evaluation = evaluateSession(scenario, session.events, session.elapsedSeconds)
    if (evaluation.overall === null) continue

    const builder = new AttemptBuilder({
      attemptId: `incident:${scenario.id}:${session.startedAt}`,
      origin: 'incident',
      at: session.startedAt,
      label: `Incident ${day(session.startedAt)}, ${scenario.title}`,
      topic: scenario.title,
      basis: 'deterministic',
      reliability: evaluation.complete ? 1 : 0.5,
    })
    const gaps = gapsOf(evaluation)
    const skill = (ids: TroubleshootingSkillId[]) =>
      mean(evaluation.skills.filter((s) => ids.includes(s.id)).map((s) => s.score))
    const communication = evaluation.dimensions.find((d) => d.id === 'communication')?.score ?? null

    builder
      .add('incidents', evaluation.overall, { gaps })
      .add('troubleshooting', skill(TROUBLESHOOTING_SKILLS), { gaps })
      .add('communication', communication)
    if (scenario.kind === 'security') builder.add('security', evaluation.overall, { gaps })
    out.push(...builder.items)
  }
  return out
}
