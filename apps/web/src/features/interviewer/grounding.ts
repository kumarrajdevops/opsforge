import type {
  InterviewContext,
  InterviewRoundKind,
  JdRequirement,
  QuestionSpec,
  ResumeClaim,
} from '@opsforge/types'
import { compileTerm, collapse, excerpt, splitSentences } from './analysis/text'
import { concept, question } from './bank/author'

/** Canonical technology id, display name and the spellings that identify it in free text. */
const CATALOG: { id: string; label: string; aliases: string[]; topic: string }[] = [
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    aliases: ['kubernetes', 'k8s', 'eks', 'gke', 'aks', 'helm'],
    topic: 'kubernetes',
  },
  {
    id: 'docker',
    label: 'Docker',
    aliases: ['docker', 'containerd', 'containers'],
    topic: 'containers',
  },
  {
    id: 'terraform',
    label: 'Terraform',
    aliases: ['terraform', 'opentofu', 'terragrunt'],
    topic: 'terraform',
  },
  { id: 'ansible', label: 'Ansible', aliases: ['ansible'], topic: 'terraform' },
  {
    id: 'aws',
    label: 'AWS',
    aliases: ['aws', 'amazon web services', 'ec2', 's3', 'lambda', 'cloudformation'],
    topic: 'aws',
  },
  { id: 'azure', label: 'Azure', aliases: ['azure'], topic: 'architecture' },
  { id: 'gcp', label: 'GCP', aliases: ['gcp', 'google cloud'], topic: 'architecture' },
  { id: 'jenkins', label: 'Jenkins', aliases: ['jenkins'], topic: 'ci-cd' },
  { id: 'github-actions', label: 'GitHub Actions', aliases: ['github actions'], topic: 'ci-cd' },
  { id: 'gitlab', label: 'GitLab CI', aliases: ['gitlab'], topic: 'ci-cd' },
  {
    id: 'ci-cd',
    label: 'CI/CD',
    aliases: [
      'ci/cd',
      'cicd',
      'ci cd',
      'continuous delivery',
      'continuous integration',
      'pipelines',
    ],
    topic: 'ci-cd',
  },
  {
    id: 'argocd',
    label: 'Argo CD',
    aliases: ['argocd', 'argo cd', 'flux', 'gitops'],
    topic: 'gitops',
  },
  {
    id: 'prometheus',
    label: 'Prometheus',
    aliases: ['prometheus', 'alertmanager', 'promql'],
    topic: 'observability',
  },
  {
    id: 'grafana',
    label: 'Grafana',
    aliases: ['grafana', 'datadog', 'new relic', 'splunk', 'elk', 'opentelemetry'],
    topic: 'observability',
  },
  { id: 'linux', label: 'Linux', aliases: ['linux', 'bash', 'shell scripting'], topic: 'linux' },
  {
    id: 'networking',
    label: 'Networking',
    aliases: ['networking', 'dns', 'load balanc', 'tcp/ip', 'vpc', 'nginx', 'haproxy'],
    topic: 'networking',
  },
  { id: 'vault', label: 'Vault', aliases: ['vault', 'secrets manager'], topic: 'security' },
  {
    id: 'sre',
    label: 'SRE',
    aliases: ['sre', 'site reliability', 'slo', 'sla', 'incident response', 'on-call', 'on call'],
    topic: 'sre',
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    aliases: ['postgres', 'postgresql', 'mysql', 'rds', 'aurora'],
    topic: 'observability',
  },
  { id: 'python', label: 'Python', aliases: ['python', 'golang', 'go lang'], topic: 'ci-cd' },
]

export function technologyLabel(id: string): string {
  return CATALOG.find((t) => t.id === id)?.label ?? id
}

export function technologyTopic(id: string): string {
  return CATALOG.find((t) => t.id === id)?.topic ?? 'architecture'
}

function technologiesIn(text: string): string[] {
  return CATALOG.filter((t) => t.aliases.some((a) => compileTerm(a).test(text))).map((t) => t.id)
}

const METRIC =
  /(?:\d+\s?%|\b\d[\d,.]*\s?(?:x|ms|s|min|minutes|hours|users|requests|rps|tb|gb|services|clusters|engineers|teams|nodes)\b|\$\s?\d)/i
const MUST =
  /\b(?:required|must|essential|minimum|you will|you'll|responsible for|strong experience|proven)\b/i
const NICE = /\b(?:nice to have|preferred|bonus|plus|familiarity|ideally)\b/i

function stableId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`
}

/** Splits pasted resume text into bullet-sized claims and keeps those that name a technology or an outcome. */
export function parseResume(text: string): ResumeClaim[] {
  const lines = text
    .split(/\r?\n|•|•|\s-\s(?=[A-Z])/)
    .flatMap((line) => (line.length > 260 ? splitSentences(line) : [line]))
    .map((line) => collapse(line.replace(/^[\s\-*••]+/, '')))
    .filter((line) => line.split(' ').length >= 5)

  const claims: ResumeClaim[] = []
  for (const line of lines) {
    const technologies = technologiesIn(line)
    const hasMetric = METRIC.test(line)
    if (technologies.length === 0 && !hasMetric) continue
    claims.push({
      id: stableId('claim', claims.length),
      text: excerpt(line, 240),
      technologies,
      hasMetric,
    })
    if (claims.length >= 12) break
  }
  return claims
}

/** Extracts the technologies a job description asks for, with a rough must/nice split. */
export function parseJobDescription(text: string): JdRequirement[] {
  const requirements = new Map<string, JdRequirement>()
  const sentences = text
    .split(/\r?\n|(?<=[.;])\s/)
    .map((s) => collapse(s))
    .filter(Boolean)
  for (const sentence of sentences) {
    const priority: JdRequirement['priority'] =
      NICE.test(sentence) && !MUST.test(sentence) ? 'nice' : 'must'
    for (const id of technologiesIn(sentence)) {
      const existing = requirements.get(id)
      if (!existing || (existing.priority === 'nice' && priority === 'must')) {
        requirements.set(id, {
          id: stableId('jd', requirements.size),
          technology: id,
          label: technologyLabel(id),
          priority,
        })
      }
    }
  }
  return [...requirements.values()]
}

export function buildContext(input: {
  targetRole?: string
  resume?: string
  jd?: string
}): InterviewContext {
  const context: InterviewContext = {
    resumeClaims: input.resume ? parseResume(input.resume) : [],
    jdRequirements: input.jd ? parseJobDescription(input.jd) : [],
  }
  if (input.targetRole?.trim()) context.targetRole = input.targetRole.trim()
  return context
}

// ───────────── Generated questions ─────────────

const RESUME_ROUNDS: InterviewRoundKind[] = ['screening', 'technical', 'final']

/**
 * A claim-interrogation question. The rubric is generic on purpose: it tests whether the candidate
 * can own and explain what their own resume says, which a rule-based analyzer can assess honestly.
 */
export function resumeQuestion(claim: ResumeClaim): QuestionSpec {
  const tech = claim.technologies.map(technologyLabel)
  const subject = tech.length > 0 ? tech.slice(0, 2).join(' and ') : 'this work'
  const prompt = claim.hasMetric
    ? `Your resume says: "${claim.text}" Walk me through how you actually achieved that, and how the number was measured.`
    : `Your resume says: "${claim.text}" Tell me about that in detail: what was the problem, what did you personally build or decide, and how did it turn out?`
  return question({
    id: `resume-${claim.id}`,
    rounds: RESUME_ROUNDS,
    topic: tech.length > 0 ? technologyTopic(claim.technologies[0]!) : 'behavioral',
    technologies: claim.technologies,
    difficulty: 'senior',
    prompt,
    intent: `Verifies the candidate owns the claim about ${subject}: ownership, approach, measurable impact and alternatives.`,
    expectedSignals: ['ownership', 'example', 'metric', 'tradeoff'],
    wordRange: [90, 320],
    concepts: [
      concept(
        'problem-context',
        'Clear problem and context',
        'Explains what was wrong, the scale involved and why it mattered.',
        [
          'problem',
          'issue',
          'challenge',
          'before',
          'at the time',
          'scale',
          'requests',
          'users',
          'incident',
          'pain',
        ],
        'What was the situation before you started, and why did it need to change?',
        { w: 2 },
      ),
      concept(
        'personal-contribution',
        'Specific personal ownership',
        'Says what the candidate personally designed, built or decided.',
        [
          'i designed',
          'i built',
          'i wrote',
          'i led',
          'i decided',
          'i implemented',
          'i proposed',
          'i migrated',
          'i set up',
          'my role',
          'i owned',
        ],
        'Which parts of that did you do yourself, as opposed to your team?',
        { w: 3 },
      ),
      concept(
        'technical-approach',
        'Technical approach and reasoning',
        'Explains how it worked and why this design was chosen.',
        [
          'because',
          'we chose',
          'i chose',
          'approach',
          'design',
          'architecture',
          'implemented',
          'using',
          'configured',
        ],
        'Take me one level deeper: how did it actually work?',
        { w: 3 },
      ),
      concept(
        'alternatives',
        'Alternatives and trade-offs',
        'Describes options considered and what was given up.',
        [
          'alternative',
          'instead of',
          'considered',
          'trade-off',
          'tradeoff',
          'versus',
          'compared',
          'downside',
          'rather than',
        ],
        'What else did you consider, and why not that?',
        { w: 2, kind: 'tradeoff' },
      ),
      concept(
        'measured-outcome',
        'Measured outcome',
        'Backs the result with a number, a before and after, or a concrete effect.',
        [
          'reduced',
          'improved',
          'decreased',
          'increased',
          'from',
          'saved',
          'percent',
          '%',
          'faster',
          'minutes',
          'cost',
        ],
        'How did you measure that it worked?',
        { w: 3 },
      ),
      concept(
        'lessons-failure',
        'What went wrong and what was learned',
        'Admits a difficulty, mistake or limitation and the lesson.',
        [
          'went wrong',
          'mistake',
          'failed',
          'broke',
          'learned',
          'lesson',
          'difficult',
          'rollback',
          'would do differently',
          'regret',
        ],
        'What went wrong along the way?',
        { w: 2 },
      ),
    ],
  })
}

/** Used when no bank question covers a required technology. */
export function jdQuestion(req: JdRequirement): QuestionSpec {
  const label = req.label
  return question({
    id: `jd-${req.id}`,
    rounds: ['technical', 'screening', 'final'],
    topic: technologyTopic(req.technology),
    technologies: [req.technology],
    difficulty: 'senior',
    prompt: `The role asks for hands-on ${label}. Describe the most significant thing you have run in production with ${label}, and one thing about it that was harder than it looks.`,
    intent: `Tests real production experience with ${label}, a stated requirement of the role.`,
    expectedSignals: ['example', 'ownership', 'tradeoff'],
    wordRange: [80, 300],
    concepts: [
      concept(
        'production-scale',
        'Real production context',
        'States the scale, environment and what was at stake.',
        [
          'production',
          'clusters',
          'environments',
          'services',
          'users',
          'requests',
          'teams',
          'regions',
          'scale',
          'prod',
        ],
        `How big was the ${label} footprint you operated, and what depended on it?`,
        { w: 3 },
      ),
      concept(
        'operations',
        'Day-two operations',
        'Upgrades, monitoring, failure handling and on-call realities.',
        [
          'upgrade',
          'monitor',
          'alert',
          'on-call',
          'incident',
          'backup',
          'patch',
          'capacity',
          'maintain',
          'outage',
        ],
        `Once it was live, what did running ${label} day to day involve?`,
        { w: 2 },
      ),
      concept(
        'hard-part',
        'A genuine difficulty',
        'Names a specific problem, its cause and how it was solved.',
        [
          'hard',
          'difficult',
          'tricky',
          'surprised',
          'gotcha',
          'turned out',
          'problem',
          'bug',
          'limitation',
          'harder',
        ],
        'What caught you out, and how did you work through it?',
        { w: 3 },
      ),
      concept(
        'decisions',
        'Decisions and trade-offs',
        'Explains choices made and what they cost.',
        [
          'chose',
          'decided',
          'trade-off',
          'tradeoff',
          'instead',
          'alternative',
          'because',
          'cost',
          'versus',
        ],
        'What decision would you make differently now?',
        { w: 2, kind: 'tradeoff' },
      ),
      concept(
        'ownership',
        'Personal ownership',
        'Describes what the candidate personally owned.',
        [
          'i owned',
          'i led',
          'i built',
          'i designed',
          'i migrated',
          'i set up',
          'i was responsible',
          'my role',
        ],
        'What part of this was yours?',
        { w: 2 },
      ),
    ],
  })
}
