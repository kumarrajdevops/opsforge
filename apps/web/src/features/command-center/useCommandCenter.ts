import type { CommandCenterSnapshot } from '@opsforge/types'
import { useMemo } from 'react'
import { SCENARIOS } from '../architecture-studio/scenarios'
import { useReadiness, type ReadinessRuntime } from '../readiness/useReadiness'
import { buildCommandCenter } from './fromReadiness'

export type CommandCenterState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: CommandCenterSnapshot }

/**
 * Container hook. It reads the Readiness Engine through the same hook as the Readiness page and
 * only reshapes the result, so the two pages always show the same report.
 */
export function useCommandCenter(runtime: ReadinessRuntime = {}): CommandCenterState {
  const readiness = useReadiness(runtime)

  return useMemo<CommandCenterState>(() => {
    if (readiness.status !== 'ready') return readiness
    return {
      status: 'ready',
      snapshot: buildCommandCenter({
        report: readiness.report,
        evidence: readiness.evidence,
        architectureScenarioTotal: SCENARIOS.length,
        now: Date.parse(readiness.report.generatedAt),
      }),
    }
  }, [readiness])
}
