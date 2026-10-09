/*
 * ForgeInterview (AI Interviewer) domain contract.
 *
 * Authority split (PRD AI-01, AI-04, INT-04):
 * - Question selection and follow-up policy are deterministic and adaptive.
 * - An `AnswerAnalyzer` produces *evidence* (concepts covered, signals, red flags). It may be a
 *   rule-based extractor or a wrapper over an `LlmProvider`; either way it never returns a score.
 * - Scores come only from the deterministic scorer, are stored on the session, and are not shown to
 *   the candidate until the interview is complete.
 */

// ───────────────────────────── Taxonomy ─────────────────────────────

export type InterviewRoundKind =
  'screening' | 'technical' | 'troubleshooting' | 'architecture' | 'behavioral' | 'final'

export type InterviewMode = 'single-round' | 'interview-day' | 'emergency'

/** L1 to L4 in PRD QST-03. */
export type QuestionDifficulty = 'basic' | 'intermediate' | 'senior' | 'staff'

/** Where a question came from: the curated bank, or grounded in the candidate's resume or the JD. */
export type QuestionOrigin = 'bank' | 'resume' | 'jd'

/** Scoring dimensions (PRD INT-08). */
export type InterviewDimensionId =
  | 'technical-accuracy'
  | 'depth'
  | 'follow-up-handling'
  | 'architecture-thinking'
  | 'incident-response'
  | 'communication'
  | 'confidence'
  | 'structure'
  | 'conciseness'
  | 'trade-off-reasoning'

/** Why the interviewer asked a follow-up. The wording never states the answer. */
export type ProbeKind =
  'clarify' | 'gap' | 'depth' | 'tradeoff' | 'challenge' | 'ownership' | 'outcome' | 'signal'

/**
 * Observable properties of an answer. Detected by the analyzer, scored by the deterministic scorer.
 * Grouped by what they evidence.
 */
export type AnswerSignalId =
  // delivery
  | 'structured'
  | 'example'
  | 'metric'
  | 'tradeoff'
  | 'hedging'
  | 'honest-uncertainty'
  // ownership
  | 'ownership'
  | 'team-only'
  // incident response
  | 'scope-first'
  | 'hypothesis'
  | 'mitigation'
  | 'verification'
  | 'communication-plan'
  | 'prevention'
  // architecture thinking
  | 'requirements'
  | 'failure-modes'
  | 'scalability'
  | 'security'
  | 'cost'
  | 'observability'
  // behavioral (STAR + reflection)
  | 'situation'
  | 'task'
  | 'action'
  | 'result'
  | 'reflection'

// ───────────────────────────── Question authoring ─────────────────────────────

/** One idea a strong answer contains. Hidden from the candidate until the debrief. */
export interface ConceptSpec {
  id: string
  label: string
  /** One sentence on what the candidate should know. Shown in the debrief for missed concepts. */
  summary: string
  /** 1 (nice to have) to 3 (the heart of the answer). */
  weight: 1 | 2 | 3
  required: boolean
  /** `core` knowledge or a `tradeoff` consideration (feeds trade-off reasoning). */
  kind: 'core' | 'tradeoff'
  /** Lower-case phrases that evidence the concept in an answer. Matched on word starts, so stems work. */
  terms: string[]
  /** Neutral follow-up when the concept is absent. Must not state or hint at the answer. */
  probe: string
  /** Follow-up when the concept is named but not explained. Optional; a generic one is derived. */
  depthProbe?: string
}

/** A known misconception. Detecting it triggers a challenge, and it lowers technical accuracy. */
export interface RedFlagSpec {
  id: string
  label: string
  patterns: string[]
  /** The challenge the interviewer raises. */
  challenge: string
  /** Debrief note describing the misconception. */
  note: string
}

export interface QuestionSpec {
  id: string
  rounds: InterviewRoundKind[]
  topic: string
  technologies: string[]
  difficulty: QuestionDifficulty
  prompt: string
  /** What this question is really testing. Debrief only. */
  intent: string
  concepts: ConceptSpec[]
  redFlags?: RedFlagSpec[]
  /** Signals a strong answer shows (STAR for behavioral, scope-first for troubleshooting...). */
  expectedSignals?: AnswerSignalId[]
  /** Acceptable answer length in words: below the low end is thin, above the high end rambles. */
  wordRange: [number, number]
  /** Per-question weight overrides on top of the round's dimension weights. */
  emphasis?: Partial<Record<InterviewDimensionId, number>>
  maxFollowUps?: number
}

// ───────────────────────────── Grounding ─────────────────────────────

export interface ResumeClaim {
  id: string
  text: string
  technologies: string[]
  /** The claim already includes a number, so the interviewer will ask what sat behind it. */
  hasMetric: boolean
}

export interface JdRequirement {
  id: string
  technology: string
  label: string
  priority: 'must' | 'nice'
}

export interface InterviewContext {
  targetRole?: string
  resumeClaims: ResumeClaim[]
  jdRequirements: JdRequirement[]
}

// ───────────────────────────── Plan ─────────────────────────────

export interface RoundPlan {
  kind: InterviewRoundKind
  timeboxMinutes: number
  /** Number of main questions; follow-ups are extra. */
  questionTarget: number
}

export interface InterviewConfig {
  mode: InterviewMode
  level: 'senior' | 'staff'
  rounds: RoundPlan[]
  /** Seeds the planner so a session's question order is reproducible. */
  seed: number
  context: InterviewContext
  /** Topics to prioritise (weak areas from earlier sessions). */
  focusTopics: string[]
}

// ───────────────────────────── Answers and evidence ─────────────────────────────

export interface CandidateAnswer {
  text: string
  submittedAt: string
  /** Seconds from the question being shown to submission, clamped to a sane maximum. */
  durationSeconds: number
  skipped: boolean
}

export interface ConceptHit {
  conceptId: string
  strength: 'named' | 'explained'
  /** Exact text from the answer that supports the hit. */
  quote: string
}

export interface SignalHit {
  signal: AnswerSignalId
  quote?: string
}

export interface RedFlagHit {
  redFlagId: string
  quote: string
}

export interface AnswerMetrics {
  wordCount: number
  sentenceCount: number
  avgSentenceWords: number
  hedgeCount: number
  fillerCount: number
}

export type AnalysisBasis = 'rule-based' | 'llm-assisted'

export interface AnswerEvidence {
  analyzerId: string
  basis: AnalysisBasis
  /** Set when a configured analyzer failed and the rule-based one was used instead. */
  fallbackReason?: string
  concepts: ConceptHit[]
  signals: SignalHit[]
  redFlags: RedFlagHit[]
  metrics: AnswerMetrics
}

export interface InterviewTurn {
  id: string
  kind: 'question' | 'follow-up'
  probe?: ProbeKind
  /** What the candidate saw. */
  prompt: string
  /** The deterministic wording, kept when a voice provider rephrased it. */
  authoredPrompt: string
  /** Provider id when the wording was produced by an `InterviewerVoice`. */
  phrasedBy?: string
  /** Concept or signal the probe targets, for replay. */
  target?: string
  askedAt: string
  answer?: CandidateAnswer
  evidence?: AnswerEvidence
}

// ───────────────────────────── Evaluation (hidden until complete) ─────────────────────────────

export interface DimensionResult {
  id: InterviewDimensionId
  /** 0 to 100, or null when nothing in this thread could evidence the dimension. */
  score: number | null
  note: string
}

export interface ConceptOutcome {
  conceptId: string
  label: string
  summary: string
  required: boolean
  status: 'missed' | 'named' | 'explained'
  quote?: string
}

export interface RedFlagOutcome {
  redFlagId: string
  label: string
  note: string
  quote: string
}

export type ThreadCloseReason = 'covered' | 'follow-up-limit' | 'moved-on' | 'skipped' | 'time'

export interface ThreadEvaluation {
  scoringVersion: string
  basis: AnalysisBasis | 'mixed'
  /** 0 to 100. */
  score: number
  dimensions: DimensionResult[]
  concepts: ConceptOutcome[]
  redFlags: RedFlagOutcome[]
  signals: AnswerSignalId[]
  followUps: { asked: number; productive: number }
}

export interface QuestionThread {
  id: string
  roundId: string
  /** Full copy of the question and rubric, so replay and re-scoring survive bank changes. */
  spec: QuestionSpec
  origin: QuestionOrigin
  /** The resume claim or JD requirement this question was grounded in. */
  groundedIn?: string
  turns: InterviewTurn[]
  status: 'open' | 'closed'
  closeReason?: ThreadCloseReason
  evaluation?: ThreadEvaluation
}

export interface InterviewRound {
  id: string
  kind: InterviewRoundKind
  timeboxMinutes: number
  questionTarget: number
  status: 'pending' | 'active' | 'completed'
  startedAt?: string
  completedAt?: string
  threads: QuestionThread[]
}

export type ReadinessBand = 'strong' | 'solid' | 'borderline' | 'below-bar'

export type EvaluationConfidence = 'low' | 'medium' | 'high'

export interface RoundEvaluation {
  roundId: string
  kind: InterviewRoundKind
  score: number | null
  threads: number
  answered: number
  usedSeconds: number
}

export interface DimensionAggregate {
  id: InterviewDimensionId
  score: number | null
  /** Threads that evidenced this dimension. */
  samples: number
}

export interface TopicAggregate {
  topic: string
  score: number
  threads: number
  weak: boolean
}

export interface Finding {
  text: string
  threadId?: string
  topic?: string
  dimension?: InterviewDimensionId
  quote?: string
}

export interface SessionEvaluation {
  scoringVersion: string
  completedAt: string
  overall: number | null
  band: ReadinessBand | null
  basis: AnalysisBasis | 'mixed'
  confidence: EvaluationConfidence
  rounds: RoundEvaluation[]
  dimensions: DimensionAggregate[]
  topics: TopicAggregate[]
  strengths: Finding[]
  gaps: Finding[]
}

// ───────────────────────────── Session ─────────────────────────────

export type InterviewStatus = 'in-progress' | 'completed' | 'abandoned'

/** What produced the evidence, recorded so a report can say how it was analysed. */
export interface InterviewEngineInfo {
  analyzerId: string
  voiceId?: string
  llmProviderId?: string
}

export interface InterviewSession {
  id: string
  schemaVersion: 1
  config: InterviewConfig
  engine: InterviewEngineInfo
  status: InterviewStatus
  startedAt: string
  completedAt?: string
  rounds: InterviewRound[]
  /** Present only once the session is completed. */
  evaluation?: SessionEvaluation
}

// ───────────────────────────── Ports ─────────────────────────────

export interface AnswerAnalysisRequest {
  spec: QuestionSpec
  /** What was asked on this turn (the question or the follow-up). */
  prompt: string
  answer: string
}

/** Turns an answer into evidence. Implementations: rule-based, or an `LlmProvider` wrapper. */
export interface AnswerAnalyzer {
  readonly id: string
  readonly basis: AnalysisBasis
  analyze(request: AnswerAnalysisRequest, signal?: AbortSignal): Promise<AnswerEvidence>
}

export interface VoiceRequest {
  kind: 'question' | 'follow-up'
  /** The deterministic wording to rephrase. Its meaning must be preserved. */
  authored: string
  probe?: ProbeKind
  spec: QuestionSpec
  /** The candidate's own words the follow-up is anchored to, if any. */
  anchor?: string
  transcript: { prompt: string; answer: string }[]
  /** Terms the candidate has not said that the wording must not introduce. */
  forbiddenTerms: string[]
}

/** Optional natural-language layer. Without one the authored wording is used as is. */
export interface InterviewerVoice {
  readonly id: string
  phrase(request: VoiceRequest, signal?: AbortSignal): Promise<string>
}

export interface InterviewRepository {
  list(): Promise<InterviewSession[]>
  load(id: string): Promise<InterviewSession | null>
  save(session: InterviewSession): Promise<void>
  remove(id: string): Promise<void>
}
