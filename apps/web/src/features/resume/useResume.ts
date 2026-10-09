import type {
  AnswerAnalyzer,
  ClaimQuestion,
  Defensibility,
  DrillAttempt,
  InterviewRepository,
  InterviewSession,
  ResumeClaimItem,
  ResumeRecord,
  ResumeRepository,
} from '@opsforge/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collectEvidence } from '../readiness-evidence/collect'
import { assessClaim } from '../drills/defensibility'
import { evaluateDrill } from '../drills/evaluate'
import { generateClaimQuestions } from '../drills/questions/generate'
import { buildResumeRecord, refreshTechnologies } from './claims'
import { assessResumeTools, type ResumeTool } from './tools'
import { readResumeFile, ResumeFileError, type ReadableFile } from './fileReader'

export interface ResumeRuntime {
  repository: ResumeRepository
  /** Scored interview answers count towards tool readiness alongside resume drills. */
  interviewRepository: InterviewRepository
  analyzer: AnswerAnalyzer
  disclosure: string
}

export interface ResumeApi {
  loading: boolean
  record: ResumeRecord | null
  busy: boolean
  error: string | null
  claims: ResumeClaimItem[]
  /** Tools named on the resume with readiness for each, weakest first. */
  tools: ResumeTool[]
  /** Eight questions for the claim, generated on demand and stable across renders. */
  questionsFor: (claimId: string) => ClaimQuestion[]
  defensibility: Record<string, Defensibility>
  attemptsFor: (claimId: string) => DrillAttempt[]
  importFile: (file: ReadableFile) => Promise<void>
  importText: (text: string) => Promise<void>
  answer: (question: ClaimQuestion, text: string) => Promise<DrillAttempt | null>
  clear: () => Promise<void>
}

const MIN_RESUME_CHARS = 40

function newId(): string {
  return `resume-${Date.now().toString(36)}`
}

/** Container hook for ForgeResume: holds the one current resume and the drills answered against it. */
export function useResume(
  { repository, interviewRepository, analyzer }: ResumeRuntime,
  now: () => Date = () => new Date(),
): ResumeApi {
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState<ResumeRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const latest = useRef<ResumeRecord | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([repository.load(), interviewRepository.list()]).then(
      ([loaded, loadedSessions]) => {
        if (!active) return
        const current = loaded ? refreshTechnologies(loaded) : null
        latest.current = current
        setRecord(current)
        setSessions(loadedSessions)
        setLoading(false)
      },
    )
    return () => {
      active = false
    }
  }, [repository, interviewRepository])

  const commit = useCallback(
    async (next: ResumeRecord | null) => {
      latest.current = next
      setRecord(next)
      if (next) await repository.save(next)
      else await repository.clear()
    },
    [repository],
  )

  const importText = useCallback(
    async (text: string, format: ResumeRecord['format'] = 'paste', fileName?: string) => {
      setError(null)
      if (text.trim().length < MIN_RESUME_CHARS) {
        setError('That is too short to be a resume. Paste the full text or upload a file.')
        return
      }
      const built = buildResumeRecord({
        id: newId(),
        text,
        format,
        now: now().toISOString(),
        ...(fileName ? { fileName } : {}),
      })
      if (built.claims.length === 0) {
        setError(
          'No achievements or skills were found. Check that the text has an experience section with one statement per line.',
        )
        return
      }
      await commit(built)
    },
    [commit, now],
  )

  const importFile = useCallback(
    async (file: ReadableFile) => {
      setBusy(true)
      setError(null)
      try {
        const content = await readResumeFile(file)
        await importText(content.text, content.format, file.name)
      } catch (e) {
        setError(e instanceof ResumeFileError ? e.message : 'That file could not be read.')
      } finally {
        setBusy(false)
      }
    },
    [importText],
  )

  const answer = useCallback(
    async (question: ClaimQuestion, text: string): Promise<DrillAttempt | null> => {
      const current = latest.current
      if (!current || text.trim().length === 0) return null
      setBusy(true)
      setError(null)
      try {
        const attempt = await evaluateDrill({ question, answer: text, analyzer, now })
        await commit({ ...current, attempts: [...current.attempts, attempt] })
        return attempt
      } catch {
        setError('The answer could not be scored. Try again.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [analyzer, commit, now],
  )

  const clear = useCallback(async () => {
    setError(null)
    await commit(null)
  }, [commit])

  const claims = useMemo(() => record?.claims ?? [], [record])
  const questionsByClaim = useMemo(
    () => new Map(claims.map((c) => [c.id, generateClaimQuestions(c)])),
    [claims],
  )
  const questionsFor = useCallback(
    (claimId: string) => questionsByClaim.get(claimId) ?? [],
    [questionsByClaim],
  )

  const defensibility = useMemo(() => {
    const out: Record<string, Defensibility> = {}
    for (const claim of claims) out[claim.id] = assessClaim(claim.id, record?.attempts ?? [])
    return out
  }, [claims, record])

  const tools = useMemo(
    () => assessResumeTools(record, collectEvidence({ sessions, resume: record })),
    [record, sessions],
  )

  const attemptsFor = useCallback(
    (claimId: string) => (record?.attempts ?? []).filter((a) => a.claimId === claimId),
    [record],
  )

  return {
    loading,
    record,
    busy,
    error,
    claims,
    tools,
    questionsFor,
    defensibility,
    attemptsFor,
    importFile,
    importText: (text) => importText(text),
    answer,
    clear,
  }
}
