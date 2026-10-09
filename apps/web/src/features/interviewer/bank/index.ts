import type { QuestionSpec } from '@opsforge/types'
import { architectureQuestions } from './architecture'
import { behavioralQuestions } from './behavioral'
import { finalQuestions } from './final'
import { screeningQuestions } from './screening'
import { technicalQuestions } from './technical'
import { troubleshootingQuestions } from './troubleshooting'

export const questionBank: readonly QuestionSpec[] = [
  ...screeningQuestions,
  ...technicalQuestions,
  ...troubleshootingQuestions,
  ...architectureQuestions,
  ...behavioralQuestions,
  ...finalQuestions,
]

export function findQuestion(id: string): QuestionSpec | undefined {
  return questionBank.find((q) => q.id === id)
}
