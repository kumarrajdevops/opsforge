/**
 * Command Center read model. The readiness engine owns every number, band and recommendation
 * here; the UI only renders them. Scores are 0-100.
 */

export type EvidenceDimensionId =
  | 'knowledge'
  | 'practice'
  | 'hands-on'
  | 'troubleshooting'
  | 'architecture'
  | 'security'
  | 'communication'
  | 'confidence'
  | 'incident-response'

/** Interpretation band assigned by the engine. */
export type ScoreBand = 'critical' | 'weak' | 'developing' | 'solid' | 'strong'

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
  next: { label: string; requirement: string } | null
}

export interface DimensionScore {
  id: EvidenceDimensionId
  label: string
  score: number
  band: ScoreBand
  /** Senior-track benchmark for this dimension. */
  target: number
  /** Change vs the snapshot a week ago, in points. */
  weeklyDelta: number
  evidenceCount: number
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
  action: { label: string; module: ModuleKey }
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

export type PlanItemKind =
  'revision' | 'flashcards' | 'interview' | 'troubleshooting' | 'architecture' | 'verbal'

export interface PlanItem {
  id: string
  kind: PlanItemKind
  title: string
  minutes: number
  reason: string
  status: 'done' | 'next' | 'todo'
  module: ModuleKey
}

export interface TodayPlan {
  totalMinutes: number
  completedMinutes: number
  items: PlanItem[]
}

export interface ContinueItem {
  id: string
  kind: 'architecture' | 'incident' | 'interview' | 'lab'
  title: string
  detail: string
  /** 0-100 */
  progress: number
  lastActive: string
  module: ModuleKey
}

export interface EvidenceEvent {
  id: string
  at: string
  mode: 'interview' | 'incident' | 'lab' | 'quiz' | 'architecture' | 'flashcards'
  subject: string
  outcome: 'pass' | 'partial' | 'fail'
  dimension: EvidenceDimensionId
  /** Effect on the dimension score, in points. */
  impact: number
  note: string
}

export interface IncidentRecord {
  id: string
  title: string
  severity: 'SEV1' | 'SEV2' | 'SEV3'
  outcome: 'resolved' | 'partial' | 'failed'
  minutesToMitigate: number | null
  rootCauseFound: boolean
  at: string
}

export interface ArchitectureStage {
  id: string
  label: string
  status: 'done' | 'current' | 'todo'
}

export interface ArchitectureProgress {
  scenariosCompleted: number
  scenariosTotal: number
  current: { title: string; stageProgress: number } | null
  stages: ArchitectureStage[]
  /** Rubric criteria from the latest reviewed design. */
  rubric: { id: string; label: string; score: number; target: number; band: ScoreBand }[]
}

export interface RecommendedAction {
  title: string
  why: string
  estimatedMinutes: number
  expectedImpact: string
  module: ModuleKey
}

export interface TrendPoint {
  /** ISO date */
  date: string
  score: number
}

export interface CommandCenterSnapshot {
  generatedAt: string
  /** Where the data came from; `sample` means the readiness engine is not connected. */
  source: 'engine' | 'sample'
  evidenceTotal: number
  overall: {
    score: number
    band: ScoreBand
    seniorTarget: number
    weeklyDelta: number
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
  nextAction: RecommendedAction
}
