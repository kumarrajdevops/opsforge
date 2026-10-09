import type { AnswerSignalId, ProbeKind, QuestionThread, ThreadCloseReason } from '@opsforge/types'
import { collapse, countWords } from './analysis/text'
import { accumulateTurns, followUpTurns } from './evidence'

export interface FollowUpDecision {
  probe: ProbeKind
  /** Concept id, red flag id or signal id the probe addresses. Prevents repeating a probe. */
  target: string
  /** Deterministic wording. Never states the answer. */
  authored: string
  /** The candidate's own words the probe refers to. */
  anchor?: string
}

export type FollowUpResult =
  | { next: FollowUpDecision; closeReason?: undefined }
  | { next: null; closeReason: ThreadCloseReason }

export const DEFAULT_MAX_FOLLOW_UPS = 2
const THIN_WORDS = 15
const STRUGGLING_WORDS = 10

/** Neutral wording per missing signal. None of these name a technology or concept. */
const SIGNAL_PROBES: Partial<Record<AnswerSignalId, string>> = {
  ownership: 'What was your own role in that, specifically?',
  result: 'How did it turn out, and how did you know?',
  metric: 'Can you put a number on that?',
  example: 'Can you give me a concrete example from your own experience?',
  reflection: 'Looking back, what would you do differently?',
  'scope-first': 'Before you act, what do you want to understand about how far this reaches?',
  hypothesis: 'What is your leading theory at that point, and how would you test it?',
  mitigation: 'Customers are affected while you work. What do you do about that?',
  verification: 'How do you confirm it is actually fixed?',
  'communication-plan': 'Who needs to hear about this, and when?',
  prevention: 'What would you change so this does not happen again?',
  requirements: 'What would you want to ask me before designing anything?',
  'failure-modes': 'Which part of that fails first, and what happens then?',
  scalability: 'What changes if load grows ten times?',
  security: 'Where are the security boundaries in that design?',
  cost: 'What does that cost, and where would you economise?',
  observability: 'How would you know it is working once it is live?',
  situation: 'Set the scene for me: what was the context?',
  action: 'What did you actually do?',
}

const SIGNAL_PROBE_KIND: Partial<Record<AnswerSignalId, ProbeKind>> = {
  ownership: 'ownership',
  result: 'outcome',
  metric: 'outcome',
}

function shortAnchor(quote: string, words = 14): string {
  const parts = collapse(quote).split(' ')
  return parts.length <= words ? parts.join(' ') : `${parts.slice(0, words).join(' ')}…`
}

/**
 * The interviewer's follow-up policy. Pure and deterministic: given what the candidate has said so
 * far, either the next probe, or the reason this question is done. Evidence is cumulative across the
 * thread, so a point made in an earlier answer is never asked about again.
 */
export function decideFollowUp(
  thread: QuestionThread,
  options: { timeUp?: boolean } = {},
): FollowUpResult {
  const { spec } = thread
  const turns = thread.turns
  const last = turns[turns.length - 1]
  if (!last?.answer) return { next: null, closeReason: 'moved-on' }

  const asked = followUpTurns(thread)
  const limit = spec.maxFollowUps ?? DEFAULT_MAX_FOLLOW_UPS

  if (last.answer.skipped)
    return { next: null, closeReason: asked.length === 0 ? 'skipped' : 'moved-on' }
  if (options.timeUp) return { next: null, closeReason: 'time' }
  if (asked.length >= limit) return { next: null, closeReason: 'follow-up-limit' }

  const words = countWords(last.answer.text)
  const isFollowUp = last.kind === 'follow-up'
  // A candidate who gives a one-liner to a follow-up is struggling; pressing further is just unkind.
  if (isFollowUp && words < STRUGGLING_WORDS) return { next: null, closeReason: 'moved-on' }

  const done = (probe: ProbeKind, target: string) =>
    asked.some((t) => t.probe === probe && t.target === target)
  const acc = accumulateTurns(turns)

  // 1. Too little to evaluate: ask for substance before probing anything.
  if (!isFollowUp && words < THIN_WORDS && acc.concepts.size === 0 && !done('clarify', 'answer')) {
    return {
      next: {
        probe: 'clarify',
        target: 'answer',
        authored: 'Can you expand on that? Walk me through how you would approach it.',
      },
    }
  }

  // 2. A misconception stated outright is challenged before anything else.
  for (const flag of spec.redFlags ?? []) {
    const hit = acc.redFlags.get(flag.id)
    if (hit && !done('challenge', flag.id)) {
      return {
        next: {
          probe: 'challenge',
          target: flag.id,
          authored: flag.challenge,
          anchor: shortAnchor(hit.quote),
        },
      }
    }
  }

  // 3. The heart of the question is missing: ask for it without naming it.
  const missingRequired = spec.concepts
    .filter((c) => c.required && !acc.concepts.has(c.id) && !done('gap', c.id))
    .sort((a, b) => b.weight - a.weight)
  if (missingRequired[0]) {
    return {
      next: { probe: 'gap', target: missingRequired[0].id, authored: missingRequired[0].probe },
    }
  }

  // 4. Named but not explained: ask how or why, anchored to what they said.
  const shallow = spec.concepts
    .filter(
      (c) => c.weight >= 2 && acc.concepts.get(c.id)?.strength === 'named' && !done('depth', c.id),
    )
    .sort((a, b) => b.weight - a.weight)
  if (shallow[0]) {
    const concept = shallow[0]
    const quote = acc.concepts.get(concept.id)!.quote
    return {
      next: {
        probe: 'depth',
        target: concept.id,
        authored:
          concept.depthProbe ??
          `You mentioned "${shortAnchor(quote, 10)}". Take me one level deeper: how does that actually work?`,
        anchor: shortAnchor(quote),
      },
    }
  }

  // 5. Senior candidates are expected to weigh alternatives.
  const wantsTradeoff =
    spec.expectedSignals?.includes('tradeoff') || spec.concepts.some((c) => c.kind === 'tradeoff')
  const hasTradeoff =
    acc.signals.has('tradeoff') ||
    spec.concepts.some((c) => c.kind === 'tradeoff' && acc.concepts.has(c.id))
  if (wantsTradeoff && !hasTradeoff && !done('tradeoff', 'tradeoff')) {
    const concept = spec.concepts.find((c) => c.kind === 'tradeoff' && !acc.concepts.has(c.id))
    return {
      next: {
        probe: 'tradeoff',
        target: 'tradeoff',
        authored:
          concept?.probe ??
          'What would that approach cost you, and when would you choose differently?',
      },
    }
  }

  // 6. A signal a strong answer shows is absent. One generic probe at most.
  if (!asked.some((t) => t.probe && ['ownership', 'outcome', 'signal'].includes(t.probe))) {
    for (const signal of spec.expectedSignals ?? []) {
      const wording = SIGNAL_PROBES[signal]
      if (wording && !acc.signals.has(signal)) {
        return {
          next: { probe: SIGNAL_PROBE_KIND[signal] ?? 'signal', target: signal, authored: wording },
        }
      }
    }
  }

  return { next: null, closeReason: 'covered' }
}
