import type {
  AnswerAnalysisRequest,
  AnswerAnalyzer,
  AnswerEvidence,
  AnswerMetrics,
  ConceptHit,
  QuestionSpec,
  RedFlagHit,
} from '@opsforge/types'
import { detectSignals, countFillers, countHedges } from './signals'
import { compileTerm, countWords, excerpt, findFirstTerm, splitSentences } from './text'

const REASONING =
  /\b(?:because|so that|which means|therefore|since|in order to|that way|due to|otherwise|this (?:way|ensures|prevents|allows|means|lets)|as a result|the reason|which is why|so (?:it|we|the|you|traffic|requests))\b/i

/** A concept sentence with at least this many words is treated as an explanation, not a name-drop. */
const EXPLANATION_WORDS = 18

/**
 * Deterministic evidence extractor. It matches rubric terms and wording patterns; it does not
 * understand meaning. Use it as the baseline and as the fallback when an LLM analyzer is unavailable.
 */
export function analyzeAnswerText(spec: QuestionSpec, answer: string): AnswerEvidence {
  const text = answer.trim()
  const sentences = splitSentences(text)

  const concepts: ConceptHit[] = []
  for (const concept of spec.concepts) {
    const hit = findFirstTerm(sentences, concept.terms)
    if (!hit) continue
    const distinctTerms = concept.terms.filter((t) => compileTerm(t).test(text)).length
    const around = [sentences[hit.index - 1], hit.sentence, sentences[hit.index + 1]]
      .filter((s): s is string => Boolean(s))
      .join(' ')
    const explained =
      REASONING.test(around) || countWords(hit.sentence) >= EXPLANATION_WORDS || distinctTerms >= 3
    concepts.push({
      conceptId: concept.id,
      strength: explained ? 'explained' : 'named',
      quote: excerpt(hit.sentence),
    })
  }

  const redFlags: RedFlagHit[] = []
  for (const flag of spec.redFlags ?? []) {
    const hit = findFirstTerm(sentences, flag.patterns)
    if (hit) redFlags.push({ redFlagId: flag.id, quote: excerpt(hit.sentence) })
  }

  return {
    analyzerId: 'rule-based',
    basis: 'rule-based',
    concepts,
    signals: detectSignals(text, sentences).map((s) =>
      s.quote === undefined ? { signal: s.signal } : { signal: s.signal, quote: excerpt(s.quote) },
    ),
    redFlags,
    metrics: answerMetrics(text),
  }
}

/** Objective measures of an answer's text. Computed locally, never taken from a model. */
export function answerMetrics(answer: string): AnswerMetrics {
  const text = answer.trim()
  const sentences = splitSentences(text)
  const wordCount = countWords(text)
  return {
    wordCount,
    sentenceCount: sentences.length,
    avgSentenceWords:
      sentences.length === 0 ? 0 : Math.round((wordCount / sentences.length) * 10) / 10,
    hedgeCount: countHedges(sentences),
    fillerCount: countFillers(text),
  }
}

export class RuleBasedAnalyzer implements AnswerAnalyzer {
  readonly id = 'rule-based'
  readonly basis = 'rule-based' as const

  async analyze(request: AnswerAnalysisRequest): Promise<AnswerEvidence> {
    return analyzeAnswerText(request.spec, request.answer)
  }
}
