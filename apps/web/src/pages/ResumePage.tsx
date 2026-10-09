import { useState } from 'react'
import { createResumeRuntime } from '../features/resume/factory'
import { ResumeConsole } from '../features/resume/ResumeConsole'
import type { ResumeRuntime } from '../features/resume/useResume'

/** ForgeResume. The page is the composition root. */
export function ResumePage({ runtime }: { runtime?: ResumeRuntime }) {
  const [resolved] = useState(() => runtime ?? createResumeRuntime())
  return <ResumeConsole runtime={resolved} />
}
