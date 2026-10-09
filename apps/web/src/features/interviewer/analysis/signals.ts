import type { AnswerSignalId } from '@opsforge/types'

/*
 * Rule-based signal detectors. They look for wording that evidences a behaviour (scoping an incident
 * before acting, naming a trade-off, putting a number on a result). They are heuristics: they can be
 * fooled by buzzwords, which is why follow-ups probe whatever is merely named.
 */

export const ALL_SIGNALS: AnswerSignalId[] = [
  'structured',
  'example',
  'metric',
  'tradeoff',
  'hedging',
  'honest-uncertainty',
  'ownership',
  'team-only',
  'scope-first',
  'hypothesis',
  'mitigation',
  'verification',
  'communication-plan',
  'prevention',
  'requirements',
  'failure-modes',
  'scalability',
  'security',
  'cost',
  'observability',
  'situation',
  'task',
  'action',
  'result',
  'reflection',
]

const ownership =
  /\bI(?:'ve| have)? (?:led|owned|designed|built|decided|drove|driven|proposed|wrote|implemented|migrated|introduced|set up|championed|created|fixed|rolled|rewrote|pushed|negotiated|convinced|ran|took (?:the lead|ownership|charge)|was (?:responsible|the (?:owner|lead|on-call)))\b/i

const detectors: Partial<Record<AnswerSignalId, RegExp>> = {
  example:
    /\b(?:for example|for instance|e\.g\.|in one case|at (?:my|a previous|my last|one) (?:company|job|employer|client)|we had|I once|last (?:year|quarter|month)|in production|one time|a few (?:months|years) ago)\b/i,
  metric:
    /(?:\b\d+(?:\.\d+)?\s?(?:%|percent|x\b|ms\b|seconds?\b|secs?\b|minutes?\b|mins?\b|hours?\b|hrs?\b|days?\b|weeks?\b|k\b|gb\b|tb\b|rps\b|qps\b|req\/s\b|users\b|customers\b|engineers\b|services\b|clusters\b|nodes\b|pods\b|regions\b|teams\b|deploys?\b|incidents?\b)|\$\s?\d)/i,
  tradeoff:
    /\b(?:trade-?offs?|downsides?|drawbacks?|on the other hand|versus|vs\.?|at the cost of|the cost (?:is|of)|alternatively|it depends|depends on|pros and cons|compromise|whereas|rather than|instead of|the catch)\b/i,
  ownership,
  'scope-first':
    /\b(?:impact|blast radius|how many (?:users|customers|requests)|who(?:'s| is) affected|scope of|severity|customer-facing|all (?:users|regions|pods|nodes) or|since when|when did (?:it|this) start|started at|timeline|recent (?:change|deploy|release|rollout)|what changed|is it (?:all|every|just|only)|affected (?:users|services|region|customers))\b/i,
  hypothesis:
    /\b(?:hypothes[ei]s|suspect|likely (?:cause|culprit)|rule (?:it )?out|narrow(?:ing)? (?:it )?down|my (?:first )?(?:guess|theory)|could be|might be (?:the|a)|eliminate|bisect|divide and conquer)\b/i,
  mitigation:
    /\b(?:roll ?back|revert|fail ?over|scale (?:up|out)|feature flag|kill switch|disable (?:the|that)|mitigat\w*|drain|shed load|rate[- ]limit\w*|circuit[- ]breaker|stop the bleeding|restore (?:service|traffic)|work-?around|hot-?fix)\b/i,
  verification:
    /\b(?:verify|verified|confirm(?:ed|ing)?|validate|check (?:that )?(?:the )?(?:metrics|dashboards?|error rate|logs)|monitor(?:ing)? (?:the )?(?:recovery|metrics|error rate)|make sure (?:it|that)|ensure (?:it|that)|watch (?:the )?(?:metrics|error rate|latency)|smoke test)\b/i,
  'communication-plan':
    /\b(?:status ?page|incident (?:channel|commander|lead)|stakeholders?|keep (?:everyone|people|leadership|customers) (?:informed|updated)|updates? (?:to|for) (?:the )?(?:customers|leadership|team|support)|notify|communicat\w+|war ?room|page (?:the )?on-?call|escalat\w+|comms)\b/i,
  prevention:
    /\b(?:post-?mortems?|post-?incident|retro(?:spective)?|root[- ]cause analysis|rca|prevent\w*|action items?|runbooks?|add (?:an? )?(?:test|guardrail|alert|check)|doesn't (?:happen|recur)|never again|lessons? learned|follow-up (?:work|tickets?|actions?))\b/i,
  requirements:
    /\b(?:requirements?|slos?|slas?|rto|rpo|availability target|assum(?:e|ing|ption)s?|constraints?|traffic (?:pattern|profile)|expected (?:load|traffic)|how many (?:users|requests|regions)|scale of|clarif\w+)\b/i,
  'failure-modes':
    /\b(?:single point of failure|spof|fail(?:s|ure|ures|over|ing)?\b|outage|disaster|redundan\w+|multi-?az|availability zones?|region(?:al)? (?:outage|failure|loss)|degrad\w+|graceful\w*|retry|retries|timeouts?|back-?pressure|blast radius)/i,
  scalability:
    /\b(?:scal(?:e|es|ing|able|ability)|auto-?scal\w+|horizontal\w*|vertical\w*|shard\w*|partition\w*|throughput|capacity|load[- ]balanc\w+|cach(?:e|es|ing)|queue\w*|bottleneck\w*)\b/i,
  security:
    /\b(?:secur\w+|iam|least[- ]privilege|encrypt\w*|kms|tls|mtls|secrets?|rbac|waf|network polic\w+|zero[- ]trust|audit\w*|compliance|vault)\b/i,
  cost: /\b(?:cost\w*|budget\w*|spot instances?|reserved instances?|savings plans?|right-?siz\w+|finops|expensive|cheaper|cheap)\b|\$/i,
  observability:
    /\b(?:observab\w+|metrics?|logs?|logging|traces?|tracing|dashboards?|alert(?:s|ing)?|prometheus|grafana|opentelemetry|monitoring)\b/i,
  situation:
    /\b(?:situation|context was|background|at (?:my|a previous|that|my last) (?:company|job|time|employer)|we (?:were|had)\b|there (?:was|were)\b|when I was|last (?:year|quarter)|a few (?:months|years) ago|our (?:team|company|platform|production)\b)/i,
  task: /\b(?:my (?:role|responsibility|task|goal|job)|I was (?:asked|responsible|tasked|the one)|needed to|had to|the goal (?:was|is)|objective|was supposed to|my job was|was on the hook)\b/i,
  action:
    /\bI (?:decided|started|began|set up|put together|introduced|worked with|pulled|proposed|ran|wrote|changed|added|built|created|reached out|organi[sz]ed|split|ported|replaced|automated)\b/i,
  result:
    /\b(?:as a result|resulted in|the result|the outcome|reduced|improved|increased|decreased|cut (?:the|our|it)|saved|brought (?:it )?down|we (?:achieved|shipped|delivered|got)|ended up|in the end|which meant)\b/i,
  reflection:
    /\b(?:learn(?:ed|t)|lessons?|in hindsight|would do differently|next time|mistake|looking back|retrospect|I realis\w+|I realiz\w+|taught me|what I'd change)\b/i,
}

const structureMarkers =
  /(?:\bfirst(?:ly)?\b|\bsecond(?:ly)?\b|\bthird(?:ly)?\b|\bthen\b|\bnext\b|\bafter that\b|\bfinally\b|\blastly\b|\bstep \d\b|^\s*(?:\d+[.)]|[-*•])\s)/gim

const honestUncertainty =
  /\b(?:I haven't (?:used|worked|done|run)|I have not (?:used|worked|done|run)|I'm not (?:familiar|certain|sure I've)|I don't have (?:hands-on|direct|production) experience|I'd (?:verify|check the docs|look (?:it|that) up|want to confirm)|I would (?:verify|check the docs|look (?:it|that) up|want to confirm))\b/i

const hedgePattern =
  /\b(?:I think maybe|I guess|maybe|perhaps|probably|not sure|I believe|sort of|kind of|might be|I don't know|not really sure|I'm not certain|something like)\b/gi

const fillerPattern = /\b(?:um+|uh+|you know|basically|literally|actually|honestly)\b/gi

export interface DetectedSignal {
  signal: AnswerSignalId
  quote?: string
}

function firstSentenceMatching(sentences: string[], pattern: RegExp): string | undefined {
  return sentences.find((s) => pattern.test(s))
}

export function countHedges(sentences: string[]): number {
  let hedges = 0
  for (const sentence of sentences) {
    if (honestUncertainty.test(sentence)) continue
    hedges += sentence.match(hedgePattern)?.length ?? 0
  }
  return hedges
}

export function countFillers(text: string): number {
  return text.match(fillerPattern)?.length ?? 0
}

/** Detects delivery, ownership and domain signals in an answer. */
export function detectSignals(text: string, sentences: string[]): DetectedSignal[] {
  const found: DetectedSignal[] = []

  for (const [signal, pattern] of Object.entries(detectors) as [AnswerSignalId, RegExp][]) {
    const quote = firstSentenceMatching(sentences, pattern)
    if (quote !== undefined) found.push({ signal, quote })
  }

  const markers = new Set(
    (text.match(structureMarkers) ?? []).map((m) => m.trim().toLowerCase().replace(/[.)]$/, '')),
  )
  if (markers.size >= 2) found.push({ signal: 'structured' })

  const uncertain = firstSentenceMatching(sentences, honestUncertainty)
  if (uncertain !== undefined) found.push({ signal: 'honest-uncertainty', quote: uncertain })

  if (countHedges(sentences) >= 2) found.push({ signal: 'hedging' })

  const we = text.match(/\bwe\b/gi)?.length ?? 0
  if (we >= 3 && !ownership.test(text)) found.push({ signal: 'team-only' })

  return found
}
