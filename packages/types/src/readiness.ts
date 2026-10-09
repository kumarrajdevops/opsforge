/*
 * Readiness Engine contract (PRD 4.16, RDY-01..11).
 *
 * Authority split (AI-01, AI-04): language models may only influence the evidence that module
 * adapters hand to the engine (through an `AnswerAnalyzer`). Scores, bands, levels and
 * recommendations are produced by deterministic, versioned rules. Nothing in this contract lets
 * a caller supply a level or a score for a factor.
 */

import type { ModuleKey } from './command-center'

/** The areas readiness is judged on. Knowledge and confidence are separate by construction. */
export type ReadinessFactorId =
  | 'knowledge'
  | 'questions'
  | 'flashcards'
  | 'labs'
  | 'troubleshooting'
  | 'incidents'
  | 'architecture'
  | 'security'
  | 'communication'
  | 'interviews'
  | 'confidence'

/** The module an observation came from. Level gates require evidence from several of these. */
export type EvidenceOrigin =
  | 'interview'
  | 'resume-drill'
  | 'incident'
  | 'architecture'
  | 'knowledge'
  | 'question'
  | 'flashcard'
  | 'lab'

/** How the underlying evidence was produced; used only to scale its reliability. */
export type EvidenceBasis = 'deterministic' | 'rule-based' | 'mixed' | 'llm-assisted'

/**
 * One normalised, scored observation. The same attempt can yield several items, one per factor
 * it evidences, which is how an interview answer feeds knowledge, communication and confidence
 * separately.
 */
export interface ReadinessEvidence {
  /** Stable and unique per (attempt, factor). */
  id: string
  /** The answer, session or design this came from. Level gates count attempts, not items. */
  attemptId: string
  origin: EvidenceOrigin
  factor: ReadinessFactorId
  /** 0 to 100. Missing evidence is never represented as a zero; it is simply absent. */
  score: number
  at: string
  /** Human-readable provenance, e.g. "Interview, Kubernetes networking". */
  label: string
  /** Subject used to group weaknesses, e.g. "Kubernetes". */
  topic?: string
  basis: EvidenceBasis
  /** What was missed or wrong, in plain words. Feeds the weakness list. */
  gaps?: string[]
  /** Attempt-level weight multiplier in 0..1, e.g. less for a partially completed incident. */
  reliability?: number
}

export type ReadinessScoreBand = 'critical' | 'weak' | 'developing' | 'solid' | 'strong'
export type EvidenceConfidence = 'none' | 'low' | 'medium' | 'high'

export interface EvidenceContribution {
  evidenceId: string
  label: string
  origin: EvidenceOrigin
  at: string
  score: number
  /** Weight after recency decay and reliability. */
  weight: number
  /** This item's share of the factor's total weight, 0..1. */
  share: number
  /** Points it adds to the factor score (score x share). */
  points: number
}

export interface ReadinessWeakness {
  id: string
  severity: 'high' | 'medium' | 'low'
  text: string
  topic?: string
  evidenceIds: string[]
}

export type TrendDirection = 'improving' | 'declining' | 'steady' | 'insufficient'

export interface ReadinessTrendPoint {
  /** ISO timestamp of the evidence the point was computed as of. */
  at: string
  score: number
}

export interface ReadinessTrend {
  direction: TrendDirection
  /** Recent minus earlier, in points; null when there is too little evidence to compare. */
  delta: number | null
  points: ReadinessTrendPoint[]
}

export interface ReadinessAction {
  id: string
  title: string
  why: string
  module: ModuleKey
  /** True when the module exists; false when it is planned but not built yet. */
  available: boolean
  minutes: number
  /** What a strong result (80) would do to the score, computed from current weights. */
  projection: { from: number | null; to: number } | null
}

export interface FactorReport {
  id: ReadinessFactorId
  label: string
  /** null = no evidence; never rendered as zero. */
  score: number | null
  band: ReadinessScoreBand | null
  target: number
  evidenceCount: number
  /** Distinct modules that contributed. */
  originCount: number
  evidenceConfidence: EvidenceConfidence
  confidenceReason: string
  trend: ReadinessTrend
  /** Every item that moved the score, largest share first. */
  contributions: EvidenceContribution[]
  weaknesses: ReadinessWeakness[]
  nextAction: ReadinessAction
}

export interface CalibrationReport {
  knowledge: number | null
  confidence: number | null
  /** knowledge minus confidence, in points. */
  gap: number | null
  pattern: 'aligned' | 'under-confident' | 'over-confident' | 'insufficient'
  summary: string
  guidance: string
  actions: ReadinessAction[]
}

export interface LevelGateCheck {
  id: string
  label: string
  /** What the evidence shows, as display text. */
  current: string
  /** What the level requires, as display text. */
  required: string
  passed: boolean
}

export interface LevelGate {
  level: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  passed: boolean
  checks: LevelGateCheck[]
}

export interface ReadinessLevelResult {
  value: 1 | 2 | 3 | 4 | 5 | 6
  label: string
  /** The gate for the next level, with each check; null at the top level. */
  next: LevelGate | null
  /** One entry per level, in order, including the gate the candidate cleared. */
  gates: LevelGate[]
  /** Why the level is what it is, in one sentence. */
  reason: string
}

export interface OverallReadiness {
  /** Weighted over the factors that have evidence; null when none do. */
  score: number | null
  band: ReadinessScoreBand | null
  /** Share of total factor weight that has any evidence, 0..1. */
  coverage: number
  evidenceConfidence: EvidenceConfidence
  confidenceReason: string
  trend: ReadinessTrend
  target: number
}

export interface ReadinessReport {
  engineVersion: string
  configVersion: string
  generatedAt: string
  evidenceCount: number
  overall: OverallReadiness
  level: ReadinessLevelResult
  factors: FactorReport[]
  calibration: CalibrationReport
  /** Highest-value next actions across all factors, best first. */
  nextActions: ReadinessAction[]
  /** Hash of the evidence ids and config version; equal when nothing new was learned. */
  fingerprint: string
}

/** An immutable record of a past report. Snapshots are only ever appended. */
export interface ReadinessSnapshot {
  id: string
  takenAt: string
  configVersion: string
  fingerprint: string
  evidenceCount: number
  overall: number | null
  level: number
  factors: Partial<Record<ReadinessFactorId, number | null>>
}

export interface ReadinessSnapshotRepository {
  list(): Promise<ReadinessSnapshot[]>
  append(snapshot: ReadinessSnapshot): Promise<void>
}

/** One module's contribution to the evidence pool. */
export interface EvidenceSourceStatus {
  origin: EvidenceOrigin
  label: string
  /** The module that produces this evidence exists and is wired in. */
  connected: boolean
  evidenceCount: number
  note: string
}
