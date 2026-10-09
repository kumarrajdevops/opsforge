import type { EvidenceItem, InterviewSession, ResumeRecord } from '@opsforge/types'
import { canonicalTechnologyId } from '../technologies/catalog'

function day(iso: string): string {
  return iso.slice(0, 10)
}

/** Interview threads that were actually answered and scored, tagged by technology. */
function fromInterviews(sessions: InterviewSession[]): EvidenceItem[] {
  const items: EvidenceItem[] = []
  for (const session of sessions) {
    for (const round of session.rounds) {
      for (const thread of round.threads) {
        const evaluation = thread.evaluation
        if (!evaluation || thread.closeReason === 'skipped') continue
        const answered = thread.turns.some((t) => t.answer && !t.answer.skipped)
        if (!answered) continue
        const at = thread.turns.find((t) => t.answer)?.answer?.submittedAt ?? session.startedAt
        const technologies = new Set(
          thread.spec.technologies.flatMap((tag) => {
            const id = canonicalTechnologyId(tag)
            return id ? [id] : []
          }),
        )
        for (const technology of technologies) {
          items.push({
            id: `interview:${thread.id}:${technology}`,
            technology,
            source: 'interview',
            strength: 'tested',
            score: evaluation.score,
            label: `Interview ${day(session.startedAt)}, ${thread.spec.topic}`,
            at,
            adjacent: false,
          })
        }
      }
    }
  }
  return items
}

function fromResume(resume: ResumeRecord | null): EvidenceItem[] {
  if (!resume) return []
  const items: EvidenceItem[] = []
  const claims = new Map(resume.claims.map((c) => [c.id, c]))

  for (const claim of resume.claims) {
    for (const technology of claim.technologies) {
      items.push({
        id: `resume:${claim.id}:${technology}`,
        technology,
        source: 'resume',
        strength: 'claimed',
        score: null,
        label: `Resume: ${claim.text}`,
        at: resume.importedAt,
        adjacent: false,
      })
    }
  }

  for (const attempt of resume.attempts) {
    const claim = claims.get(attempt.claimId)
    if (!claim || attempt.answer.trim().length === 0) continue
    for (const technology of claim.technologies) {
      items.push({
        id: `drill:${attempt.id}:${technology}`,
        technology,
        source: 'drill',
        strength: 'tested',
        score: attempt.evaluation.score,
        label: `Resume drill (${attempt.category}): ${claim.text}`,
        at: attempt.answeredAt,
        adjacent: false,
      })
    }
  }
  return items
}

/**
 * Everything the platform can say about the candidate, as technology-tagged evidence. Only scored
 * answers count as "tested". Incident and architecture sessions carry no technology tags yet, so
 * they are not sources here.
 */
export function collectEvidence(input: {
  sessions: InterviewSession[]
  resume: ResumeRecord | null
}): EvidenceItem[] {
  return [...fromInterviews(input.sessions), ...fromResume(input.resume)]
}
