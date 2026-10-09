import type {
  CategoryResult,
  Defensibility,
  DefensibilityLevel,
  DrillAttempt,
  InterrogationCategory,
} from '@opsforge/types'
import { CATEGORIES, CATEGORY_ORDER } from './questions/generic'

/** Categories that must be attempted before a claim can be called defensible. */
export const MIN_CATEGORIES_FOR_DEFENSIBLE = 3

const STRONG = 80
const DEFENSIBLE = 65
const SHAKY = 45

function levelFor(score: number, covered: number): DefensibilityLevel {
  if (score >= STRONG && covered >= MIN_CATEGORIES_FOR_DEFENSIBLE + 1) return 'strong'
  if (score >= DEFENSIBLE && covered >= MIN_CATEGORIES_FOR_DEFENSIBLE) return 'defensible'
  if (score >= SHAKY) return 'shaky'
  return 'exposed'
}

function reasonFor(
  level: DefensibilityLevel,
  score: number | null,
  covered: number,
  weakest: string | null,
): string {
  switch (level) {
    case 'untested':
      return 'No drills answered yet. An interviewer can ask about this line, so it is unproven until you have defended it.'
    case 'exposed':
      return `Answers averaged ${score}. ${weakest ? `${weakest} was weakest. ` : ''}This line could cost you if it is probed.`
    case 'shaky':
      return `Answers averaged ${score}. ${weakest ? `${weakest} needs work. ` : ''}Some depth is there but it would not hold up under follow-ups.`
    case 'defensible':
      return `Answers averaged ${score} across ${covered} areas. You can hold this line in an interview.`
    case 'strong':
      return `Answers averaged ${score} across ${covered} areas. Well defended.`
  }
}

/**
 * Deterministic summary of how well one claim has been defended: the mean of the best score in each
 * attempted category. A high mean from fewer than three categories is capped at "shaky", because a
 * claim defended from a single angle is not yet a defended claim.
 */
export function assessClaim(claimId: string, attempts: DrillAttempt[]): Defensibility {
  const own = attempts.filter((a) => a.claimId === claimId)
  const categories: CategoryResult[] = CATEGORY_ORDER.map((category) => {
    const mine = own.filter((a) => a.category === category)
    return {
      category,
      best: mine.length === 0 ? null : Math.max(...mine.map((a) => a.evaluation.score)),
      attempts: mine.length,
    }
  })
  const scored = categories.filter((c): c is CategoryResult & { best: number } => c.best !== null)
  const total = categories.length

  if (scored.length === 0) {
    return {
      claimId,
      level: 'untested',
      score: null,
      categories,
      covered: 0,
      total,
      weakest: null,
      reason: reasonFor('untested', null, 0, null),
    }
  }

  const score = Math.round(scored.reduce((sum, c) => sum + c.best, 0) / scored.length)
  const level = levelFor(score, scored.length)
  const lowest = scored.reduce((min, c) => (c.best < min.best ? c : min))
  const weakest: InterrogationCategory = lowest.category

  return {
    claimId,
    level,
    score,
    categories,
    covered: scored.length,
    total,
    weakest,
    reason: reasonFor(level, score, scored.length, CATEGORIES[weakest].label),
  }
}

export const DEFENSIBILITY_LABEL: Record<DefensibilityLevel, string> = {
  untested: 'Untested',
  exposed: 'Exposed',
  shaky: 'Shaky',
  defensible: 'Defensible',
  strong: 'Strong',
}
