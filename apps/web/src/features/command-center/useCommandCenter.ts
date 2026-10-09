import type { CommandCenterSnapshot } from '@opsforge/types'
import { useEffect, useState } from 'react'
import { loadCommandCenter } from './commandCenterSource'

export type CommandCenterState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; snapshot: CommandCenterSnapshot }

export function useCommandCenter(): CommandCenterState {
  const [state, setState] = useState<CommandCenterState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    loadCommandCenter(controller.signal).then(
      (snapshot) => {
        if (!controller.signal.aborted) setState({ status: 'ready', snapshot })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not load readiness data.',
          })
        }
      },
    )
    return () => controller.abort()
  }, [])

  return state
}
