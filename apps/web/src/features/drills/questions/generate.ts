import type {
  ClaimKind,
  ClaimQuestion,
  InterrogationCategory,
  ResumeClaimItem,
} from '@opsforge/types'
import { question } from '../../interviewer/bank/author'
import { technologyLabel, technologyTopic } from '../../technologies/catalog'
import { CATEGORIES, CATEGORY_ORDER, conceptsFrom } from './generic'
import { packFor } from './packs'

/** What an interviewer reaches for first, given what kind of claim it is. */
const LEAD: Record<ClaimKind, InterrogationCategory[]> = {
  implementation: ['architecture', 'troubleshooting'],
  design: ['architecture', 'trade-offs'],
  operations: ['troubleshooting', 'incidents'],
  improvement: ['trade-offs', 'observability'],
  leadership: ['leadership', 'trade-offs'],
}

export function categoryOrderFor(kind: ClaimKind): InterrogationCategory[] {
  const lead = LEAD[kind]
  return [...lead, ...CATEGORY_ORDER.filter((c) => !lead.includes(c))]
}

function subjectOf(claim: ResumeClaimItem): string {
  const first = claim.technologies[0]
  return first ? technologyLabel(first) : 'this work'
}

/**
 * Eight questions for one claim, one per interrogation category. Technology-specific rubrics come
 * from authored packs; anything a pack does not cover (and all leadership questions) uses the
 * technology-neutral rubric, which the UI discloses.
 */
export function generateClaimQuestions(claim: ResumeClaimItem): ClaimQuestion[] {
  const pack = packFor(claim.technologies)
  const subject = subjectOf(claim)
  const first = claim.technologies[0]
  const topic = first ? technologyTopic(first) : 'behavioral'

  return categoryOrderFor(claim.kind).map((category) => {
    const def = CATEGORIES[category]
    const packed = category === 'leadership' ? undefined : pack?.categories[category]
    const tail = packed?.prompt ?? def.prompt(subject)
    const rows = packed?.concepts ?? def.generic

    return {
      id: `${claim.id}:${category}`,
      claimId: claim.id,
      category,
      rubric: packed ? 'technology-pack' : 'generic',
      spec: question({
        id: `${claim.id}:${category}`,
        rounds: [def.round],
        topic,
        technologies: claim.technologies,
        difficulty: 'senior',
        prompt: `On your resume: “${claim.text}”. ${tail}`,
        intent: def.intent(subject),
        concepts: conceptsFrom(category, rows),
        expectedSignals: def.signals,
        maxFollowUps: 1,
      }),
    }
  })
}
