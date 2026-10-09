import type {
  AnswerSignalId,
  ConceptOutcome,
  DimensionAggregate,
  DimensionResult,
  EvaluationConfidence,
  Finding,
  InterviewDimensionId,
  InterviewRoundKind,
  InterviewSession,
  QuestionThread,
  ReadinessBand,
  RedFlagOutcome,
  RoundEvaluation,
  SessionEvaluation,
  ThreadEvaluation,
  TopicAggregate,
} from '@opsforge/types'
import { collapse, countWords } from './analysis/text'
import {
  accumulateTurns,
  answeredTurns,
  answerText,
  followUpTurns,
  threadBasis,
  type Accumulated,
} from './evidence'

/**
 * Deterministic scoring. Same transcript and evidence in, same scores out. No model is consulted
 * here: models only supply evidence upstream (PRD AI-01, AI-04). Bump the version on any change.
 */
export const SCORING_VERSION = 'interview.scoring.v1'

export const WEAK_TOPIC_THRESHOLD = 60

export const DIMENSION_LABELS: Record<InterviewDimensionId, string> = {
  'technical-accuracy': 'Technical accuracy',
  depth: 'Depth',
  'follow-up-handling': 'Follow-up handling',
  'architecture-thinking': 'Architecture thinking',
  'incident-response': 'Incident response',
  communication: 'Communication',
  confidence: 'Confidence',
  structure: 'Structure',
  conciseness: 'Conciseness',
  'trade-off-reasoning': 'Trade-off reasoning',
}

export const DIMENSION_ORDER = Object.keys(DIMENSION_LABELS) as InterviewDimensionId[]

const ARCH_SIGNALS: AnswerSignalId[] = [
  'requirements',
  'failure-modes',
  'scalability',
  'security',
  'cost',
  'observability',
]
const INCIDENT_SIGNALS: AnswerSignalId[] = [
  'scope-first',
  'hypothesis',
  'mitigation',
  'verification',
  'communication-plan',
  'prevention',
]
const STAR_SIGNALS: AnswerSignalId[] = ['situation', 'task', 'action', 'result']

/** Share of the concept weight a strong answer is expected to cover. Full marks need not be 100%. */
const TARGET_COVERAGE = 0.7

const ROUND_WEIGHTS: Record<InterviewRoundKind, Record<InterviewDimensionId, number>> = {
  screening: {
    'technical-accuracy': 4,
    depth: 2,
    'follow-up-handling': 1,
    'architecture-thinking': 0.5,
    'incident-response': 0.5,
    communication: 1.5,
    confidence: 1,
    structure: 1,
    conciseness: 1,
    'trade-off-reasoning': 0.5,
  },
  technical: {
    'technical-accuracy': 4,
    depth: 3,
    'follow-up-handling': 1.5,
    'architecture-thinking': 0.5,
    'incident-response': 0.5,
    communication: 1,
    confidence: 0.5,
    structure: 0.5,
    conciseness: 0.5,
    'trade-off-reasoning': 1.5,
  },
  troubleshooting: {
    'technical-accuracy': 2.5,
    depth: 1.5,
    'follow-up-handling': 1.5,
    'architecture-thinking': 0,
    'incident-response': 4,
    communication: 1,
    confidence: 0.5,
    structure: 1,
    conciseness: 0.5,
    'trade-off-reasoning': 0.5,
  },
  architecture: {
    'technical-accuracy': 2.5,
    depth: 2,
    'follow-up-handling': 1.5,
    'architecture-thinking': 4,
    'incident-response': 0.5,
    communication: 1,
    confidence: 0.5,
    structure: 1,
    conciseness: 0.5,
    'trade-off-reasoning': 2.5,
  },
  behavioral: {
    'technical-accuracy': 2,
    depth: 1.5,
    'follow-up-handling': 1.5,
    'architecture-thinking': 0,
    'incident-response': 1,
    communication: 2,
    confidence: 1.5,
    structure: 2.5,
    conciseness: 1,
    'trade-off-reasoning': 0.5,
  },
  final: {
    'technical-accuracy': 2.5,
    depth: 2,
    'follow-up-handling': 1.5,
    'architecture-thinking': 0.5,
    'incident-response': 0,
    communication: 2,
    confidence: 1.5,
    structure: 1,
    conciseness: 1,
    'trade-off-reasoning': 2,
  },
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n))
const round = (n: number) => Math.round(n)

export function bandFor(score: number): ReadinessBand {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'solid'
  if (score >= 50) return 'borderline'
  return 'below-bar'
}

export const BAND_LABELS: Record<ReadinessBand, string> = {
  strong: 'Strong',
  solid: 'Solid',
  borderline: 'Borderline',
  'below-bar': 'Below the bar',
}

function conceptCredit(
  thread: QuestionThread,
  acc: Accumulated,
  kind?: 'core' | 'tradeoff',
): number {
  const concepts = thread.spec.concepts.filter((c) => (kind ? c.kind === kind : true))
  const total = concepts.reduce((sum, c) => sum + c.weight, 0)
  if (total === 0) return 0
  const earned = concepts.reduce((sum, c) => {
    const hit = acc.concepts.get(c.id)
    return sum + (hit ? c.weight * (hit.strength === 'explained' ? 1 : 0.5) : 0)
  }, 0)
  return earned / total
}

function mainMetrics(thread: QuestionThread) {
  const first = thread.turns[0]?.evidence?.metrics
  if (first) return first
  return {
    wordCount: countWords(answerText(thread)),
    sentenceCount: 0,
    avgSentenceWords: 0,
    hedgeCount: 0,
    fillerCount: 0,
  }
}

function followUpProductivity(thread: QuestionThread): { asked: number; productive: number } {
  const followUps = followUpTurns(thread)
  let productive = 0
  const seen = accumulateTurns([])
  for (const turn of thread.turns) {
    if (turn.kind === 'follow-up' && turn.answer && !turn.answer.skipped) {
      const ev = turn.evidence
      const gainedConcept =
        ev?.concepts.some((hit) => {
          const before = seen.concepts.get(hit.conceptId)
          return !before || (before.strength === 'named' && hit.strength === 'explained')
        }) ?? false
      const gainedSignal = ev?.signals.some((s) => !seen.signals.has(s.signal)) ?? false
      const challengeResolved =
        turn.probe === 'challenge' &&
        (turn.answer.text.trim().split(/\s+/).length ?? 0) >= 15 &&
        !ev?.redFlags.some((r) => r.redFlagId === turn.target)
      if (gainedConcept || gainedSignal || challengeResolved) productive++
    }
    // fold this turn in so later follow-ups are judged against everything said before them
    const single = accumulateTurns([turn])
    for (const [k, v] of single.concepts) {
      const e = seen.concepts.get(k)
      if (!e || (e.strength === 'named' && v.strength === 'explained')) seen.concepts.set(k, v)
    }
    for (const [k, v] of single.signals) if (!seen.signals.has(k)) seen.signals.set(k, v)
  }
  return { asked: followUps.length, productive }
}

function positionOf(text: string, quote: string | undefined): number {
  if (!quote) return -1
  return collapse(text).toLowerCase().indexOf(collapse(quote).toLowerCase().slice(0, 30))
}

function dim(id: InterviewDimensionId, score: number | null, note: string): DimensionResult {
  return { id, score: score === null ? null : round(clamp(score)), note }
}

export function evaluateThread(
  thread: QuestionThread,
  roundKind: InterviewRoundKind,
): ThreadEvaluation {
  const { spec } = thread
  const answered = answeredTurns(thread)
  const acc = accumulateTurns(thread.turns)
  const text = answerText(thread)
  const metrics = mainMetrics(thread)
  const expected = new Set(spec.expectedSignals ?? [])
  const followUps = followUpProductivity(thread)

  const concepts: ConceptOutcome[] = spec.concepts.map((c) => {
    const hit = acc.concepts.get(c.id)
    return {
      conceptId: c.id,
      label: c.label,
      summary: c.summary,
      required: c.required,
      status: hit ? hit.strength : 'missed',
      ...(hit ? { quote: hit.quote } : {}),
    }
  })
  const redFlags: RedFlagOutcome[] = (spec.redFlags ?? []).flatMap((flag) => {
    const hit = acc.redFlags.get(flag.id)
    return hit ? [{ redFlagId: flag.id, label: flag.label, note: flag.note, quote: hit.quote }] : []
  })
  const signals = [...acc.signals.keys()]

  if (answered.length === 0) {
    const zero = (id: InterviewDimensionId) =>
      dim(id, null, 'Question skipped; nothing to evaluate.')
    return {
      scoringVersion: SCORING_VERSION,
      basis: threadBasis(thread),
      score: 0,
      dimensions: DIMENSION_ORDER.map((id) =>
        id === 'technical-accuracy' || id === 'depth' ? dim(id, 0, 'Question skipped.') : zero(id),
      ),
      concepts,
      redFlags,
      signals,
      followUps,
    }
  }

  const dimensions: DimensionResult[] = []

  // Technical accuracy: weighted concept credit, penalised for stated misconceptions.
  const credit = conceptCredit(thread, acc)
  const accuracy = clamp((credit / TARGET_COVERAGE) * 100 - redFlags.length * 15)
  dimensions.push(
    dim(
      'technical-accuracy',
      accuracy,
      `${concepts.filter((c) => c.status !== 'missed').length} of ${concepts.length} expected ideas covered` +
        (redFlags.length
          ? `; ${redFlags.length} misconception${redFlags.length > 1 ? 's' : ''} stated`
          : ''),
    ),
  )

  // Depth: share of covered ideas that were explained rather than named.
  const covered = spec.concepts.filter((c) => acc.concepts.has(c.id))
  const coveredWeight = covered.reduce((s, c) => s + c.weight, 0)
  const explainedWeight = covered.reduce(
    (s, c) => s + c.weight * (acc.concepts.get(c.id)!.strength === 'explained' ? 1 : 0.35),
    0,
  )
  const depth =
    coveredWeight === 0
      ? 0
      : (explainedWeight / coveredWeight) * Math.min(1, covered.length / 3) * 100
  dimensions.push(
    dim(
      'depth',
      depth,
      `${covered.filter((c) => acc.concepts.get(c.id)!.strength === 'explained').length} ideas explained, not just named`,
    ),
  )

  // Follow-up handling: only evidenced if the interviewer actually probed.
  dimensions.push(
    followUps.asked === 0
      ? dim('follow-up-handling', null, 'No follow-ups were needed.')
      : dim(
          'follow-up-handling',
          (followUps.productive / followUps.asked) * 100,
          `${followUps.productive} of ${followUps.asked} follow-ups added substance`,
        ),
  )

  // Architecture thinking.
  const archExpected = ARCH_SIGNALS.filter((s) => expected.has(s))
  if (roundKind === 'architecture' || archExpected.length >= 2) {
    const set = archExpected.length > 0 ? archExpected : ARCH_SIGNALS
    const present = set.filter((s) => acc.signals.has(s)).length
    dimensions.push(
      dim(
        'architecture-thinking',
        (present / set.length) * 100,
        `${present} of ${set.length} design considerations raised`,
      ),
    )
  } else dimensions.push(dim('architecture-thinking', null, 'Not assessed for this question.'))

  // Incident response, including whether scope came before action.
  const incidentExpected = INCIDENT_SIGNALS.filter((s) => expected.has(s))
  if (roundKind === 'troubleshooting' || incidentExpected.length >= 2) {
    const set = incidentExpected.length > 0 ? incidentExpected : INCIDENT_SIGNALS.slice(0, 4)
    const present = set.filter((s) => acc.signals.has(s)).length
    let score = (present / set.length) * 100
    let note = `${present} of ${set.length} incident-response steps shown`
    const scopeAt = positionOf(text, acc.signals.get('scope-first'))
    const actAt = positionOf(text, acc.signals.get('mitigation'))
    if (scopeAt >= 0 && actAt >= 0 && actAt < scopeAt) {
      score -= 10
      note += '; acted before establishing scope'
    }
    dimensions.push(dim('incident-response', score, note))
  } else dimensions.push(dim('incident-response', null, 'Not assessed for this question.'))

  // Communication: sentence length, filler density, concrete examples.
  const words = Math.max(1, metrics.wordCount)
  const fillerRate = (metrics.fillerCount / words) * 100
  let communication = 80
  if (metrics.avgSentenceWords > 30)
    communication -= Math.min(25, (metrics.avgSentenceWords - 30) * 2)
  if (metrics.avgSentenceWords > 0 && metrics.avgSentenceWords < 6) communication -= 10
  if (fillerRate > 1) communication -= Math.min(30, (fillerRate - 1) * 6)
  if (acc.signals.has('example')) communication += 10
  if (acc.signals.has('structured')) communication += 10
  if (metrics.wordCount < 15) communication = Math.min(communication, 40)
  dimensions.push(
    dim(
      'communication',
      communication,
      `${Math.round(metrics.avgSentenceWords)} words per sentence, ${metrics.fillerCount} filler words`,
    ),
  )

  // Confidence: calibrated language. Hedging lowers it, honest uncertainty restores some.
  if (metrics.wordCount < 20) dimensions.push(dim('confidence', null, 'Answer too short to judge.'))
  else {
    const hedgeRate = (metrics.hedgeCount / words) * 100
    let confidence = 100 - Math.min(60, hedgeRate * 12)
    if (acc.signals.has('hedging')) confidence -= 10
    if (acc.signals.has('honest-uncertainty')) confidence += 10
    dimensions.push(dim('confidence', confidence, `${metrics.hedgeCount} hedging phrases`))
  }

  // Structure: STAR for stories, ordinal markers elsewhere.
  const starExpected = STAR_SIGNALS.filter((s) => expected.has(s))
  if (roundKind === 'behavioral' || starExpected.length >= 3) {
    const present = STAR_SIGNALS.filter((s) => acc.signals.has(s)).length
    const structure =
      (present / STAR_SIGNALS.length) * 80 + (acc.signals.has('structured') ? 20 : 0)
    dimensions.push(
      dim('structure', structure, `${present} of ${STAR_SIGNALS.length} story elements present`),
    )
  } else {
    const structure = acc.signals.has('structured')
      ? 90
      : metrics.sentenceCount >= 4 && metrics.avgSentenceWords <= 28
        ? 55
        : 35
    dimensions.push(
      dim(
        'structure',
        structure,
        acc.signals.has('structured') ? 'Answered in clear steps' : 'No clear ordering',
      ),
    )
  }

  // Conciseness: first answer length against the range the question calls for.
  const [low, high] = spec.wordRange
  let conciseness: number
  if (metrics.wordCount > high)
    conciseness = 100 - Math.min(60, (metrics.wordCount / high - 1) * 100)
  else if (metrics.wordCount < low) conciseness = 70 * (metrics.wordCount / low)
  else conciseness = 100
  dimensions.push(
    dim('conciseness', conciseness, `${metrics.wordCount} words (expected ${low} to ${high})`),
  )

  // Trade-off reasoning.
  const hasTradeoffConcepts = spec.concepts.some((c) => c.kind === 'tradeoff')
  if (hasTradeoffConcepts || expected.has('tradeoff')) {
    const signal = acc.signals.has('tradeoff') ? 1 : 0
    const tradeoff = hasTradeoffConcepts
      ? (conceptCredit(thread, acc, 'tradeoff') / TARGET_COVERAGE) * 0.75 * 100 + signal * 25
      : signal === 1
        ? 85
        : 20
    dimensions.push(
      dim(
        'trade-off-reasoning',
        tradeoff,
        signal ? 'Weighed alternatives explicitly' : 'Did not weigh alternatives',
      ),
    )
  } else dimensions.push(dim('trade-off-reasoning', null, 'Not assessed for this question.'))

  const ordered = DIMENSION_ORDER.map((id) => dimensions.find((d) => d.id === id)!)
  return {
    scoringVersion: SCORING_VERSION,
    basis: threadBasis(thread),
    score: weightedScore(ordered, roundKind, spec.emphasis),
    dimensions: ordered,
    concepts,
    redFlags,
    signals,
    followUps,
  }
}

function weightedScore(
  dimensions: DimensionResult[],
  kind: InterviewRoundKind,
  emphasis: Partial<Record<InterviewDimensionId, number>> | undefined,
): number {
  let total = 0
  let weight = 0
  for (const d of dimensions) {
    if (d.score === null) continue
    const w = ROUND_WEIGHTS[kind][d.id] * (emphasis?.[d.id] ?? 1)
    total += d.score * w
    weight += w
  }
  return weight === 0 ? 0 : round(total / weight)
}

// ───────────────────────────── Session ─────────────────────────────

const mean = (values: number[]) =>
  values.length === 0 ? null : values.reduce((a, b) => a + b, 0) / values.length

function usedSeconds(threads: QuestionThread[]): number {
  return threads.reduce(
    (sum, t) => sum + t.turns.reduce((s, turn) => s + (turn.answer?.durationSeconds ?? 0), 0),
    0,
  )
}

export function evaluateSession(session: InterviewSession, completedAt: string): SessionEvaluation {
  const closed = (t: QuestionThread) => t.evaluation !== undefined

  const rounds: RoundEvaluation[] = session.rounds.map((r) => {
    const evaluated = r.threads.filter(closed)
    const score = mean(evaluated.map((t) => t.evaluation!.score))
    return {
      roundId: r.id,
      kind: r.kind,
      score: score === null ? null : round(score),
      threads: r.threads.length,
      answered: r.threads.filter((t) => answeredTurns(t).length > 0).length,
      usedSeconds: usedSeconds(r.threads),
    }
  })

  // Rounds contribute in proportion to their timebox, as a real loop does.
  let weighted = 0
  let weights = 0
  session.rounds.forEach((r, i) => {
    const s = rounds[i]!.score
    if (s !== null) {
      weighted += s * r.timeboxMinutes
      weights += r.timeboxMinutes
    }
  })
  const overall = weights === 0 ? null : round(weighted / weights)

  const allThreads = session.rounds.flatMap((r) => r.threads.filter(closed))
  const dimensions: DimensionAggregate[] = DIMENSION_ORDER.map((id) => {
    const scores = allThreads
      .map((t) => t.evaluation!.dimensions.find((d) => d.id === id)?.score)
      .filter((s): s is number => typeof s === 'number')
    const m = mean(scores)
    return { id, score: m === null ? null : round(m), samples: scores.length }
  })

  const byTopic = new Map<string, number[]>()
  for (const t of allThreads) {
    const list = byTopic.get(t.spec.topic) ?? []
    list.push(t.evaluation!.score)
    byTopic.set(t.spec.topic, list)
  }
  const topics: TopicAggregate[] = [...byTopic.entries()]
    .map(([topic, scores]) => {
      const score = round(mean(scores)!)
      return { topic, score, threads: scores.length, weak: score < WEAK_TOPIC_THRESHOLD }
    })
    .sort((a, b) => a.score - b.score)

  const bases = new Set(allThreads.map((t) => t.evaluation!.basis))
  const basis = bases.size > 1 ? 'mixed' : ([...bases][0] ?? 'rule-based')
  const answeredCount = rounds.reduce((s, r) => s + r.answered, 0)
  const fellBack = allThreads.some((t) => t.turns.some((turn) => turn.evidence?.fallbackReason))

  return {
    scoringVersion: SCORING_VERSION,
    completedAt,
    overall,
    band: overall === null ? null : bandFor(overall),
    basis,
    confidence: confidenceFor(answeredCount, basis, fellBack),
    rounds,
    dimensions,
    topics,
    strengths: strengthsOf(allThreads, dimensions),
    gaps: gapsOf(allThreads, dimensions, topics),
  }
}

/** A rule-based reading is never reported as high confidence: it matches terms, it does not understand. */
export function confidenceFor(
  answered: number,
  basis: 'rule-based' | 'llm-assisted' | 'mixed',
  fellBack = false,
): EvaluationConfidence {
  if (answered < 3) return 'low'
  if (basis === 'rule-based' || fellBack) return answered >= 6 ? 'medium' : 'low'
  return answered >= 8 ? 'high' : 'medium'
}

function strengthsOf(threads: QuestionThread[], dimensions: DimensionAggregate[]): Finding[] {
  const findings: Finding[] = []
  const ranked = [...threads].sort((a, b) => b.evaluation!.score - a.evaluation!.score)
  for (const t of ranked) {
    const best = t
      .evaluation!.concepts.filter((c) => c.status === 'explained' && c.quote)
      .sort((a, b) => Number(b.required) - Number(a.required))[0]
    if (best && t.evaluation!.score >= 60) {
      findings.push({
        text: `Explained ${best.label.toLowerCase()} well.`,
        threadId: t.id,
        topic: t.spec.topic,
        ...(best.quote ? { quote: best.quote } : {}),
      })
    }
    if (findings.length >= 4) break
  }
  for (const d of dimensions) {
    if (d.score !== null && d.score >= 80 && d.samples >= 2 && findings.length < 6) {
      findings.push({ text: `${DIMENSION_LABELS[d.id]} was consistently strong.`, dimension: d.id })
    }
  }
  return findings
}

function gapsOf(
  threads: QuestionThread[],
  dimensions: DimensionAggregate[],
  topics: TopicAggregate[],
): Finding[] {
  const findings: Finding[] = []
  for (const t of threads) {
    for (const flag of t.evaluation!.redFlags) {
      findings.push({ text: flag.note, threadId: t.id, topic: t.spec.topic, quote: flag.quote })
    }
  }
  const missed = threads
    .flatMap((t) =>
      t
        .evaluation!.concepts.filter((c) => c.required && c.status === 'missed')
        .map((c) => ({ t, c })),
    )
    .sort((a, b) => a.t.evaluation!.score - b.t.evaluation!.score)
  for (const { t, c } of missed) {
    if (findings.length >= 8) break
    findings.push({ text: `${c.label}: ${c.summary}`, threadId: t.id, topic: t.spec.topic })
  }
  for (const d of dimensions) {
    if (d.score !== null && d.score < 50 && d.samples >= 2 && findings.length < 10) {
      findings.push({ text: `${DIMENSION_LABELS[d.id]} needs work.`, dimension: d.id })
    }
  }
  for (const topic of topics.filter((x) => x.weak).slice(0, 2)) {
    if (findings.length < 10)
      findings.push({ text: `Weak topic: ${topic.topic}.`, topic: topic.topic })
  }
  return findings
}
