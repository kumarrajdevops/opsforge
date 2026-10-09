import { useEffect, useState } from 'react'
import { createInterviewerRuntime, type InterviewerRuntime } from '../features/interviewer/factory'
import { InterviewerConsole } from '../features/interviewer/InterviewerConsole'
import type { SetupInput } from '../features/interviewer/setup'
import { jdRepository } from '../features/jd/repository'
import { resumeRepository } from '../features/resume/repository'

/** ForgeInterview. The page is the composition root: it picks the engine, console renders it. */
export function InterviewerPage({
  runtime,
  prefill,
}: {
  runtime?: InterviewerRuntime
  prefill?: Partial<SetupInput>
}) {
  const [resolved] = useState(() => runtime ?? createInterviewerRuntime())
  const [saved, setSaved] = useState<Partial<SetupInput> | null>(prefill ?? null)

  useEffect(() => {
    if (prefill) return
    let active = true
    void Promise.all([resumeRepository.load(), jdRepository.load()]).then(([resume, jd]) => {
      if (active) setSaved({ resume: resume?.rawText ?? '', jd: jd?.rawText ?? '' })
    })
    return () => {
      active = false
    }
  }, [prefill])

  if (!saved) return null
  return <InterviewerConsole runtime={resolved} prefill={saved} />
}
