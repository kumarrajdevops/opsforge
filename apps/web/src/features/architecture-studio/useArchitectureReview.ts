import type {
  ArchitectureDocument,
  ArchitectureEvaluation,
  ArchitectureReviewProvider,
  ReviewRequest,
  ReviewResult,
  Scenario,
} from '@opsforge/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { semanticKey } from './documentOps'
import {
  buildReviewRequest,
  reviewProviders,
  runReview,
  type ReviewProviderRegistry,
} from './review'

type Run =
  | { status: 'loading'; key: string; providerId: string }
  | { status: 'ready'; key: string; result: ReviewResult }
  | { status: 'error'; key: string; message: string }

export interface ArchitectureReviewState {
  providers: ArchitectureReviewProvider[]
  /** The exact payload a provider would receive. Shown when no provider is configured. */
  request: ReviewRequest
  run: Run | null
  /** The design changed after the review ran. */
  stale: boolean
  start: (providerId?: string) => void
  cancel: () => void
}

export function useArchitectureReview(
  scenario: Scenario,
  document: ArchitectureDocument,
  evaluation: ArchitectureEvaluation,
  registry: ReviewProviderRegistry = reviewProviders,
): ArchitectureReviewState {
  const key = useMemo(() => semanticKey(document), [document])
  const [run, setRun] = useState<Run | null>(null)
  const abort = useRef<AbortController | null>(null)
  const request = useMemo(
    () => buildReviewRequest(scenario, document, evaluation),
    [scenario, document, evaluation],
  )

  useEffect(() => () => abort.current?.abort(), [])

  const start = useCallback(
    (providerId?: string) => {
      const provider = providerId ? registry.get(providerId) : registry.list()[0]
      if (!provider) return
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      setRun({ status: 'loading', key, providerId: provider.id })
      runReview(provider, request, controller.signal).then(
        (result) => {
          if (!controller.signal.aborted) setRun({ status: 'ready', key, result })
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          setRun({
            status: 'error',
            key,
            message: error instanceof Error ? error.message : 'Review failed.',
          })
        },
      )
    },
    [registry, key, request],
  )

  const cancel = useCallback(() => {
    abort.current?.abort()
    setRun(null)
  }, [])

  return {
    providers: registry.list(),
    request,
    run,
    stale: run !== null && run.status !== 'loading' && run.key !== key,
    start,
    cancel,
  }
}
