import { useState } from 'react'
import { createJdRuntime } from '../features/jd/factory'
import { JdConsole } from '../features/jd/JdConsole'
import type { JdRuntime } from '../features/jd/useJd'

/** ForgeJD. The page is the composition root. */
export function JdPage({ runtime }: { runtime?: JdRuntime }) {
  const [resolved] = useState(() => runtime ?? createJdRuntime())
  return <JdConsole runtime={resolved} />
}
