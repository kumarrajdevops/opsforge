import type {
  EvidenceItem,
  JdAnalysis,
  JdAlternativeGroup,
  JdComparison,
  RequirementAssessment,
  RequirementStatus,
} from '@opsforge/types'
import { findTechnology, TECHNOLOGIES, technologyLabel } from '../technologies/catalog'

const DEMONSTRATED_MEAN = 70
const PARTIAL_MEAN = 50
const ADJACENT_MEAN = 60
const EVIDENCE_SHOWN = 6

function mean(values: number[]): number {
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

/** Technologies related to `id` in either direction. */
export function adjacentTo(id: string): string[] {
  const own = findTechnology(id)?.related ?? []
  const reverse = TECHNOLOGIES.filter((t) => t.related?.includes(id)).map((t) => t.id)
  return [...new Set([...own, ...reverse])].filter((other) => other !== id)
}

function assess(
  base: Pick<RequirementAssessment, 'id' | 'kind' | 'label' | 'priority' | 'technologies'>,
  evidence: EvidenceItem[],
): RequirementAssessment {
  if (base.technologies.length === 0) {
    return {
      ...base,
      status: 'no-evidence',
      score: null,
      evidence: [],
      reason:
        'Nothing in ForgeReady measures this yet, so it cannot be compared. Be ready to give a real example.',
    }
  }

  const direct = evidence.filter((e) => base.technologies.includes(e.technology))
  const tested = direct.filter((e) => e.strength === 'tested' && e.score !== null)
  const claimed = direct.filter((e) => e.strength === 'claimed')
  const adjacentIds = new Set(base.technologies.flatMap(adjacentTo))
  const origin = (e: EvidenceItem) => `${e.source}|${e.label}|${e.at}`
  const directOrigins = new Set(direct.map(origin))
  const adjacentTested = evidence.filter(
    (e) =>
      adjacentIds.has(e.technology) &&
      !base.technologies.includes(e.technology) &&
      !directOrigins.has(origin(e)) &&
      e.strength === 'tested' &&
      e.score !== null,
  )
  const asAdjacent = adjacentTested.map((e) => ({ ...e, adjacent: true }))

  const shown = (items: EvidenceItem[]) =>
    [...items]
      .sort(
        (a, b) =>
          Number(a.strength === 'claimed') - Number(b.strength === 'claimed') ||
          (b.score ?? 0) - (a.score ?? 0),
      )
      .slice(0, EVIDENCE_SHOWN)

  const subject = base.technologies.map(technologyLabel).join(' / ')

  if (tested.length > 0) {
    const score = mean(tested.map((e) => e.score ?? 0))
    let status: RequirementStatus
    let reason: string
    if (score >= DEMONSTRATED_MEAN && tested.length >= 2) {
      status = 'demonstrated'
      reason = `${tested.length} scored answers on ${subject} averaging ${score}.`
    } else if (score >= DEMONSTRATED_MEAN) {
      status = 'partial'
      reason = `One scored answer on ${subject} (${score}). Strong, but a single answer is thin evidence.`
    } else if (score >= PARTIAL_MEAN) {
      status = 'partial'
      reason = `${tested.length} scored ${tested.length === 1 ? 'answer' : 'answers'} on ${subject} averaging ${score}. Some depth, with gaps.`
    } else {
      status = 'weak'
      reason = `${tested.length} scored ${tested.length === 1 ? 'answer' : 'answers'} on ${subject} averaging ${score}. Below the bar for this requirement.`
    }
    return {
      ...base,
      status,
      score,
      evidence: shown([...tested, ...claimed, ...asAdjacent]),
      reason,
    }
  }

  if (claimed.length > 0) {
    return {
      ...base,
      status: 'claimed-untested',
      score: null,
      evidence: shown([...claimed, ...asAdjacent]),
      reason: `${subject} is on your resume but you have not been tested on it. An interviewer will test it.`,
    }
  }

  if (adjacentTested.length > 0) {
    const score = mean(adjacentTested.map((e) => e.score ?? 0))
    if (score >= ADJACENT_MEAN) {
      return {
        ...base,
        status: 'partial',
        score: null,
        evidence: shown(asAdjacent),
        reason: `No direct ${subject} evidence, but related work scored ${score}. Expect to be asked how it transfers.`,
      }
    }
  }

  return {
    ...base,
    status: 'no-evidence',
    score: null,
    evidence: shown(asAdjacent),
    reason: `No resume claim and no scored answer for ${subject}.`,
  }
}

const STATUS_RANK: Record<RequirementStatus, number> = {
  demonstrated: 4,
  partial: 3,
  weak: 2,
  'claimed-untested': 1,
  'no-evidence': 0,
}

/**
 * "At least one of" requirement: each option is assessed on its own and the group stands where its
 * best-placed option stands, because meeting any one of them satisfies the posting.
 */
function assessGroup(group: JdAlternativeGroup, evidence: EvidenceItem[]): RequirementAssessment {
  const assessed = group.options.map((id) => ({
    id,
    assessment: assessTechnology(id, evidence),
  }))
  const best = [...assessed].sort(
    (a, b) =>
      STATUS_RANK[b.assessment.status] - STATUS_RANK[a.assessment.status] ||
      (b.assessment.score ?? -1) - (a.assessment.score ?? -1),
  )[0]
  if (!best) throw new Error('An alternative group needs options.')
  const { assessment } = best
  return {
    id: `group:${group.id}`,
    kind: 'alternative',
    label: group.label,
    priority: group.priority,
    technologies: [best.id],
    status: assessment.status,
    score: assessment.score,
    evidence: assessment.evidence,
    reason: `Any one of these meets the requirement. Closest: ${technologyLabel(best.id)}. ${assessment.reason}`,
    options: assessed.map(({ id, assessment: a }) => ({
      technology: id,
      label: technologyLabel(id),
      status: a.status,
      score: a.score,
    })),
  }
}

/** Readiness for one technology, by the same thresholds the JD comparison uses. */
export function assessTechnology(id: string, evidence: EvidenceItem[]): RequirementAssessment {
  return assess(
    {
      id: `tech:${id}`,
      kind: 'technology',
      label: technologyLabel(id),
      priority: 'required',
      technologies: [id],
    },
    evidence,
  )
}

/**
 * Compares what the posting asks for with the evidence on file. Deterministic: status comes from
 * fixed thresholds over scored answers, never from a model's opinion.
 */
export function compareJd(jd: JdAnalysis, evidence: EvidenceItem[]): JdComparison {
  const assessments: RequirementAssessment[] = [
    ...(jd.alternatives ?? []).map((g) => assessGroup(g, evidence)),
    ...jd.technologies
      .filter((t) => !t.group)
      .map((t) =>
        assess(
          {
            id: `tech:${t.id}`,
            kind: 'technology',
            label: t.label,
            priority: t.priority,
            technologies: [t.id],
          },
          evidence,
        ),
      ),
    ...jd.skills.map((s) =>
      assess(
        {
          id: s.id,
          kind: 'skill',
          label: s.label,
          priority: s.priority,
          technologies: s.evidenceTechnology ? [s.evidenceTechnology] : [],
        },
        evidence,
      ),
    ),
  ]

  const counts: Record<RequirementStatus, number> = {
    demonstrated: 0,
    partial: 0,
    weak: 0,
    'claimed-untested': 0,
    'no-evidence': 0,
  }
  for (const a of assessments) counts[a.status] += 1

  const required = assessments.filter((a) => a.priority === 'required' && a.technologies.length > 0)
  const share = (n: number) => (required.length === 0 ? 0 : Math.round((n / required.length) * 100))

  return {
    assessments,
    requiredCoverage: share(
      required.filter((a) => a.status === 'demonstrated' || a.status === 'partial').length,
    ),
    requiredDemonstrated: share(required.filter((a) => a.status === 'demonstrated').length),
    counts,
    testedEvidenceCount: evidence.filter((e) => e.strength === 'tested').length,
  }
}
