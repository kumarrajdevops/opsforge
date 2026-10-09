import type {
  EvidenceBasis,
  EvidenceOrigin,
  ModuleKey,
  ReadinessFactorId,
  ReadinessScoreBand,
} from '@opsforge/types'

/**
 * Every number the readiness engine uses lives here and is versioned (DAT-07, NFR-MNT-03).
 * Changing a value means bumping `CONFIG_VERSION`; snapshots record the version they used and are
 * never rewritten.
 */
export const ENGINE_VERSION = '1.0.0'
export const CONFIG_VERSION = '2026.1'

export interface FactorConfig {
  label: string
  /** Relative weight in the overall score. Knowledge and confidence are separate factors. */
  weight: number
  /** Senior-track benchmark. */
  target: number
  /** Modules that can raise this factor, best first. The first one that exists is recommended. */
  modules: ModuleKey[]
  /** What a session of work looks like, for the recommendation text. */
  practice: string
  minutes: number
}

export const FACTORS: Record<ReadinessFactorId, FactorConfig> = {
  knowledge: {
    label: 'Knowledge',
    weight: 16,
    target: 75,
    modules: ['knowledge', 'interviewer', 'resume'],
    practice: 'Answer technical questions on this topic and explain the reasoning',
    minutes: 25,
  },
  questions: {
    label: 'Questions',
    weight: 8,
    target: 70,
    modules: ['questions', 'resume', 'interviewer'],
    practice: 'Defend resume claims or work through scored practice questions',
    minutes: 20,
  },
  flashcards: {
    label: 'Flashcards',
    weight: 4,
    target: 70,
    modules: ['flashcards'],
    practice: 'Review spaced-repetition cards on commands and concepts',
    minutes: 10,
  },
  labs: {
    label: 'Hands-on labs',
    weight: 8,
    target: 70,
    modules: ['labs'],
    practice: 'Complete a hands-on lab and pass its validation',
    minutes: 40,
  },
  troubleshooting: {
    label: 'Troubleshooting',
    weight: 12,
    target: 75,
    modules: ['incidents', 'interviewer', 'resume'],
    practice: 'Work an incident from symptoms to root cause',
    minutes: 30,
  },
  incidents: {
    label: 'Incident response',
    weight: 11,
    target: 75,
    modules: ['incidents'],
    practice: 'Run a production incident through mitigation, RCA and prevention',
    minutes: 35,
  },
  architecture: {
    label: 'Architecture',
    weight: 12,
    target: 72,
    modules: ['architecture', 'interviewer'],
    practice: 'Design against a scenario and fix the failed checks',
    minutes: 40,
  },
  security: {
    label: 'Security',
    weight: 8,
    target: 70,
    modules: ['incidents', 'architecture', 'resume'],
    practice: 'Handle a security incident or harden a design',
    minutes: 30,
  },
  communication: {
    label: 'Communication',
    weight: 7,
    target: 70,
    modules: ['interviewer', 'incidents'],
    practice: 'Answer aloud with structure, a concrete example and a trade-off',
    minutes: 20,
  },
  interviews: {
    label: 'Interviews',
    weight: 10,
    target: 72,
    modules: ['interviewer'],
    practice: 'Sit a timed mock interview round',
    minutes: 45,
  },
  confidence: {
    label: 'Confidence',
    weight: 4,
    target: 65,
    modules: ['interviewer', 'resume'],
    practice: 'Practise answers under time pressure and handle follow-ups without hedging',
    minutes: 30,
  },
}

export const FACTOR_ORDER = Object.keys(FACTORS) as ReadinessFactorId[]
export const TOTAL_FACTOR_WEIGHT = FACTOR_ORDER.reduce((sum, id) => sum + FACTORS[id].weight, 0)

/** Where each module's evidence comes from. `live` flips when the module is built. */
export const ORIGINS: Record<EvidenceOrigin, { label: string; module: ModuleKey; live: boolean }> =
  {
    interview: { label: 'Mock interviews', module: 'interviewer', live: true },
    'resume-drill': { label: 'Resume drills', module: 'resume', live: true },
    incident: { label: 'Incident simulator', module: 'incidents', live: true },
    architecture: { label: 'Architecture Studio', module: 'architecture', live: true },
    knowledge: { label: 'Knowledge hubs', module: 'knowledge', live: false },
    question: { label: 'Question engine', module: 'questions', live: false },
    flashcard: { label: 'Flashcards', module: 'flashcards', live: false },
    lab: { label: 'Hands-on labs', module: 'labs', live: false },
  }

/** Modules that exist today: every live evidence source plus the JD analyzer and this page. */
export const LIVE_MODULES: ModuleKey[] = [
  ...Object.values(ORIGINS)
    .filter((o) => o.live)
    .map((o) => o.module),
  'jd',
  'readiness',
]

/** Reliability of an observation by how it was produced. Scales its weight; never its score. */
export const BASIS_RELIABILITY: Record<EvidenceBasis, number> = {
  deterministic: 1,
  'rule-based': 0.9,
  mixed: 0.85,
  'llm-assisted': 0.8,
}

/** Older evidence counts for less. After this many days an item carries half its weight. */
export const HALF_LIFE_DAYS = 30

export const BANDS: { min: number; band: ReadinessScoreBand }[] = [
  { min: 82, band: 'strong' },
  { min: 70, band: 'solid' },
  { min: 55, band: 'developing' },
  { min: 40, band: 'weak' },
  { min: 0, band: 'critical' },
]

/** Below this an item is treated as a weakness. */
export const WEAK_SCORE = 60
export const CRITICAL_WEAK_SCORE = 40

/** Evidence confidence: how far to trust a score given how much stands behind it. */
export const CONFIDENCE_RULES = {
  /** Fewer items than this is always low. */
  lowBelowItems: 3,
  /** Total decayed weight below this is low. */
  lowBelowWeight: 2,
  highItems: 8,
  highWeight: 5,
  highDays: 3,
  highOrigins: 2,
}

export const TREND_RULES = {
  /** Items needed on each side of the split before a direction is claimed. */
  minPerSide: 2,
  /** Points of change that count as movement. */
  steadyWithin: 4,
  /** Trend points drawn at most. */
  maxPoints: 12,
}

/** Knowledge/confidence calibration (RDY-02, RDY-03). */
export const CALIBRATION_RULES = {
  /** Points of difference that signal a mismatch. */
  gap: 15,
  /** Items needed on both factors before a mismatch is claimed. */
  minItems: 3,
}

export const PROJECTION_SCORE = 80

export interface GateRule {
  level: 2 | 3 | 4 | 5 | 6
  label: string
  minOverall: number
  minAttempts: number
  /** Distinct calendar days with evidence. One strong session can never move the level. */
  minDays: number
  /** Distinct modules that produced evidence. */
  minOrigins: number
  /** Factors with any evidence. */
  minFactors: number
  /** Lowest evidence confidence the overall score may have. */
  minConfidence: 'low' | 'medium' | 'high'
  /** Share of total factor weight that has evidence. */
  minCoverage: number
  /** No evidenced factor may sit below this. */
  floor: number
  /** Specific factor requirements. */
  factors: { id: ReadinessFactorId; min: number; minItems: number }[]
}

export const LEVELS: { value: 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { value: 1, label: 'Learner' },
  { value: 2, label: 'Practitioner' },
  { value: 3, label: 'Interview Ready' },
  { value: 4, label: 'Senior Interview Ready' },
  { value: 5, label: 'Strong Senior' },
  { value: 6, label: 'Architect' },
]

export const GATES: GateRule[] = [
  {
    level: 2,
    label: 'Practitioner',
    minOverall: 45,
    minAttempts: 6,
    minDays: 1,
    minOrigins: 1,
    minFactors: 2,
    minConfidence: 'low',
    minCoverage: 0.1,
    floor: 0,
    factors: [],
  },
  {
    level: 3,
    label: 'Interview Ready',
    minOverall: 60,
    minAttempts: 12,
    minDays: 2,
    minOrigins: 2,
    minFactors: 4,
    minConfidence: 'medium',
    minCoverage: 0.3,
    floor: 40,
    factors: [{ id: 'knowledge', min: 60, minItems: 3 }],
  },
  {
    level: 4,
    label: 'Senior Interview Ready',
    minOverall: 72,
    minAttempts: 24,
    minDays: 4,
    minOrigins: 3,
    minFactors: 6,
    minConfidence: 'medium',
    minCoverage: 0.55,
    floor: 50,
    factors: [
      { id: 'knowledge', min: 70, minItems: 5 },
      { id: 'confidence', min: 60, minItems: 3 },
      { id: 'troubleshooting', min: 65, minItems: 2 },
      { id: 'architecture', min: 60, minItems: 2 },
    ],
  },
  {
    level: 5,
    label: 'Strong Senior',
    minOverall: 82,
    minAttempts: 40,
    minDays: 7,
    minOrigins: 4,
    minFactors: 8,
    minConfidence: 'high',
    minCoverage: 0.75,
    floor: 65,
    factors: [
      { id: 'knowledge', min: 80, minItems: 8 },
      { id: 'confidence', min: 70, minItems: 5 },
      { id: 'troubleshooting', min: 75, minItems: 4 },
      { id: 'incidents', min: 75, minItems: 3 },
      { id: 'architecture', min: 75, minItems: 3 },
      { id: 'security', min: 70, minItems: 2 },
    ],
  },
  {
    level: 6,
    label: 'Architect',
    minOverall: 90,
    minAttempts: 60,
    minDays: 10,
    minOrigins: 5,
    minFactors: 9,
    minConfidence: 'high',
    minCoverage: 0.9,
    floor: 75,
    factors: [
      { id: 'architecture', min: 88, minItems: 5 },
      { id: 'security', min: 80, minItems: 4 },
      { id: 'incidents', min: 80, minItems: 4 },
      { id: 'knowledge', min: 85, minItems: 10 },
      { id: 'confidence', min: 75, minItems: 6 },
    ],
  },
]

export const CONFIDENCE_RANK = { none: 0, low: 1, medium: 2, high: 3 } as const
