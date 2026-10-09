import type {
  IncidentDimensionId,
  IncidentEvaluation,
  IncidentObservation,
  IncidentReviewProvider,
  IncidentReviewRequest,
  IncidentReviewResult,
  IncidentScenario,
  IncidentSession,
} from '@opsforge/types'
import { DIMENSION_LABELS } from './evaluator'

/*
 * Reviews are evidence, never a score. A provider (an LLM service, a human reviewer queue) implements
 * `IncidentReviewProvider`; its output is validated here before it reaches the UI, and any numeric
 * score field is rejected. No provider ships in the app, so the registry starts empty.
 */

export class IncidentReviewValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IncidentReviewValidationError'
  }
}

export class IncidentReviewRegistry {
  private readonly providers = new Map<string, IncidentReviewProvider>()

  register(provider: IncidentReviewProvider): () => void {
    this.providers.set(provider.id, provider)
    return () => {
      if (this.providers.get(provider.id) === provider) this.providers.delete(provider.id)
    }
  }

  list(): IncidentReviewProvider[] {
    return [...this.providers.values()]
  }

  get(id: string): IncidentReviewProvider | undefined {
    return this.providers.get(id)
  }

  get isConfigured(): boolean {
    return this.providers.size > 0
  }
}

/** Application-wide registry. A future bootstrap step registers real providers here. */
export const incidentReviewProviders = new IncidentReviewRegistry()

export function buildIncidentReviewRequest(
  scenario: IncidentScenario,
  session: IncidentSession,
  evaluation: IncidentEvaluation,
): IncidentReviewRequest {
  return { scenario, session, evaluation }
}

const DIMENSION_IDS = new Set<string>(Object.keys(DIMENSION_LABELS))
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
  if (typeof value !== 'string' || value.trim() === '') {
    throw new IncidentReviewValidationError(`${field} must be a non-empty string.`)
  }
  return value.trim()
}

function rejectScores(entry: Record<string, unknown>, where: string) {
  for (const key of Object.keys(entry)) {
    if (SCORE_KEYS.has(key.toLowerCase())) {
      throw new IncidentReviewValidationError(
        `${where} carries a numeric score ("${key}"). Reviews are evidence only; scores come from the deterministic evaluator.`,
      )
    }
  }
}

/** Throws `IncidentReviewValidationError` for anything a provider must not return. */
export function validateIncidentReview(raw: unknown): IncidentReviewResult {
  if (!isRecord(raw)) throw new IncidentReviewValidationError('Review result must be an object.')
  rejectScores(raw, 'Review result')

  const observationsRaw = Array.isArray(raw.observations) ? raw.observations : []
  const observations: IncidentObservation[] = observationsRaw.map((o, index) => {
    const where = `Observation ${index + 1}`
    if (!isRecord(o)) throw new IncidentReviewValidationError(`${where} must be an object.`)
    rejectScores(o, where)
    if (typeof o.dimension !== 'string' || !DIMENSION_IDS.has(o.dimension)) {
      throw new IncidentReviewValidationError(
        `${where} references unknown dimension "${String(o.dimension)}".`,
      )
    }
    if (o.kind !== 'strength' && o.kind !== 'gap') {
      throw new IncidentReviewValidationError(`${where} must be a "strength" or a "gap".`)
    }
    return {
      dimension: o.dimension as IncidentDimensionId,
      kind: o.kind,
      note: text(o.note, `${where} note`),
    }
  })

  const followUps = (Array.isArray(raw.followUps) ? raw.followUps : []).map((q, index) =>
    text(q, `Follow-up ${index + 1}`),
  )

  return {
    providerId: text(raw.providerId, 'providerId'),
    summary: text(raw.summary, 'summary'),
    observations,
    followUps,
  }
}

/** Runs a provider and returns only validated output. */
export async function runIncidentReview(
  provider: IncidentReviewProvider,
  request: IncidentReviewRequest,
  signal?: AbortSignal,
): Promise<IncidentReviewResult> {
  const raw = await provider.review(request, signal)
  return validateIncidentReview(raw)
}
