/*
 * ForgeResume (Resume Interrogation) and ForgeJD (JD Analyzer) domain contract.
 *
 * Authority split (PRD AI-01, AI-04): extraction, question generation, defensibility, comparison and
 * planning are deterministic. A language model may be used only through the existing `AnswerAnalyzer`
 * port to produce answer *evidence*; it never produces a score, a status or a plan.
 */

import type { QuestionSpec, ResumeClaim, ThreadEvaluation } from './interview'

// ───────────────────────────── Resume ─────────────────────────────

export type ResumeSourceFormat = 'paste' | 'txt' | 'md' | 'docx'

export type ResumeSectionKind =
  'summary' | 'experience' | 'skills' | 'projects' | 'certifications' | 'education' | 'other'

export interface ResumeSection {
  kind: ResumeSectionKind
  heading: string
  text: string
}

/** What kind of statement the line makes. Decides which interrogation categories lead. */
export type ClaimKind = 'implementation' | 'design' | 'operations' | 'improvement' | 'leadership'

/** Weaknesses visible in the wording itself, before any question is asked. */
export type ClaimFlag = 'no-metric' | 'team-language' | 'vague-scope' | 'listed-only'

export interface ResumeClaimItem extends ResumeClaim {
  kind: ClaimKind
  section: ResumeSectionKind
  /** Employer or role heading the line sat under, when one was found. */
  context?: string
  /** The leading action verb ("Implemented"), when the line starts with one. */
  verb?: string
  flags: ClaimFlag[]
}

/** The eight angles every claim is interrogated from. */
export type InterrogationCategory =
  | 'architecture'
  | 'networking'
  | 'security'
  | 'observability'
  | 'troubleshooting'
  | 'trade-offs'
  | 'incidents'
  | 'leadership'

export interface ClaimQuestion {
  /** Stable for a given claim and category, so attempts can be matched to questions. */
  id: string
  claimId: string
  category: InterrogationCategory
  /** `technology-pack` when the rubric is specific to the claim's technology. */
  rubric: 'technology-pack' | 'generic'
  spec: QuestionSpec
}

/** One answered drill. The full evaluation is stored so the result can be shown and audited later. */
export interface DrillAttempt {
  id: string
  claimId: string
  category: InterrogationCategory
  questionId: string
  answer: string
  answeredAt: string
  analyzerId: string
  evaluation: ThreadEvaluation
}

export type DefensibilityLevel = 'untested' | 'exposed' | 'shaky' | 'defensible' | 'strong'

export interface CategoryResult {
  category: InterrogationCategory
  /** Best score across attempts, or null when never attempted. */
  best: number | null
  attempts: number
}

export interface Defensibility {
  claimId: string
  level: DefensibilityLevel
  /** Mean of the best score per attempted category, or null when untested. */
  score: number | null
  categories: CategoryResult[]
  covered: number
  total: number
  weakest: InterrogationCategory | null
  /** Plain-language reason for the level. */
  reason: string
}

export interface ResumeRecord {
  id: string
  schemaVersion: 1
  fileName?: string
  format: ResumeSourceFormat
  importedAt: string
  rawText: string
  sections: ResumeSection[]
  claims: ResumeClaimItem[]
  attempts: DrillAttempt[]
}

export interface ResumeRepository {
  load(): Promise<ResumeRecord | null>
  save(record: ResumeRecord): Promise<void>
  clear(): Promise<void>
}

// ───────────────────────────── Job description ─────────────────────────────

export type JdPriority = 'required' | 'preferred'

export type SeniorityLevel = 'mid' | 'senior' | 'staff'

export interface JdTechnology {
  /** Catalog id. */
  id: string
  label: string
  priority: JdPriority
  mentions: number
  /** The sentence that decided the priority. */
  quote: string
  /** Set when the posting names this tool only as one choice among alternatives. */
  group?: string
}

/** "At least one of AWS, Azure or GCP": meeting any option satisfies the requirement. */
export interface JdAlternativeGroup {
  id: string
  label: string
  /** Catalog ids of the alternatives, in posting order. */
  options: string[]
  priority: JdPriority
  quote: string
}

export type ResponsibilityTheme =
  | 'delivery'
  | 'reliability'
  | 'platform'
  | 'security'
  | 'observability'
  | 'cost'
  | 'leadership'
  | 'collaboration'

export interface JdResponsibility {
  id: string
  text: string
  theme: ResponsibilityTheme
  /** Catalog technologies named in the same line. */
  technologies: string[]
}

export type SenioritySignalKind =
  'title' | 'years' | 'ownership' | 'leadership' | 'architecture' | 'scope' | 'on-call'

export interface SenioritySignal {
  id: string
  kind: SenioritySignalKind
  /** The level this signal points to. */
  level: SeniorityLevel
  quote: string
}

export type SkillArea = 'practice' | 'communication' | 'leadership'

/** A non-technology skill the posting asks for ("capacity planning", "mentoring"). */
export interface JdSkill {
  id: string
  label: string
  area: SkillArea
  priority: JdPriority
  quote: string
  /** Catalog technology whose evidence counts towards this skill, when one is relevant. */
  evidenceTechnology?: string
}

export interface JdAnalysis {
  id: string
  schemaVersion: 1
  title?: string
  rawText: string
  analyzedAt: string
  technologies: JdTechnology[]
  /** Absent in analyses saved before alternatives were grouped. */
  alternatives?: JdAlternativeGroup[]
  responsibilities: JdResponsibility[]
  seniority: SenioritySignal[]
  /** The level the signals add up to, or null when the posting says too little. */
  seniorityLevel: SeniorityLevel | null
  skills: JdSkill[]
}

export interface JdRepository {
  load(): Promise<JdAnalysis | null>
  save(analysis: JdAnalysis): Promise<void>
  clear(): Promise<void>
}

// ───────────────────────────── Readiness evidence ─────────────────────────────

/** `tested` evidence came from answering a question and was scored; `claimed` is only on the resume. */
export interface EvidenceItem {
  id: string
  technology: string
  source: 'interview' | 'drill' | 'resume'
  strength: 'tested' | 'claimed'
  /** 0 to 100 for tested evidence; null when only claimed. */
  score: number | null
  /** What produced it, e.g. "Interview 12 Oct, Kubernetes networking". */
  label: string
  at: string
  /** True when it came from a related technology rather than the one requested. */
  adjacent: boolean
}

export type RequirementStatus =
  'demonstrated' | 'partial' | 'weak' | 'claimed-untested' | 'no-evidence'

export type RequirementKind = 'technology' | 'skill' | 'responsibility' | 'alternative'

/** How one alternative in a group stands. */
export interface RequirementOption {
  technology: string
  label: string
  status: RequirementStatus
  score: number | null
}

export interface RequirementAssessment {
  id: string
  kind: RequirementKind
  label: string
  priority: JdPriority
  /** Catalog technologies the requirement is assessed through. */
  technologies: string[]
  status: RequirementStatus
  /** Mean of tested direct evidence, or null. */
  score: number | null
  evidence: EvidenceItem[]
  reason: string
  /** For an alternative group: every option and where it stands. `technologies` holds the best-placed one. */
  options?: RequirementOption[]
}

export interface JdComparison {
  assessments: RequirementAssessment[]
  /** Share of required items that are demonstrated or partial, 0 to 100. */
  requiredCoverage: number
  /** Share of required items demonstrated, 0 to 100. */
  requiredDemonstrated: number
  counts: Record<RequirementStatus, number>
  /** Evidence available at all; the comparison is only as good as this. */
  testedEvidenceCount: number
}

// ───────────────────────────── Preparation plan ─────────────────────────────

export type PrepActionKind =
  'defend-claim' | 'mock-interview' | 'study' | 'incident' | 'architecture'

export interface PrepPlanAction {
  kind: PrepActionKind
  label: string
  detail: string
  minutes: number
  /** In-app route that does the work, when one exists. */
  path?: string
  /** For `study`: ideas the candidate should be able to explain unprompted. */
  checklist?: string[]
}

export interface PrepPlanItem {
  id: string
  requirementId: string
  label: string
  priority: JdPriority
  status: RequirementStatus
  /** Higher is more urgent. Deterministic: priority weight times gap severity. */
  urgency: number
  reason: string
  actions: PrepPlanAction[]
  options?: RequirementOption[]
}

export interface PrepPlanSlot {
  itemId: string
  itemLabel: string
  action: PrepPlanAction
}

export interface PrepPlanDay {
  day: number
  minutes: number
  slots: PrepPlanSlot[]
}

export interface PreparationPlan {
  createdAt: string
  days: number
  minutesPerDay: number
  items: PrepPlanItem[]
  schedule: PrepPlanDay[]
  /** Items that did not fit in the available time. */
  unscheduled: string[]
}

export type LearningPhaseId = 'gaps' | 'evidence' | 'strengthen' | 'preferred'

/** Plan items grouped by what kind of work they need, in the order to tackle them. */
export interface LearningPhase {
  id: LearningPhaseId
  title: string
  description: string
  items: PrepPlanItem[]
  minutes: number
}
