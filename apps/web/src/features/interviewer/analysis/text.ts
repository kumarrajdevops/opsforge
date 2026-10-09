/** Text helpers shared by the analyzers. Pure and dependency free. */

export function collapse(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
}

export function normalizeForQuote(text: string): string {
  return collapse(text).toLowerCase()
}

export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}'./+_-]*/gu)
  return matches ? matches.length : 0
}

/** Splits on sentence punctuation and line breaks, keeping list items as their own sentences. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => collapse(s))
    .filter((s) => s.length > 0)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const termCache = new Map<string, RegExp>()

/**
 * Compiles a plain phrase into a matcher. Matches from a word start so stems work ("rollback"
 * matches "rollbacks"); phrases of three characters or fewer must match whole words ("ci", "dns").
 * Whitespace and hyphens are interchangeable.
 */
export function compileTerm(term: string): RegExp {
  const cached = termCache.get(term)
  if (cached) return cached
  const body = term
    .trim()
    .split(/[\s-]+/)
    .map(escapeRegExp)
    .join('[\\s-]+')
  const tail = term.trim().length <= 3 ? '(?![\\p{L}\\p{N}])' : ''
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])${body}${tail}`, 'iu')
  termCache.set(term, regex)
  return regex
}

export interface TermMatch {
  term: string
  index: number
  sentence: string
}

/** First sentence in which any of the terms occurs, with the term that matched. */
export function findFirstTerm(sentences: string[], terms: string[]): TermMatch | null {
  for (let i = 0; i < sentences.length; i += 1) {
    const sentence = sentences[i]!
    for (const term of terms) {
      if (compileTerm(term).test(sentence)) return { term, index: i, sentence }
    }
  }
  return null
}

export function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

/** A readable excerpt for evidence: the sentence, shortened around the match if it is long. */
export function excerpt(sentence: string, max = 220): string {
  const clean = collapse(sentence)
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`
}

/** True when `quote` occurs in `answer`, ignoring case, quote style and whitespace. */
export function quoteAppearsIn(quote: string, answer: string): boolean {
  const q = normalizeForQuote(quote).replace(/…$/, '').trim()
  if (q.length < 4) return false
  return normalizeForQuote(answer).includes(q)
}
