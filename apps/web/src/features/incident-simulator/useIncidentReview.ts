import type {
  IncidentEvaluation,
  IncidentReviewProvider,
  IncidentReviewResult,
  IncidentScenario,
  IncidentSession,
} from '@opsforge/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildIncidentReviewRequest,
  incidentReviewProviders,
  runIncidentReview,
  type IncidentReviewRegistry,
} from './review'

type Run =
  | { status: 'loading'; providerId: string }
  | { status: 'ready'; result: IncidentReviewResult }
  | { status: 'error'; message: string }

export interface IncidentReviewState {
  providers: IncidentReviewProvider[]
  run: Run | null
  start: (providerId?: string) => void
  cancel: () => void
}

export function useIncidentReview(
  scenario: IncidentScenario,
  session: IncidentSession,
  evaluation: IncidentEvaluation | null,
  registry: IncidentReviewRegistry = incidentReviewProviders,
): IncidentReviewState {
  const [run, setRun] = useState<Run | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const start = useCallback(
    (providerId?: string) => {
      const provider = providerId ? registry.get(providerId) : registry.list()[0]
      if (!provider || !evaluation) return
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      setRun({ status: 'loading', providerId: provider.id })
      runIncidentReview(
        provider,
        buildIncidentReviewRequest(scenario, session, evaluation),
        controller.signal,
      ).then(
        (result) => {
          if (!controller.signal.aborted) setRun({ status: 'ready', result })
        },
        (error: unknown) => {
          if (controller.signal.aborted) return
          setRun({
            status: 'error',
            message: error instanceof Error ? error.message : 'Review failed.',
          })
        },
      )
    },
    [registry, scenario, session, evaluation],
  )

  const cancel = useCallback(() => {
    abort.current?.abort()
    setRun(null)
  }, [])

  return { providers: registry.list(), run, start, cancel }
}
