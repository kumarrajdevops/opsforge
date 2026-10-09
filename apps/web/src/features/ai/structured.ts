/** Helpers for treating LLM output as untrusted, structured data. */

export class LlmOutputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LlmOutputError'
  }
}

/** Parses JSON from a completion, tolerating a Markdown code fence or surrounding prose. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  const candidate = fenced?.[1]?.trim() ?? trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1))
      } catch {
        // fall through to the error below
      }
    }
    throw new LlmOutputError('The model did not return valid JSON.')
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const SCORE_KEYS = new Set([
  'score',
  'scores',
  'overall',
  'rating',
  'ratings',
  'points',
  'grade',
  'percent',
  'percentage',
  'mark',
  'marks',
])

/** Throws if any key at any depth is a numeric-score field. Models supply evidence, never scores. */
export function assertNoScores(value: unknown, where = 'response'): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoScores(item, `${where}[${i}]`))
    return
  }
  if (!isRecord(value)) return
  for (const [key, inner] of Object.entries(value)) {
    if (SCORE_KEYS.has(key.toLowerCase())) {
      throw new LlmOutputError(
        `The model returned a score field ("${key}") in ${where}. Scores come only from the deterministic scorer.`,
      )
    }
    assertNoScores(inner, `${where}.${key}`)
  }
}

/** Rejects with `TimeoutError` if the work does not settle in time, aborting it on the way out. */
export async function withTimeout<T>(
  work: (signal: AbortSignal) => Promise<T>,
  ms: number,
  outer?: AbortSignal,
): Promise<T> {
  const controller = new AbortController()
  const onOuterAbort = () => controller.abort()
  outer?.addEventListener('abort', onOuterAbort)
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error(`Timed out after ${Math.round(ms / 1000)}s.`))
        }, ms)
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    outer?.removeEventListener('abort', onOuterAbort)
  }
}
