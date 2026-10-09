import type {
  AnswerAnalyzer,
  ClaimQuestion,
  DrillAttempt,
  InterviewTurn,
  QuestionThread,
} from '@opsforge/types'
import { evaluateThread } from '../interviewer/scoring'
import { CATEGORIES } from './questions/generic'

export interface EvaluateDrillInput {
  question: ClaimQuestion
  answer: string
  analyzer: AnswerAnalyzer
  /** Seconds spent, optional. */
  durationSeconds?: number
  now?: () => Date
  newId?: () => string
}

function defaultId(): string {
  return `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Scores one drill answer. The analyzer produces evidence only; the score comes from the same
 * deterministic thread evaluation the interviewer uses (PRD AI-01, AI-04). A single question with
 * no follow-ups, so a drill is comparable to one interview thread.
 */
export async function evaluateDrill({
  question,
  answer,
  analyzer,
  durationSeconds = 0,
  now = () => new Date(),
  newId = defaultId,
}: EvaluateDrillInput): Promise<DrillAttempt> {
  const text = answer.trim()
  const at = now().toISOString()
  const evidence = await analyzer.analyze({
    spec: question.spec,
    prompt: question.spec.prompt,
    answer: text,
  })

  const turn: InterviewTurn = {
    id: `${question.id}:turn-1`,
    kind: 'question',
    prompt: question.spec.prompt,
    authoredPrompt: question.spec.prompt,
    askedAt: at,
    answer: { text, submittedAt: at, durationSeconds, skipped: text.length === 0 },
    evidence,
  }
  const thread: QuestionThread = {
    id: question.id,
    roundId: 'drill',
    spec: question.spec,
    origin: 'resume',
    groundedIn: question.claimId,
    turns: [turn],
    status: 'closed',
    closeReason: 'covered',
  }
  const evaluation = evaluateThread(thread, CATEGORIES[question.category].round)

  return {
    id: newId(),
    claimId: question.claimId,
    category: question.category,
    questionId: question.id,
    answer: text,
    answeredAt: at,
    analyzerId: analyzer.id,
    evaluation,
  }
}
