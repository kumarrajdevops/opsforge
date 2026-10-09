/**
 * Command Center read model. It is derived from the Readiness Engine report and the evidence
 * behind it, never supplied separately, so the Command Center and the Readiness page cannot
 * disagree. Scores are 0-100; `null` means no evidence and is never shown as zero.
 */

import type {
  EvidenceConfidence,
  ReadinessFactorId,
  ReadinessScoreBand,
  TrendDirection,
} from './readiness'

/** The areas readiness is judged on; identical to the engine's factors. */
export type EvidenceDimensionId = ReadinessFactorId

/** Interpretation band assigned by the engine. */
export type ScoreBand = ReadinessScoreBand

export type ModuleKey =
  | 'knowledge'
  | 'flashcards'
  | 'questions'
  | 'incidents'
  | 'labs'
  | 'architecture'
  | 'interviewer'
  | 'resume'
  | 'jd'
  | 'readiness'

export interface ReadinessLevel {
  /** 1 Learner … 6 Architect */
  value: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  /** Why the level is what it is, in the engine's words. */
  reason: string
  /** The checks the next level still needs, taken from the engine's gate. */
  next: { label: string; requirements: string[] } | null
}

export interface DimensionScore {
  id: EvidenceDimensionId
  label: string
  /** null = no evidence yet. */
  score: number | null
  band: ScoreBand | null
  target: number
  evidenceCount: number
  confidence: EvidenceConfidence
  /** Recent minus earlier evidence, in points; null when there is too little to compare. */
  delta: number | null
}

export interface FailureRisk {
  id: string
  /** Short statement of how the interview would go wrong. */
  title: string
  /** Evidence-based explanation. */
  reason: string
  likelihood: 'high' | 'medium' | 'low'
  dimension: EvidenceDimensionId
  evidenceCount: number
  action: { label: string; module: ModuleKey; available: boolean }
}

export type SkillModeId = 'knowledge' | 'hands-on' | 'troubleshooting' | 'interview'

export interface SkillCell {
  mode: SkillModeId
  /** null = no evidence yet; never rendered as zero. */
  score: number | null
  band: ScoreBand | null
}

export interface SkillRow {
  id: string
  label: string
  overall: number
  band: ScoreBand
  target: number
  evidenceCount: number
  cells: SkillCell[]
}

export interface WeakSkill {
  skillId: string
  label: string
  score: number
  target: number
  band: ScoreBand
  reason: string
  action: { label: string; module: ModuleKey }
}

export interface PlanItem {
  id: string
  title: string
  minutes: number
  reason: string
  status: 'next' | 'todo'
  module: ModuleKey
  available: boolean
}

export interface TodayPlan {
  totalMinutes: number
  items: PlanItem[]
}

export interface ContinueItem {
  id: string
  title: string
  detail: string
  /** Score of that attempt, 0-100. */
  score: number
  lastActive: string
  module: ModuleKey
}

export interface EvidenceEvent {
  id: string
  at: string
  /** Module the observation came from. */
  source: string
  subject: string
  outcome: 'pass' | 'partial' | 'fail'
  score: number
  dimension: EvidenceDimensionId
  /** Share of the dimension's weight this item carries, 0..1. */
  share: number
  note: string
}

export interface IncidentRecord {
  id: string
  title: string
  outcome: 'resolved' | 'partial' | 'failed'
  score: number
  at: string
}

export interface ArchitectureProgress {
  scenariosCompleted: number
  scenariosTotal: number
  /** The most recent reviewed design. */
  latest: { title: string; score: number; band: ScoreBand; gaps: string[] } | null
}

export interface RecommendedAction {
  title: string
  why: string
  estimatedMinutes: number
  /** What a strong result would do to the factor, from the engine's projection. */
  expectedImpact: string | null
  module: ModuleKey
  available: boolean
}

export interface TrendPoint {
  /** ISO date */
  date: string
  score: number
}

export interface CommandCenterSnapshot {
  generatedAt: string
  evidenceTotal: number
  overall: {
    /** null until at least one factor has evidence. */
    score: number | null
    band: ScoreBand | null
    target: number
    /** Share of total factor weight that has any evidence, 0..1. */
    coverage: number
    confidence: EvidenceConfidence
    confidenceReason: string
    direction: TrendDirection
    delta: number | null
    level: ReadinessLevel
    trend: TrendPoint[]
  }
  dimensions: DimensionScore[]
  failureRisks: FailureRisk[]
  skillModes: { id: SkillModeId; label: string }[]
  skills: SkillRow[]
  weakestSkills: WeakSkill[]
  plan: TodayPlan
  continueTraining: ContinueItem[]
  recentEvidence: EvidenceEvent[]
  recentIncidents: IncidentRecord[]
  architecture: ArchitectureProgress
  nextAction: RecommendedAction | null
}
