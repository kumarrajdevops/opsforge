import type {
  ArchitectureDocument,
  ArchitectureEvaluation,
  ArchitectureReviewProvider,
  CheckSeverity,
  ReviewFinding,
  ReviewRequest,
  ReviewResult,
  ReviewSignal,
  Scenario,
  ScoreDimensionId,
} from '@opsforge/types'
import { DIMENSIONS } from './evaluator'

/*
 * AI review is evidence, never a score. Providers (an LLM service, a rules engine, a human
 * reviewer queue) implement `ArchitectureReviewProvider`. Their output is validated here before it
 * reaches the UI: any numeric score field is rejected and node references must exist.
 * No provider ships in the app yet, so the registry starts empty.
 */

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ReviewValidationError'
  }
}

export class ReviewProviderRegistry {
  private readonly providers = new Map<string, ArchitectureReviewProvider>()

  register(provider: ArchitectureReviewProvider): () => void {
    this.providers.set(provider.id, provider)
    return () => {
      if (this.providers.get(provider.id) === provider) this.providers.delete(provider.id)
    }
  }

  list(): ArchitectureReviewProvider[] {
    return [...this.providers.values()]
  }

  get(id: string): ArchitectureReviewProvider | undefined {
    return this.providers.get(id)
  }

  get isConfigured(): boolean {
    return this.providers.size > 0
  }
}

/** Application-wide registry. A future bootstrap step registers real providers here. */
export const reviewProviders = new ReviewProviderRegistry()

export function buildReviewRequest(
  scenario: Scenario,
  document: ArchitectureDocument,
  evaluation: ArchitectureEvaluation,
): ReviewRequest {
  return { scenario, document, evaluation }
}

const SEVERITIES: CheckSeverity[] = ['critical', 'major', 'minor']
const DIMENSION_IDS = new Set<string>(DIMENSIONS.map((d) => d.id))
const SCORE_KEYS = new Set([
  'score',
  'scores',
  'overall',
  'rating',
  'points',
  'grade',
  'percent',
  'percentage',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '')
    throw new ReviewValidationError(`${field} must be a non-empty string.`)
  return value.trim()
}

function rejectScores(entry: Record<string, unknown>, where: string) {
  for (const key of Object.keys(entry)) {
    if (SCORE_KEYS.has(key.toLowerCase())) {
      throw new ReviewValidationError(
        `${where} carries a numeric score ("${key}"). Reviews are evidence only; scores come from the deterministic evaluator.`,
      )
    }
  }
}

function dimension(value: unknown, where: string): ScoreDimensionId {
  if (typeof value !== 'string' || !DIMENSION_IDS.has(value)) {
    throw new ReviewValidationError(`${where} references unknown dimension "${String(value)}".`)
  }
  return value as ScoreDimensionId
}

/** Throws `ReviewValidationError` for anything a provider must not return. */
export function validateReviewResult(raw: unknown, document: ArchitectureDocument): ReviewResult {
  if (!isRecord(raw)) throw new ReviewValidationError('Review result must be an object.')
  rejectScores(raw, 'Review result')

  const nodeIds = new Set(document.nodes.map((n) => n.id))
  const findingsRaw = Array.isArray(raw.findings) ? raw.findings : []
  const signalsRaw = Array.isArray(raw.signals) ? raw.signals : []

  const findings: ReviewFinding[] = findingsRaw.map((f, index) => {
    if (!isRecord(f)) throw new ReviewValidationError(`Finding ${index + 1} must be an object.`)
    rejectScores(f, `Finding ${index + 1}`)
    const severity = f.severity
    if (typeof severity !== 'string' || !SEVERITIES.includes(severity as CheckSeverity)) {
      throw new ReviewValidationError(`Finding ${index + 1} has an invalid severity.`)
    }
    const refs = Array.isArray(f.nodeIds) ? f.nodeIds : []
    for (const ref of refs) {
      if (typeof ref !== 'string' || !nodeIds.has(ref)) {
        throw new ReviewValidationError(
          `Finding ${index + 1} references unknown node "${String(ref)}".`,
        )
      }
    }
    return {
      id: typeof f.id === 'string' && f.id ? f.id : `finding-${index + 1}`,
      severity: severity as CheckSeverity,
      dimension: dimension(f.dimension, `Finding ${index + 1}`),
      title: text(f.title, `Finding ${index + 1} title`),
      detail: text(f.detail, `Finding ${index + 1} detail`),
      nodeIds: refs as string[],
      recommendation:
        typeof f.recommendation === 'string' && f.recommendation.trim()
          ? f.recommendation.trim()
          : undefined,
    }
  })

  const signals: ReviewSignal[] = signalsRaw.map((s, index) => {
    if (!isRecord(s)) throw new ReviewValidationError(`Signal ${index + 1} must be an object.`)
    rejectScores(s, `Signal ${index + 1}`)
    if (s.strength !== 'strength' && s.strength !== 'gap') {
      throw new ReviewValidationError(`Signal ${index + 1} must be a "strength" or a "gap".`)
    }
    return {
      dimension: dimension(s.dimension, `Signal ${index + 1}`),
      strength: s.strength,
      note: text(s.note, `Signal ${index + 1} note`),
    }
  })

  return {
    providerId: text(raw.providerId, 'providerId'),
    summary: text(raw.summary, 'summary'),
    findings,
    signals,
  }
}

/** Runs a provider and returns only validated output. */
export async function runReview(
  provider: ArchitectureReviewProvider,
  request: ReviewRequest,
  signal?: AbortSignal,
): Promise<ReviewResult> {
  const raw = await provider.review(request, signal)
  return validateReviewResult(raw, request.document)
}
