import type {
  EvidenceItem,
  InterviewRepository,
  JdAnalysis,
  JdComparison,
  JdRepository,
  LearningPhase,
  PreparationPlan,
  ResumeRecord,
  ResumeRepository,
} from '@opsforge/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { collectEvidence } from '../readiness-evidence/collect'
import { compareJd } from '../readiness-evidence/compare'
import { refreshTechnologies } from '../resume/claims'
import { analyzeJd } from './analyze'
import {
  DEFAULT_MINUTES_PER_DAY,
  DEFAULT_PLAN_DAYS,
  buildLearningPath,
  buildPreparationPlan,
} from './plan'
import { assessJdTools, type JdTool } from './tools'

export interface JdRuntime {
  jdRepository: JdRepository
  resumeRepository: ResumeRepository
  interviewRepository: InterviewRepository
}

export interface PlanSettings {
  days: number
  minutesPerDay: number
}

export interface JdApi {
  loading: boolean
  jd: JdAnalysis | null
  resume: ResumeRecord | null
  evidence: EvidenceItem[]
  comparison: JdComparison | null
  plan: PreparationPlan | null
  path: LearningPhase[]
  tools: JdTool[]
  settings: PlanSettings
  error: string | null
  analyze: (text: string) => Promise<void>
  setSettings: (settings: PlanSettings) => void
  clear: () => Promise<void>
}

const MIN_JD_CHARS = 40

/** Container hook for ForgeJD: analyses the posting and compares it with evidence read from other modules. */
export function useJd(
  { jdRepository, resumeRepository, interviewRepository }: JdRuntime,
  now: () => Date = () => new Date(),
): JdApi {
  const [loading, setLoading] = useState(true)
  const [jd, setJd] = useState<JdAnalysis | null>(null)
  const [resume, setResume] = useState<ResumeRecord | null>(null)
  const [sessions, setSessions] = useState<Awaited<ReturnType<InterviewRepository['list']>>>([])
  const [settings, setSettings] = useState<PlanSettings>({
    days: DEFAULT_PLAN_DAYS,
    minutesPerDay: DEFAULT_MINUTES_PER_DAY,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([
      jdRepository.load(),
      resumeRepository.load(),
      interviewRepository.list(),
    ]).then(([loadedJd, loadedResume, loadedSessions]) => {
      if (!active) return
      setJd(
        loadedJd
          ? analyzeJd({ id: loadedJd.id, text: loadedJd.rawText, now: loadedJd.analyzedAt })
          : null,
      )
      setResume(loadedResume ? refreshTechnologies(loadedResume) : null)
      setSessions(loadedSessions)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [jdRepository, resumeRepository, interviewRepository])

  const evidence = useMemo(() => collectEvidence({ sessions, resume }), [sessions, resume])
  const comparison = useMemo(() => (jd ? compareJd(jd, evidence) : null), [jd, evidence])
  const plan = useMemo(
    () =>
      jd && comparison
        ? buildPreparationPlan({
            comparison,
            claims: resume?.claims ?? [],
            now: jd.analyzedAt,
            ...settings,
          })
        : null,
    [jd, comparison, resume, settings],
  )

  const path = useMemo(() => (plan ? buildLearningPath(plan) : []), [plan])
  const tools = useMemo(() => assessJdTools(jd, evidence), [jd, evidence])

  const analyze = useCallback(
    async (text: string) => {
      setError(null)
      if (text.trim().length < MIN_JD_CHARS) {
        setError('That is too short to be a job description. Paste the full posting.')
        return
      }
      const analysis = analyzeJd({
        id: `jd-${now().getTime().toString(36)}`,
        text,
        now: now().toISOString(),
      })
      if (analysis.technologies.length === 0 && analysis.skills.length === 0) {
        setError(
          'No technologies or skills were recognised. Check that the posting text was pasted in full.',
        )
        return
      }
      setJd(analysis)
      await jdRepository.save(analysis)
    },
    [jdRepository, now],
  )

  const clear = useCallback(async () => {
    setError(null)
    setJd(null)
    await jdRepository.clear()
  }, [jdRepository])

  return {
    loading,
    jd,
    resume,
    evidence,
    comparison,
    plan,
    path,
    tools,
    settings,
    error,
    analyze,
    setSettings,
    clear,
  }
}
