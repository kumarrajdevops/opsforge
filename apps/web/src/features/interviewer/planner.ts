import type {
  InterviewRound,
  InterviewSession,
  QuestionDifficulty,
  QuestionOrigin,
  QuestionSpec,
} from '@opsforge/types'
import { questionBank } from './bank'
import { jdQuestion, resumeQuestion } from './grounding'
import { createRng } from './rng'

export interface PlannedQuestion {
  spec: QuestionSpec
  origin: QuestionOrigin
  groundedIn?: string
}

const DIFFICULTY_RANK: Record<QuestionDifficulty, number> = {
  basic: 0,
  intermediate: 1,
  senior: 2,
  staff: 3,
}

/** Mean score of closed threads so far; the planner's only view of how the candidate is doing. */
export function runningPerformance(session: InterviewSession): number | null {
  const scores = session.rounds.flatMap((r) =>
    r.threads.flatMap((t) => (t.evaluation ? [t.evaluation.score] : [])),
  )
  return scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length
}

/** Difficulty to aim for: the level's baseline, nudged by how the candidate has done so far. */
export function targetDifficulty(session: InterviewSession, round: InterviewRound): number {
  let target = session.config.level === 'staff' ? 3 : 2
  if (round.kind === 'screening') target -= 1
  const performance = runningPerformance(session)
  if (performance !== null) {
    if (performance >= 78) target += 1
    else if (performance < 45) target -= 1
  }
  return Math.max(0, Math.min(3, target))
}

function askedIds(session: InterviewSession): Set<string> {
  return new Set(session.rounds.flatMap((r) => r.threads.map((t) => t.spec.id)))
}

function groundedQuestion(
  session: InterviewSession,
  round: InterviewRound,
  asked: Set<string>,
): PlannedQuestion | null {
  const { resumeClaims, jdRequirements } = session.config.context
  const position = round.threads.length
  const used = (id: string) =>
    session.rounds.some((r) => r.threads.some((t) => t.groundedIn === id))

  const claim = resumeClaims.find((c) => !used(c.id))
  const requirement = jdRequirements
    .filter((r) => !used(r.id))
    .sort((a, b) => Number(b.priority === 'must') - Number(a.priority === 'must'))[0]

  const resumeRounds = ['screening', 'technical', 'final']
  const jdRounds = ['technical', 'screening', 'final']

  // JD requirement leads the technical round; resume interrogation comes second in a round.
  if (
    requirement &&
    jdRounds.includes(round.kind) &&
    position === (round.kind === 'technical' ? 0 : 1)
  ) {
    const fromBank = questionBank
      .filter(
        (q) =>
          !asked.has(q.id) &&
          q.rounds.includes(round.kind) &&
          q.technologies.includes(requirement.technology),
      )
      .sort((a, b) => a.id.localeCompare(b.id))[0]
    return fromBank
      ? { spec: fromBank, origin: 'jd', groundedIn: requirement.id }
      : { spec: jdQuestion(requirement), origin: 'jd', groundedIn: requirement.id }
  }
  if (claim && resumeRounds.includes(round.kind) && position === 1) {
    return { spec: resumeQuestion(claim), origin: 'resume', groundedIn: claim.id }
  }
  return null
}

/**
 * Chooses the next main question for the round. Deterministic for a given session: ties are broken by a
 * generator seeded from the config seed and the number of questions asked so far.
 */
export function selectQuestion(
  session: InterviewSession,
  round: InterviewRound,
  bank: readonly QuestionSpec[] = questionBank,
): PlannedQuestion | null {
  const asked = askedIds(session)
  const grounded = groundedQuestion(session, round, asked)
  if (grounded) return grounded

  const candidates = bank.filter((q) => q.rounds.includes(round.kind) && !asked.has(q.id))
  if (candidates.length === 0) return null

  const target = targetDifficulty(session, round)
  const rng = createRng(
    session.config.seed + session.rounds.reduce((n, r) => n + r.threads.length, 0) * 7919,
  )
  const jdTech = new Set(session.config.context.jdRequirements.map((r) => r.technology))
  const resumeTech = new Set(session.config.context.resumeClaims.flatMap((c) => c.technologies))
  const topicsSoFar = new Map<string, number>()
  for (const r of session.rounds)
    for (const t of r.threads)
      topicsSoFar.set(t.spec.topic, (topicsSoFar.get(t.spec.topic) ?? 0) + 1)

  const scored = candidates.map((spec) => {
    let score = 0
    score -= Math.abs(DIFFICULTY_RANK[spec.difficulty] - target) * 3
    if (session.config.focusTopics.includes(spec.topic)) score += 6
    if (spec.technologies.some((t) => jdTech.has(t))) score += 3
    if (spec.technologies.some((t) => resumeTech.has(t))) score += 1.5
    score -= (topicsSoFar.get(spec.topic) ?? 0) * 2
    score += rng() * 2
    return { spec, score }
  })
  scored.sort((a, b) => b.score - a.score || a.spec.id.localeCompare(b.spec.id))
  return { spec: scored[0]!.spec, origin: 'bank' }
}
