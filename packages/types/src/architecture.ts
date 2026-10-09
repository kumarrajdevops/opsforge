/**
 * Architecture Studio (ForgeArchitect) domain contract.
 *
 * Scoring authority: the deterministic `ArchitectureEvaluator` is the only thing that produces
 * scores. `ArchitectureReviewProvider` implementations (AI/LLM) return findings and evidence
 * signals only; their results carry no numeric score and can never change the evaluation.
 */

export type CloudProvider = 'aws' | 'azure' | 'generic'

export type ComponentCategory =
  | 'client'
  | 'dns'
  | 'cdn'
  | 'waf'
  | 'load-balancer'
  | 'compute'
  | 'kubernetes'
  | 'database'
  | 'cache'
  | 'queue'
  | 'kafka'
  | 'storage'
  | 'iam'
  | 'secrets'
  | 'monitoring'
  | 'cicd'

export type RegionRole = 'primary' | 'secondary' | 'global'
export type FailoverMode = 'none' | 'manual' | 'automatic'
export type DeployStrategy = 'manual' | 'recreate' | 'rolling' | 'blue-green' | 'canary'
export type ComponentTier = 'small' | 'medium' | 'large'
export type Exposure = 'public' | 'private'

/** Every configurable property of a component. A definition declares which ones apply to it. */
export interface ComponentConfig {
  /** Instances, pods, brokers or cache nodes. */
  replicas: number
  /** Availability zones the component spans (1-3). */
  zones: 1 | 2 | 3
  region: RegionRole
  autoscaling: boolean
  exposure: Exposure
  encryptedAtRest: boolean
  backups: boolean
  readReplicas: number
  crossRegionReplication: boolean
  failover: FailoverMode
  deadLetter: boolean
  alerting: boolean
  tracing: boolean
  strategy: DeployStrategy
  automatedTests: boolean
  leastPrivilege: boolean
  rotation: boolean
  tier: ComponentTier
}

export type ConfigKey = keyof ComponentConfig

export type ComponentTrait =
  'serverless' | 'managed-ha' | 'horizontal-scale' | 'relational' | 'managed-control-plane'

/** A palette entry: what a user can drop on the canvas. */
export interface ComponentDefinition {
  id: string
  provider: CloudProvider
  category: ComponentCategory
  name: string
  summary: string
  /** Config keys the inspector exposes for this component. */
  properties: ConfigKey[]
  defaults: ComponentConfig
  traits: ComponentTrait[]
  /** Requests per second one replica sustains at tier `medium`; absent for non-serving components. */
  rpsPerReplica?: number
  /** Indicative monthly price model (USD); see `CostEstimate` for the disclaimer. */
  pricing: { baseMonthlyUsd: number; unitMonthlyUsd: number; perRpsUsd: number }
}

export interface ArchitectureNode {
  id: string
  componentId: string
  label: string
  position: { x: number; y: number }
  config: ComponentConfig
}

/**
 * traffic: synchronous request path. data: synchronous data access. async: queue/stream hand-off.
 * telemetry: metrics/logs/traces to monitoring. deploy: CI/CD delivering to a workload.
 */
export type ConnectionKind = 'traffic' | 'data' | 'async' | 'telemetry' | 'deploy'

export interface ArchitectureEdge {
  id: string
  source: string
  target: string
  kind: ConnectionKind
  encrypted: boolean
  label?: string
}

export interface ArchitectureDocument {
  schemaVersion: 1
  nodes: ArchitectureNode[]
  edges: ArchitectureEdge[]
}

// ───────────────────────────── Scenarios ─────────────────────────────

export type RequirementPriority = 'must' | 'should'

/** Declarative requirement checks so scenarios are data, not code. */
export type RequirementCheck =
  | { kind: 'has-category'; category: ComponentCategory; min?: number }
  | { kind: 'min-zones'; zones: 2 | 3; categories: ComponentCategory[] }
  | { kind: 'multi-region' }
  | {
      kind: 'property'
      category: ComponentCategory
      key: ConfigKey
      value: ComponentConfig[ConfigKey]
      scope: 'all' | 'any'
    }
  | { kind: 'path'; from: ComponentCategory; to: ComponentCategory }

export interface ScenarioRequirement {
  id: string
  text: string
  priority: RequirementPriority
  check: RequirementCheck
}

export interface ScenarioWorkload {
  peakRps: number
  /** Share of requests that are reads, 0-1. */
  readRatio: number
  globalUsers: boolean
  /** Target availability in percent, e.g. 99.95. */
  availabilityTarget: number
  rpoMinutes: number
  rtoMinutes: number
  monthlyBudgetUsd: number
  compliance: string[]
}

export interface Scenario {
  id: string
  title: string
  summary: string
  difficulty: 'intermediate' | 'senior' | 'architect'
  workload: ScenarioWorkload
  requirements: ScenarioRequirement[]
}

// ───────────────────────────── Evaluation ─────────────────────────────

export type ScoreDimensionId =
  | 'requirements'
  | 'scalability'
  | 'availability'
  | 'reliability'
  | 'security'
  | 'networking'
  | 'data'
  | 'disaster-recovery'
  | 'observability'
  | 'cicd'
  | 'cost'
  | 'operational-complexity'

export type CheckSeverity = 'critical' | 'major' | 'minor'
export type CheckStatus = 'pass' | 'fail' | 'not-applicable'

export interface CheckResult {
  checkId: string
  dimension: ScoreDimensionId
  title: string
  status: CheckStatus
  severity: CheckSeverity
  /** Nodes (or edge endpoints) the result is about; used to highlight them on the canvas. */
  nodeIds: string[]
  /** What was observed, in plain language. */
  evidence: string
  /** What to change. Present on failures. */
  fix?: string
}

export interface DimensionEvaluation {
  id: ScoreDimensionId
  /** 0-100, or null when no check applied (no evidence; never shown as zero). */
  score: number | null
  passed: number
  failed: number
}

export interface CostEstimate {
  monthlyUsd: number
  byNode: Record<string, number>
  /** Always true: a planning heuristic, not a quote. */
  indicative: true
}

export interface ArchitectureEvaluation {
  evaluator: { id: string; version: string }
  dimensions: DimensionEvaluation[]
  /** Weighted overall, or null when nothing is scorable yet. */
  overall: number | null
  /** True when a failed critical check capped the overall score. */
  capped: boolean
  checks: CheckResult[]
  cost: CostEstimate
}

export interface EvaluationInput {
  scenario: Scenario
  document: ArchitectureDocument
}

/** Deterministic, synchronous and side-effect free. The only source of scores. */
export interface ArchitectureEvaluator {
  readonly id: string
  readonly version: string
  evaluate(input: EvaluationInput): ArchitectureEvaluation
}

// ───────────────────────────── AI review ─────────────────────────────

export interface ReviewRequest {
  scenario: Scenario
  document: ArchitectureDocument
  /** The deterministic result a reviewer must treat as ground truth. */
  evaluation: ArchitectureEvaluation
}

export interface ReviewFinding {
  id: string
  severity: CheckSeverity
  dimension: ScoreDimensionId
  title: string
  detail: string
  /** Must reference nodes that exist in the reviewed document. */
  nodeIds: string[]
  recommendation?: string
}

/** Qualitative evidence for a dimension. Deliberately not a number. */
export interface ReviewSignal {
  dimension: ScoreDimensionId
  strength: 'strength' | 'gap'
  note: string
}

export interface ReviewResult {
  providerId: string
  summary: string
  findings: ReviewFinding[]
  signals: ReviewSignal[]
}

export interface ArchitectureReviewProvider {
  readonly id: string
  readonly name: string
  review(request: ReviewRequest, signal?: AbortSignal): Promise<ReviewResult>
}

// ───────────────────────────── Failure simulation ─────────────────────────────

export type FailureScenario =
  | { kind: 'node-loss'; nodeId: string }
  | { kind: 'dependency-slow'; nodeId: string }
  | { kind: 'zone-loss' }
  | { kind: 'region-loss' }

export type NodeImpact = 'ok' | 'degraded' | 'down'
export type UserImpact = 'available' | 'degraded' | 'outage'

export interface RecoveryAssessment {
  /** Estimated minutes to restore service; null when there is no recovery path in the design. */
  estimatedRtoMinutes: number | null
  /** Estimated minutes of data loss; null when data would be lost. */
  estimatedRpoMinutes: number | null
  meetsRto: boolean | null
  meetsRpo: boolean | null
}

export interface SimulationResult {
  failure: FailureScenario
  nodeImpact: Record<string, NodeImpact>
  userImpact: UserImpact
  observations: string[]
  recovery: RecoveryAssessment | null
}

// ───────────────────────────── Versioning ─────────────────────────────

export interface ArchitectureVersionSummary {
  evaluatorVersion: string
  overall: number | null
  dimensions: Partial<Record<ScoreDimensionId, number | null>>
  criticalFailures: number
}

export interface ArchitectureVersion {
  id: string
  scenarioId: string
  number: number
  createdAt: string
  note: string
  /** Hash of the canonical document; identical content never creates a new version. */
  contentHash: string
  document: ArchitectureDocument
  summary: ArchitectureVersionSummary
}

export interface NodeChange {
  nodeId: string
  label: string
  fields: string[]
}

export interface VersionDiff {
  nodesAdded: string[]
  nodesRemoved: string[]
  nodesChanged: NodeChange[]
  nodesMoved: number
  edgesAdded: number
  edgesRemoved: number
  edgesChanged: number
  overallDelta: number | null
  dimensionDeltas: Partial<Record<ScoreDimensionId, number>>
}

export interface SaveVersionInput {
  document: ArchitectureDocument
  note: string
  summary: ArchitectureVersionSummary
}

export interface SaveVersionResult {
  version: ArchitectureVersion
  /** False when the content matched the latest version, so nothing new was stored. */
  created: boolean
}

/** Persistence port. The browser implementation is localStorage; an API implementation replaces it. */
export interface ArchitectureRepository {
  loadDraft(scenarioId: string): Promise<ArchitectureDocument | null>
  saveDraft(scenarioId: string, document: ArchitectureDocument): Promise<void>
  listVersions(scenarioId: string): Promise<ArchitectureVersion[]>
  saveVersion(scenarioId: string, input: SaveVersionInput): Promise<SaveVersionResult>
}
