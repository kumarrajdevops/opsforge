import type {
  JdComparison,
  LearningPhase,
  LearningPhaseId,
  PrepPlanAction,
  PrepPlanDay,
  PrepPlanItem,
  PreparationPlan,
  RequirementAssessment,
  RequirementStatus,
  ResumeClaimItem,
} from '@opsforge/types'
import { CATEGORIES } from '../drills/questions/generic'
import { packFor } from '../drills/questions/packs'
import { technologyLabel } from '../technologies/catalog'

export const DEFAULT_PLAN_DAYS = 7
export const DEFAULT_MINUTES_PER_DAY = 45

const PRIORITY_WEIGHT = { required: 3, preferred: 1 } as const
const SEVERITY: Record<RequirementStatus, number> = {
  'no-evidence': 1,
  weak: 0.9,
  'claimed-untested': 0.7,
  partial: 0.5,
  demonstrated: 0,
}
/** Requirements nothing in the product measures are real but cannot be verified, so they weigh less. */
const UNMEASURABLE_FACTOR = 0.5

const ARCHITECTURE_TECH = new Set([
  'kubernetes',
  'terraform',
  'aws',
  'azure',
  'gcp',
  'service-mesh',
  'ci-cd',
])
const INCIDENT_TECH = new Set(['sre', 'observability', 'prometheus', 'kubernetes', 'networking'])

const EXAMPLE_PROMPTS = [
  'A real example you personally handled',
  'How you measured whether it worked',
  'What went wrong and what you changed afterwards',
]

function studyChecklist(technologies: string[]): string[] {
  const pack = packFor(technologies)
  const rows = pack
    ? Object.values(pack.categories).flatMap((c) => c?.concepts ?? [])
    : [...CATEGORIES.architecture.generic, ...CATEGORIES.troubleshooting.generic]
  const labels = rows.filter(([, , , weight]) => weight === 3).map(([label]) => label)
  return [...new Set(labels)].slice(0, 8)
}

function claimFor(technologies: string[], claims: ResumeClaimItem[]): ResumeClaimItem | undefined {
  return claims.find(
    (c) => !c.flags.includes('listed-only') && c.technologies.some((t) => technologies.includes(t)),
  )
}

function actionsFor(a: RequirementAssessment, claims: ResumeClaimItem[]): PrepPlanAction[] {
  const subject =
    a.technologies.length > 0 ? a.technologies.map(technologyLabel).join(' / ') : a.label

  if (a.technologies.length === 0) {
    return [
      {
        kind: 'study',
        label: `Prepare a real example of ${a.label.toLowerCase()}`,
        detail:
          'The posting asks for this and nothing here can score it. Have a concrete story ready.',
        minutes: 15,
        checklist: EXAMPLE_PROMPTS,
      },
    ]
  }

  const claim = claimFor(a.technologies, claims)
  const defend: PrepPlanAction | null = claim
    ? {
        kind: 'defend-claim',
        label: `Defend: ${claim.text}`,
        detail: `Answer the drill questions generated from this line. It is the claim most tied to ${subject}.`,
        minutes: 20,
        path: '/resume',
      }
    : null
  const study: PrepPlanAction = {
    kind: 'study',
    label: `Review ${subject} fundamentals`,
    detail: 'Be able to explain each of these unprompted, with an example from your own work.',
    minutes: 20,
    checklist: studyChecklist(a.technologies),
  }
  const mock: PrepPlanAction = {
    kind: 'mock-interview',
    label: `Mock interview on ${subject}`,
    detail: 'Paste the job description when setting up so the questions follow this posting.',
    minutes: 20,
    path: '/interviewer',
  }
  const incident: PrepPlanAction = {
    kind: 'incident',
    label: `Run an incident scenario touching ${subject}`,
    detail: 'Practise triage and communication under pressure.',
    minutes: 25,
    path: '/incidents',
  }
  const architecture: PrepPlanAction = {
    kind: 'architecture',
    label: `Sketch a design for ${subject}`,
    detail: 'Build and critique one design in the Architecture Studio.',
    minutes: 25,
    path: '/architecture',
  }

  const extras: PrepPlanAction[] = []
  if (a.priority === 'required' && a.technologies.some((t) => ARCHITECTURE_TECH.has(t)))
    extras.push(architecture)
  if (a.technologies.some((t) => INCIDENT_TECH.has(t))) extras.push(incident)

  switch (a.status) {
    case 'claimed-untested':
      return [defend ?? mock, ...(defend ? [] : [study])]
    case 'no-evidence':
      return [study, mock, ...extras]
    case 'weak':
      return [study, defend ?? mock, ...extras.slice(0, 1)]
    case 'partial':
      return [{ ...(defend ?? mock), minutes: 15 }]
    case 'demonstrated':
      return []
  }
}

function urgencyOf(a: RequirementAssessment): number {
  const base = PRIORITY_WEIGHT[a.priority] * SEVERITY[a.status]
  const value = a.technologies.length === 0 ? base * UNMEASURABLE_FACTOR : base
  return Math.round(value * 100) / 100
}

export interface PlanOptions {
  comparison: JdComparison
  claims: ResumeClaimItem[]
  now: string
  days?: number
  minutesPerDay?: number
}

/**
 * A study plan from the comparison: every requirement that is not demonstrated becomes an item,
 * ordered by priority weight times gap severity, with actions that use only things that exist in
 * the product. Scheduling is greedy over the days and time the candidate has.
 */
export function buildPreparationPlan({
  comparison,
  claims,
  now,
  days = DEFAULT_PLAN_DAYS,
  minutesPerDay = DEFAULT_MINUTES_PER_DAY,
}: PlanOptions): PreparationPlan {
  const items: PrepPlanItem[] = comparison.assessments
    .filter((a) => a.status !== 'demonstrated')
    .map((a) => ({
      id: `plan:${a.id}`,
      requirementId: a.id,
      label: a.label,
      priority: a.priority,
      status: a.status,
      urgency: urgencyOf(a),
      reason: a.reason,
      actions: actionsFor(a, claims),
      ...(a.options ? { options: a.options } : {}),
    }))
    .sort((x, y) => y.urgency - x.urgency || x.label.localeCompare(y.label))

  const queue = items.flatMap((item) =>
    item.actions.map((action, index) => ({ item, action, index, done: false })),
  )
  const schedule: PrepPlanDay[] = []

  for (let day = 1; day <= days; day++) {
    let remaining = minutesPerDay
    const slots: PrepPlanDay['slots'] = []
    for (const entry of queue) {
      if (entry.done || entry.action.minutes > remaining) continue
      const previous = queue.find((q) => q.item === entry.item && q.index === entry.index - 1)
      if (previous && !previous.done) continue
      entry.done = true
      remaining -= entry.action.minutes
      slots.push({ itemId: entry.item.id, itemLabel: entry.item.label, action: entry.action })
    }
    if (slots.length > 0) schedule.push({ day, minutes: minutesPerDay - remaining, slots })
  }

  const unscheduled = [...new Set(queue.filter((q) => !q.done).map((q) => q.item.id))]

  return { createdAt: now, days, minutesPerDay, items, schedule, unscheduled }
}

const PHASES: { id: LearningPhaseId; title: string; description: string }[] = [
  {
    id: 'gaps',
    title: 'Close the required gaps',
    description:
      'Required items with no evidence or weak answers. An interviewer will find these first, so start here.',
  },
  {
    id: 'evidence',
    title: 'Turn resume claims into evidence',
    description:
      'Required items that are only on your resume. Defend each in a drill so the claim is tested.',
  },
  {
    id: 'strengthen',
    title: 'Strengthen what is partly there',
    description:
      'Required items with some evidence. One or two more strong answers will settle them.',
  },
  {
    id: 'preferred',
    title: 'Preferred extras',
    description: 'Nice-to-haves. Do these last, once the required items are covered.',
  },
]

function phaseOf(item: PrepPlanItem): LearningPhaseId {
  if (item.priority === 'preferred') return 'preferred'
  if (item.status === 'claimed-untested') return 'evidence'
  if (item.status === 'partial') return 'strengthen'
  return 'gaps'
}

/** The plan reordered as a learning path: what kind of work first, then by urgency within it. */
export function buildLearningPath(plan: PreparationPlan): LearningPhase[] {
  return PHASES.map((phase) => {
    const items = plan.items.filter((item) => phaseOf(item) === phase.id)
    return {
      ...phase,
      items,
      minutes: items.reduce(
        (sum, item) => sum + item.actions.reduce((m, a) => m + a.minutes, 0),
        0,
      ),
    }
  }).filter((phase) => phase.items.length > 0)
}
