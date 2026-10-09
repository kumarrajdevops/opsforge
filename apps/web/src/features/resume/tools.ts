import type {
  EvidenceItem,
  RequirementStatus,
  ResumeClaimItem,
  ResumeRecord,
} from '@opsforge/types'
import { assessTechnology } from '../readiness-evidence/compare'
import {
  findTechnology,
  isTool,
  technologyLabel,
  type TechnologyCategory,
} from '../technologies/catalog'

export interface ResumeTool {
  id: string
  label: string
  category: TechnologyCategory | null
  /** Claims on the resume that mention the tool, in resume order. */
  claimIds: string[]
  /** Claims that describe work with it, as opposed to a skills-list entry. */
  workClaimIds: string[]
  status: RequirementStatus
  /** Mean of scored direct answers, or null when none exist. */
  score: number | null
  testedAnswers: number
  reason: string
}

const ORDER: RequirementStatus[] = [
  'weak',
  'claimed-untested',
  'partial',
  'demonstrated',
  'no-evidence',
]

/**
 * Every tool the resume names, with how ready the candidate is on it. Readiness uses the same fixed
 * thresholds as the JD comparison and counts only scored answers; a resume line alone is "claimed".
 * Weakest first, so the list reads as what to work on.
 */
export function assessResumeTools(
  resume: ResumeRecord | null,
  evidence: EvidenceItem[],
): ResumeTool[] {
  if (!resume) return []
  const byTool = new Map<string, ResumeClaimItem[]>()
  for (const claim of resume.claims) {
    for (const id of claim.technologies) byTool.set(id, [...(byTool.get(id) ?? []), claim])
  }

  const tools: ResumeTool[] = [...byTool]
    .filter(([id]) => isTool(id))
    .map(([id, claims]) => {
      const assessment = assessTechnology(id, evidence)
      const tested = evidence.filter(
        (e) => e.technology === id && e.strength === 'tested' && e.score !== null,
      ).length
      return {
        id,
        label: technologyLabel(id),
        category: findTechnology(id)?.category ?? null,
        claimIds: claims.map((c) => c.id),
        workClaimIds: claims.filter((c) => !c.flags.includes('listed-only')).map((c) => c.id),
        status: assessment.status,
        score: assessment.score,
        testedAnswers: tested,
        reason: assessment.reason,
      }
    })

  return tools.sort(
    (a, b) =>
      ORDER.indexOf(a.status) - ORDER.indexOf(b.status) ||
      b.claimIds.length - a.claimIds.length ||
      a.label.localeCompare(b.label),
  )
}
