import { useState } from 'react'
import { createInterviewerRuntime, type InterviewerRuntime } from '../features/interviewer/factory'
import { InterviewerConsole } from '../features/interviewer/InterviewerConsole'

/** ForgeInterview. The page is the composition root: it picks the engine, console renders it. */
export function InterviewerPage({ runtime }: { runtime?: InterviewerRuntime }) {
  const [resolved] = useState(() => runtime ?? createInterviewerRuntime())
  return <InterviewerConsole runtime={resolved} />
}
