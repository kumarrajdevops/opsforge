/*
 * ForgeOps (Production Incident Simulator) domain contract.
 *
 * A scenario is a graph of evidence the candidate must discover by investigating: telemetry views,
 * terminal commands and remediation attempts reveal nodes. Nothing in a scenario is shown just
 * because it exists. Scores come only from the deterministic evaluator; providers (LLM, human
 * reviewer) return observations, never numbers.
 */

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4'
export type ScenarioKind = 'outage' | 'security'
export type ScenarioDifficulty = 'intermediate' | 'senior' | 'staff'

export type ServiceKind =
  | 'web'
  | 'api'
  | 'database'
  | 'cache'
  | 'queue'
  | 'worker'
  | 'platform'
  | 'external'
  | 'identity'
  | 'storage'
  | 'source-control'

export type ServiceHealth = 'healthy' | 'degraded' | 'down'
export type MetricState = 'ok' | 'warn' | 'crit'

export type TelemetryChannel = 'metrics' | 'logs' | 'traces'
export type EvidenceChannel = TelemetryChannel | 'command' | 'alert' | 'change' | 'report'

/**
 * What a piece of evidence means for the investigation. Hidden from the candidate until the debrief.
 * - root-cause: direct evidence of the originating fault
 * - mechanism: how the fault produces the symptoms
 * - contributing: amplifies or sustains the failure
 * - symptom: downstream effect, not a cause
 * - ruled-out: eliminates a plausible alternative
 * - noise: true but unrelated
 */
export type EvidenceRole =
  'root-cause' | 'mechanism' | 'contributing' | 'symptom' | 'ruled-out' | 'noise'

export type InvestigationPhase = 'triage' | 'isolation' | 'diagnosis' | 'verification'

export type HypothesisCategory =
  | 'change'
  | 'capacity'
  | 'dependency'
  | 'data-store'
  | 'cache'
  | 'messaging'
  | 'network'
  | 'configuration'
  | 'infrastructure'
  | 'security'

export type HypothesisVerdict =
  'root-cause' | 'mechanism' | 'contributing' | 'symptom' | 'ruled-out'

export interface HeadlineMetric {
  id: string
  label: string
  /** Display value including unit, e.g. "8.2 s". */
  value: string
  state: MetricState
  /** Shown once the incident is resolved. */
  recovered?: { value: string; state: MetricState }
}

export interface IncidentService {
  id: string
  name: string
  kind: ServiceKind
  dependsOn: string[]
  health: ServiceHealth
  recoveredHealth?: ServiceHealth
  /** One-line status shown in the services list. */
  note: string
  recoveredNote?: string
  headline: HeadlineMetric[]
}

/** A known (or still unknown) fact about customer / business impact. */
export interface ImpactFact {
  id: string
  label: string
  value: string
  state?: MetricState
  /** Locked ("Unknown — investigate") until this evidence is revealed. */
  gatedBy?: string
  recovered?: { value: string; state: MetricState }
}

export type RevealTrigger =
  | { kind: 'start' }
  /** Any of these commands, run from the terminal, catalog or remediation panel. */
  | { kind: 'command'; commandIds: string[] }
  /** metrics: series id · traces: trace id · logs: service id. */
  | { kind: 'view'; channel: TelemetryChannel; target: string }
  /** A log search on this service whose query contains any term. */
  | { kind: 'search'; serviceId: string; terms: string[] }
  /** After this remediation action was applied. */
  | { kind: 'action'; actionId: string }

export interface EvidenceNode {
  id: string
  title: string
  detail: string
  channel: EvidenceChannel
  serviceId?: string
  role: EvidenceRole
  phase: InvestigationPhase
  /** Incident time (minutes after T+00) of the underlying event, when it belongs on the timeline. */
  at?: number
  trigger: RevealTrigger
  /** Evidence that must already be revealed for this node to be revealed. */
  requires: string[]
  /** Hypotheses (by spec id) this evidence supports or refutes. */
  bearsOn?: { supports?: string[]; refutes?: string[] }
  /** Debrief only: how a candidate would find this. */
  hint: string
}

export type CommandCategory =
  | 'kubernetes'
  | 'database'
  | 'messaging'
  | 'cache'
  | 'network'
  | 'deploy'
  | 'cloud'
  | 'source-control'
  | 'system'

export interface CommandSpec {
  id: string
  /** Canonical form. Matching ignores case of the binary, extra whitespace and a trailing ";". */
  command: string
  aliases?: string[]
  category: CommandCategory
  description: string
  /** Changes the system; tied to a remediation action. */
  mutating?: boolean
  remediationId?: string
  /** Offered as a starter chip in the terminal. */
  starter?: boolean
  /** Hidden from the catalog and refused by the terminal until all of this evidence is revealed. */
  unlockedBy?: string[]
  output: string
  /** Replaces `output` once the incident is resolved. */
  outputResolved?: string
}

export interface MetricSeries {
  id: string
  serviceId: string
  label: string
  unit: string
  /** One sample per minute starting at T+00. */
  points: number[]
  /** Samples appended after resolution (continuing the minute sequence). */
  recoveredTail?: number[]
  warnAt?: number
  critAt?: number
  description?: string
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  id: string
  serviceId: string
  /** Seconds after T+00. */
  atSeconds: number
  level: LogLevel
  message: string
  /** Hidden until this evidence is revealed (found by searching). */
  gatedBy?: string
}

export interface TraceSpan {
  id: string
  parentId?: string
  serviceId: string
  operation: string
  startMs: number
  durationMs: number
  status: 'ok' | 'error'
  tags?: Record<string, string>
}

export interface TraceRecord {
  id: string
  serviceId: string
  operation: string
  atSeconds: number
  durationMs: number
  status: 'ok' | 'error'
  spans: TraceSpan[]
}

export interface HypothesisSpec {
  id: string
  label: string
  category: HypothesisCategory
  serviceId: string
  verdict: HypothesisVerdict
  /** Debrief only. */
  explanation: string
}

export type RemediationOutcome = 'resolves' | 'relieves' | 'no-effect' | 'worsens'

export interface MetricOverride {
  serviceId: string
  metricId: string
  value: string
  state: MetricState
}

export interface RemediationAction {
  id: string
  label: string
  description: string
  risk: 'low' | 'medium' | 'high'
  outcome: RemediationOutcome
  /** What the candidate sees when it is applied. */
  result: string
  effects?: MetricOverride[]
  /** Hidden from the panel until all of this evidence is revealed. */
  unlockedBy?: string[]
  /** Evidence that would justify this action. Applying it without any of this is a guess. */
  evidenceBasis: string[]
  /** Debrief only. */
  rationale: string
}

export interface RootCauseSpec {
  /** Debrief only. */
  statement: string
  /** Evidence a sound RCA should cite. Each group is satisfied by citing any one of its members. */
  requiredEvidence: string[][]
  /** Concepts a sound RCA should mention; each is satisfied by any of its terms. */
  concepts: { label: string; anyOf: string[] }[]
}

export type PreventionKind = 'detect' | 'prevent' | 'respond' | 'process'
export type PreventionQuality = 'strong' | 'acceptable' | 'weak' | 'counterproductive'

export interface PreventionOption {
  id: string
  label: string
  detail: string
  kind: PreventionKind
  /** Debrief only. */
  quality: PreventionQuality
  rationale: string
}

export type CommunicationAudience = 'engineering' | 'leadership' | 'customers'
export type CommunicationKind = 'acknowledge' | 'status' | 'mitigated' | 'resolved'

export interface CommunicationSpec {
  requiredAudiences: CommunicationAudience[]
  firstUpdateWithinSeconds: number
  cadenceSeconds: number
  /** Terms that do not belong in customer-facing text. */
  internalTerms: string[]
}

export type PromptTrigger = 'start' | 'hypothesis' | 'mitigated' | 'rca'

export interface InterviewerPrompt {
  id: string
  when: PromptTrigger
  text: string
}

export interface IncidentScenario {
  id: string
  title: string
  kind: ScenarioKind
  difficulty: ScenarioDifficulty
  /** Briefing paragraph. Must not reveal the cause. */
  summary: string
  role: string
  objective: string
  /** Soft time-box in minutes. */
  timeboxMinutes: number
  /** Incident time (minutes after T+00) when the candidate is paged. */
  pagedAtMinute: number
  initialSeverity: IncidentSeverity
  expectedSeverity: IncidentSeverity
  /** The page text the candidate receives. */
  page: string
  services: IncidentService[]
  impact: ImpactFact[]
  evidence: EvidenceNode[]
  commands: CommandSpec[]
  metrics: MetricSeries[]
  logs: LogEntry[]
  traces: TraceRecord[]
  hypotheses: HypothesisSpec[]
  remediation: RemediationAction[]
  rootCause: RootCauseSpec
  prevention: PreventionOption[]
  communication: CommunicationSpec
  prompts: InterviewerPrompt[]
}

/* ---------------------------------------------------------------- session ---- */

export type HypothesisStatus = 'testing' | 'confirmed' | 'ruled-out'
export type EvidenceRelation = 'supports' | 'refutes'

export interface RcaDraft {
  category: HypothesisCategory | ''
  serviceId: string
  statement: string
  trigger: string
  contributing: string
  evidenceIds: string[]
}

export interface IncidentMessage {
  id: string
  audience: CommunicationAudience
  kind: CommunicationKind
  impact: string
  status: string
  /** Minutes until the next update was promised; null when none. */
  nextUpdateMinutes: number | null
}

/** Raw, replayable record of everything the candidate did (OPS-11). `at` is session seconds. */
export type SessionEvent = { at: number } & (
  | { type: 'start' }
  | { type: 'command'; input: string; commandId: string | null }
  | { type: 'view'; channel: TelemetryChannel; target: string }
  | { type: 'log-search'; serviceId: string; query: string }
  | { type: 'severity'; severity: IncidentSeverity }
  | {
      type: 'hypothesis-add'
      id: string
      category: HypothesisCategory
      serviceId: string
      statement: string
    }
  | { type: 'hypothesis-link'; id: string; evidenceId: string; relation: EvidenceRelation }
  | { type: 'hypothesis-unlink'; id: string; evidenceId: string }
  | { type: 'hypothesis-status'; id: string; status: HypothesisStatus }
  | { type: 'hypothesis-remove'; id: string }
  | { type: 'remediation'; actionId: string; via: 'panel' | 'terminal' }
  | { type: 'rca'; rca: RcaDraft }
  | { type: 'prevention'; optionIds: string[]; notes: string }
  | { type: 'message'; message: IncidentMessage }
  | { type: 'note'; promptId: string; text: string }
  | { type: 'submit' }
)

export interface IncidentSession {
  scenarioId: string
  /** ISO timestamp of the run, for display and history only. */
  startedAt: string
  /** Seconds of session time at the last save; the timer resumes from here. */
  elapsedSeconds: number
  events: SessionEvent[]
}

/* ------------------------------------------------------------- evaluation ---- */

export type IncidentDimensionId =
  | 'investigation-order'
  | 'evidence-gathering'
  | 'hypothesis'
  | 'root-cause'
  | 'mitigation'
  | 'prevention'
  | 'communication'

export type TroubleshootingSkillId =
  | 'problem-clarification'
  | 'scope-identification'
  | 'timeline-analysis'
  | 'hypothesis-formation'
  | 'evidence-gathering'
  | 'isolation'
  | 'root-cause-reasoning'
  | 'prioritization'
  | 'mitigation'
  | 'prevention'
  | 'communication'

export interface IncidentCheck {
  id: string
  dimension: IncidentDimensionId
  label: string
  /** 0..1 */
  credit: number
  weight: number
  /** Why, in terms the candidate can act on. Never reveals unfound evidence. */
  detail: string
  skills: TroubleshootingSkillId[]
}

export interface IncidentDimensionResult {
  id: IncidentDimensionId
  label: string
  /** 0..100, or null when the candidate never attempted this part. */
  score: number | null
  checks: IncidentCheck[]
}

export interface TroubleshootingSkillResult {
  id: TroubleshootingSkillId
  label: string
  score: number | null
}

export interface IncidentEvaluation {
  /** 0..100 over the attempted dimensions, or null when nothing was attempted. */
  overall: number | null
  /** Every dimension was attempted. */
  complete: boolean
  dimensions: IncidentDimensionResult[]
  skills: TroubleshootingSkillResult[]
  stats: {
    evidenceFound: number
    evidenceTotal: number
    keyEvidenceFound: number
    keyEvidenceTotal: number
    discoveryActions: number
    elapsedSeconds: number
    resolved: boolean
    resolvedAtSeconds: number | null
  }
}

/* ---------------------------------------------------------------- providers ---- */

export interface IncidentReviewRequest {
  scenario: IncidentScenario
  session: IncidentSession
  evaluation: IncidentEvaluation
}

export interface IncidentObservation {
  dimension: IncidentDimensionId
  kind: 'strength' | 'gap'
  note: string
}

/** Qualitative evidence only. A numeric score field is rejected by the validator. */
export interface IncidentReviewResult {
  providerId: string
  summary: string
  observations: IncidentObservation[]
  followUps: string[]
}

export interface IncidentReviewProvider {
  id: string
  label: string
  review(request: IncidentReviewRequest, signal?: AbortSignal): Promise<unknown>
}

/* -------------------------------------------------------------- persistence ---- */

/** Port for session storage. The browser implementation is localStorage; an HTTP one follows with the API. */
export interface IncidentRepository {
  load(scenarioId: string): Promise<IncidentSession | null>
  save(session: IncidentSession): Promise<void>
  clear(scenarioId: string): Promise<void>
}
