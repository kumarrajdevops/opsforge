import type {
  InterviewContext,
  InterviewRoundKind,
  JdRequirement,
  QuestionSpec,
  ResumeClaim,
} from '@opsforge/types'
import { technologyLabel, technologyTopic } from '../technologies/catalog'
import { analyzeJd } from '../jd/analyze'
import { extractResume } from '../resume/claims'
import { concept, question } from './bank/author'

function stableId(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`
}

/** Claims from pasted resume text that name something concrete. Skills-list entries are not asked about here. */
export function parseResume(text: string): ResumeClaim[] {
  return extractResume(text)
    .claims.filter((claim) => !claim.flags.includes('listed-only'))
    .slice(0, 12)
}

/** Technologies a job description asks for, as interview requirements. Analysis lives in the JD feature. */
export function parseJobDescription(text: string): JdRequirement[] {
  return analyzeJd({ id: 'interview-jd', text, now: '' }).technologies.map((tech, index) => ({
    id: stableId('jd', index),
    technology: tech.id,
    label: tech.label,
    priority: tech.priority === 'required' ? 'must' : 'nice',
  }))
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
