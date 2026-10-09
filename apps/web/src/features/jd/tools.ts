import type { EvidenceItem, JdAnalysis, JdPriority, RequirementStatus } from '@opsforge/types'
import { assessTechnology } from '../readiness-evidence/compare'
import {
  findTechnology,
  isTool,
  technologyLabel,
  type TechnologyCategory,
} from '../technologies/catalog'

export interface JdTool {
  id: string
  label: string
  category: TechnologyCategory | null
  priority: JdPriority
  /** Label of the "one of" group when the posting names this tool as one choice among several. */
  choiceOf: string | null
  mentions: number
  /** The sentence in the posting that decided the priority. */
  quote: string
  status: RequirementStatus
  /** Mean of scored direct answers, or null when none exist. */
  score: number | null
  testedAnswers: number
  /** Resume lines that mention the tool. */
  claims: number
  reason: string
}

const ORDER: RequirementStatus[] = [
  'weak',
  'claimed-untested',
  'no-evidence',
  'partial',
  'demonstrated',
]

/**
 * Every tool the posting names, with how ready the candidate is on it. Uses the same fixed
 * thresholds as the requirement comparison and counts only scored answers. Required before
 * preferred, then weakest first, so each list reads as what to work on.
 */
export function assessJdTools(jd: JdAnalysis | null, evidence: EvidenceItem[]): JdTool[] {
  if (!jd) return []
  const groups = new Map((jd.alternatives ?? []).map((g) => [g.id, g.label]))

  const tools = jd.technologies
    .filter((t) => isTool(t.id))
    .map((t): JdTool => {
      const assessment = assessTechnology(t.id, evidence)
      return {
        id: t.id,
        label: technologyLabel(t.id),
        category: findTechnology(t.id)?.category ?? null,
        priority: t.priority,
        choiceOf: t.group ? (groups.get(t.group) ?? null) : null,
        mentions: t.mentions,
        quote: t.quote,
        status: assessment.status,
        score: assessment.score,
        testedAnswers: evidence.filter(
          (e) => e.technology === t.id && e.strength === 'tested' && e.score !== null,
        ).length,
        claims: evidence.filter(
          (e) => e.technology === t.id && e.source === 'resume' && e.strength === 'claimed',
        ).length,
        reason: assessment.reason,
      }
    })

  return tools.sort(
    (a, b) =>
      Number(a.priority === 'preferred') - Number(b.priority === 'preferred') ||
      ORDER.indexOf(a.status) - ORDER.indexOf(b.status) ||
      b.mentions - a.mentions ||
      a.label.localeCompare(b.label),
  )
}
