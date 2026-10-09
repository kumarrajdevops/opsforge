import type { InterviewSession } from '@opsforge/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InterviewerRuntime } from './factory'
import { MAX_ANSWER_SECONDS } from './session'
import { buildReplay, type ReplayThread } from './replay'
import { buildInterviewConfig, type SetupInput } from './setup'
import { redactForCandidate, type CandidateView } from './view'
import { weakTopicsFrom } from './weakTopics'

export type InterviewerPhase = 'loading' | 'setup' | 'question' | 'between-rounds' | 'complete'

export interface InterviewerApi {
  phase: InterviewerPhase
  /** What the room may show. Never contains scores. */
  view: CandidateView | null
  /** Present only when the interview is complete: the debrief and replay read from it. */
  completed: InterviewSession | null
  replay: ReplayThread[] | null
  history: InterviewSession[]
  weakTopics: string[]
  busy: boolean
  error: string | null
  /** Seconds left in the round, ticking while a question is on screen. */
  remainingSeconds: number | null
  disclosure: string

  start: (input: SetupInput) => Promise<void>
  submit: (text: string) => Promise<void>
  skip: () => Promise<void>
  nextRound: () => Promise<void>
  endRound: () => Promise<void>
  endInterview: () => Promise<void>
  newInterview: () => void
  open: (id: string) => Promise<void>
  finishUnfinished: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export interface InterviewerOptions {
  runtime: InterviewerRuntime
  /** Injectable clock in milliseconds, for tests. */
  now?: () => number
  /** Injectable seed source, for tests. */
  seed?: () => number
}

/** Container hook for ForgeInterview: drives the engine and exposes only the candidate-safe view. */
export function useInterviewer({
  runtime,
  now = Date.now,
  seed = () => Date.now() % 2_147_483_647,
}: InterviewerOptions): InterviewerApi {
  const { engine, repository } = runtime
  const [loaded, setLoaded] = useState(false)
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [history, setHistory] = useState<InterviewSession[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(() => now())
  const inFlight = useRef(false)

  const refreshHistory = useCallback(async () => {
    setHistory(await repository.list())
  }, [repository])

  useEffect(() => {
    let cancelled = false
    repository.list().then((list) => {
      if (cancelled) return
      setHistory(list)
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [repository])

  const view = useMemo(
    () => (session && session.status === 'in-progress' ? redactForCandidate(session) : null),
    [session],
  )
  const completed = session && session.status === 'completed' ? session : null
  const replay = useMemo(() => (completed ? buildReplay(completed) : null), [completed])
  const weakTopics = useMemo(() => weakTopicsFrom(history), [history])

  const questionAsked = view?.question?.askedAt ?? null
  useEffect(() => {
    if (!questionAsked) return
    const id = window.setInterval(() => setTick(now()), 1000)
    return () => window.clearInterval(id)
  }, [questionAsked, now])

  const remainingSeconds = useMemo(() => {
    if (!view?.question || view.remainingSeconds === undefined) return null
    const elapsed = Math.min(
      MAX_ANSWER_SECONDS,
      Math.max(0, (tick - Date.parse(view.question.askedAt)) / 1000),
    )
    return view.remainingSeconds - elapsed
  }, [view, tick])

  const phase: InterviewerPhase = !loaded
    ? 'loading'
    : !session
      ? 'setup'
      : session.status === 'completed'
        ? 'complete'
        : view?.phase === 'between-rounds'
          ? 'between-rounds'
          : 'question'

  const guard = useCallback(
    async (work: () => Promise<InterviewSession | null>) => {
      if (inFlight.current) return
      inFlight.current = true
      setBusy(true)
      setError(null)
      try {
        const next = await work()
        if (next) setSession(next)
        await refreshHistory()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.')
      } finally {
        inFlight.current = false
        setBusy(false)
      }
    },
    [refreshHistory],
  )

  const start = useCallback(
    (input: SetupInput) =>
      guard(() => engine.start(buildInterviewConfig(input, { seed: seed(), weakTopics }))),
    [engine, guard, seed, weakTopics],
  )

  const submit = useCallback(
    (text: string) =>
      guard(() => (session ? engine.submitAnswer(session, { text }) : Promise.resolve(null))),
    [engine, guard, session],
  )
  const skip = useCallback(
    () =>
      guard(() =>
        session ? engine.submitAnswer(session, { text: '', skipped: true }) : Promise.resolve(null),
      ),
    [engine, guard, session],
  )
  const nextRound = useCallback(
    () => guard(() => (session ? engine.advanceRound(session) : Promise.resolve(null))),
    [engine, guard, session],
  )
  const endRound = useCallback(
    () => guard(() => (session ? engine.endRound(session) : Promise.resolve(null))),
    [engine, guard, session],
  )
  const endInterview = useCallback(
    () => guard(() => (session ? engine.endInterview(session) : Promise.resolve(null))),
    [engine, guard, session],
  )

  const newInterview = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  const open = useCallback(
    async (id: string) => {
      const found = await repository.load(id)
      if (found) setSession(found)
    },
    [repository],
  )

  const finishUnfinished = useCallback(
    (id: string) =>
      guard(async () => {
        const found = await repository.load(id)
        return found && found.status === 'in-progress' ? engine.endInterview(found) : null
      }),
    [engine, guard, repository],
  )

  const remove = useCallback(
    async (id: string) => {
      await repository.remove(id)
      if (session?.id === id) setSession(null)
      await refreshHistory()
    },
    [refreshHistory, repository, session?.id],
  )

  return {
    phase,
    view,
    completed,
    replay,
    history,
    weakTopics,
    busy,
    error,
    remainingSeconds,
    disclosure: runtime.disclosure,
    start,
    submit,
    skip,
    nextRound,
    endRound,
    endInterview,
    newInterview,
    open,
    finishUnfinished,
    remove,
  }
}
