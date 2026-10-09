import type { CommandCenterSnapshot } from '@opsforge/types'
import { buildSampleSnapshot } from './sampleSnapshot'

/**
 * The single place the Command Center gets its data. Swap the body for a request to the
 * readiness endpoint once the API exists; the snapshot contract (`@opsforge/types`) stays the same.
 */
export async function loadCommandCenter(signal?: AbortSignal): Promise<CommandCenterSnapshot> {
  signal?.throwIfAborted()
  return buildSampleSnapshot()
}
