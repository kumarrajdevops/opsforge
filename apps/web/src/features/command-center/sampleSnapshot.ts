import type { CommandCenterSnapshot } from '@opsforge/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/**
 * Illustrative snapshot used until the readiness engine and its API exist. Every number in it is
 * made up; the UI labels it as sample data. Times are relative to `now` so the feed reads naturally.
 */
export function buildSampleSnapshot(now: Date = new Date()): CommandCenterSnapshot {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  return {
    generatedAt: now.toISOString(),
    source: 'sample',
    evidenceTotal: 214,
    overall: {
      score: 63,
      band: 'developing',
      seniorTarget: 80,
      weeklyDelta: 2,
      level: {
        value: 3,
        label: 'Interview Ready',
        next: {
          label: 'Senior Interview Ready',
          requirement: 'Security and troubleshooting at 65+, no dimension below 55.',
        },
      },
      trend: [51, 53, 55, 56, 58, 59, 61, 63].map((score, i, all) => ({
        date: new Date(now.getTime() - (all.length - 1 - i) * WEEK).toISOString(),
        score,
      })),
    },
    dimensions: [
      {
        id: 'knowledge',
        label: 'Knowledge',
        score: 78,
        band: 'solid',
        target: 80,
        weeklyDelta: 1,
        evidenceCount: 62,
      },
      {
        id: 'practice',
        label: 'Practice',
        score: 70,
        band: 'solid',
        target: 75,
        weeklyDelta: 3,
        evidenceCount: 41,
      },
      {
        id: 'hands-on',
        label: 'Hands-on',
        score: 64,
        band: 'developing',
        target: 75,
        weeklyDelta: 4,
        evidenceCount: 22,
      },
      {
        id: 'troubleshooting',
        label: 'Troubleshooting',
        score: 52,
        band: 'weak',
        target: 75,
        weeklyDelta: 2,
        evidenceCount: 19,
      },
      {
        id: 'architecture',
        label: 'Architecture',
        score: 61,
        band: 'developing',
        target: 75,
        weeklyDelta: 3,
        evidenceCount: 11,
      },
      {
        id: 'security',
        label: 'Security',
        score: 48,
        band: 'weak',
        target: 70,
        weeklyDelta: -1,
        evidenceCount: 14,
      },
      {
        id: 'communication',
        label: 'Communication',
        score: 66,
        band: 'developing',
        target: 75,
        weeklyDelta: 0,
        evidenceCount: 17,
      },
      {
        id: 'confidence',
        label: 'Confidence',
        score: 58,
        band: 'developing',
        target: 70,
        weeklyDelta: 2,
        evidenceCount: 17,
      },
      {
        id: 'incident-response',
        label: 'Incident response',
        score: 55,
        band: 'developing',
        target: 75,
        weeklyDelta: 1,
        evidenceCount: 9,
      },
    ],
    failureRisks: [
      {
        id: 'risk-security',
        title: 'You would stall on secrets management and IAM least privilege',
        reason:
          'Security is your lowest dimension (48) and slipped 1 point this week. 6 of your last 8 security answers named a tool but not a threat model.',
        likelihood: 'high',
        dimension: 'security',
        evidenceCount: 14,
        action: { label: 'Practice security questions', module: 'questions' },
      },
      {
        id: 'risk-troubleshooting',
        title: 'Kubernetes networking incidents would run past the time box',
        reason:
          'DNS and NetworkPolicy faults took 2.4x the target time to localise. You check pods and logs first and reach the network layer last.',
        likelihood: 'high',
        dimension: 'troubleshooting',
        evidenceCount: 19,
        action: { label: 'Run a networking incident', module: 'incidents' },
      },
      {
        id: 'risk-incident',
        title: 'You mitigate before you find the root cause',
        reason:
          '2 of your last 5 SEV2 simulations ended mitigated but with no root cause. Interviewers probe for the cause and the follow-up actions.',
        likelihood: 'medium',
        dimension: 'incident-response',
        evidenceCount: 9,
        action: { label: 'Replay the RCA drill', module: 'incidents' },
      },
      {
        id: 'risk-architecture',
        title: 'Designs skip failure modes and cost trade-offs',
        reason:
          'Your latest reviewed design scored 40 on failure modes and 45 on cost. The core design is sound; the follow-ups are where it breaks.',
        likelihood: 'medium',
        dimension: 'architecture',
        evidenceCount: 11,
        action: { label: 'Resume the design review', module: 'architecture' },
      },
    ],
    skillModes: [
      { id: 'knowledge', label: 'Knowledge' },
      { id: 'hands-on', label: 'Hands-on' },
      { id: 'troubleshooting', label: 'Troubleshoot' },
      { id: 'interview', label: 'Interview' },
    ],
    skills: [
      row('kubernetes', 'Kubernetes', 66, 'developing', 75, 46, [82, 68, 49, 61]),
      row('terraform', 'Terraform', 72, 'solid', 75, 28, [80, 74, 62, 70]),
      row('aws', 'AWS', 69, 'developing', 75, 31, [78, 66, 58, 70]),
      row('cicd', 'CI/CD', 76, 'solid', 75, 24, [84, 77, 68, 74]),
      row('linux', 'Linux', 71, 'solid', 70, 22, [79, 70, 63, 72]),
      row('observability', 'Observability', 58, 'developing', 70, 15, [70, 55, null, 52]),
      row('networking', 'Networking', 45, 'weak', 70, 18, [60, 41, 33, 46]),
      row('security', 'Security / IAM', 48, 'weak', 70, 14, [58, 44, 38, 50]),
      row('containers', 'Docker', 77, 'solid', 70, 19, [85, 78, 68, 75]),
      row('ansible', 'Ansible', 54, 'developing', 60, 7, [66, 50, null, 49]),
      row('gitops', 'GitOps', 41, 'weak', 65, 5, [57, null, null, 33]),
    ],
    weakestSkills: [
      {
        skillId: 'gitops',
        label: 'GitOps',
        score: 41,
        target: 65,
        band: 'weak',
        reason: 'No hands-on or troubleshooting evidence yet.',
        action: { label: 'Start a GitOps lab', module: 'labs' },
      },
      {
        skillId: 'networking',
        label: 'Networking',
        score: 45,
        target: 70,
        band: 'weak',
        reason: 'Troubleshooting score is 33 across 18 events.',
        action: { label: 'Run a networking incident', module: 'incidents' },
      },
      {
        skillId: 'security',
        label: 'Security / IAM',
        score: 48,
        target: 70,
        band: 'weak',
        reason: 'Answers name tools without a threat model.',
        action: { label: 'Practice security questions', module: 'questions' },
      },
      {
        skillId: 'ansible',
        label: 'Ansible',
        score: 54,
        target: 60,
        band: 'developing',
        reason: 'Only 7 evidence events, none in troubleshooting.',
        action: { label: 'Review Ansible flashcards', module: 'flashcards' },
      },
      {
        skillId: 'observability',
        label: 'Observability',
        score: 58,
        target: 70,
        band: 'developing',
        reason: 'Alert design answers lack SLO reasoning.',
        action: { label: 'Open the SLO topic', module: 'knowledge' },
      },
    ],
    plan: {
      totalMinutes: 90,
      completedMinutes: 25,
      items: [
        {
          id: 'plan-1',
          kind: 'revision',
          title: 'Revise weak topics: IAM and secrets',
          minutes: 10,
          reason: 'Security is your lowest dimension.',
          status: 'done',
          module: 'knowledge',
        },
        {
          id: 'plan-2',
          kind: 'flashcards',
          title: '15 flashcards due for review',
          minutes: 15,
          reason: 'Spaced repetition queue: 15 cards due today.',
          status: 'done',
          module: 'flashcards',
        },
        {
          id: 'plan-3',
          kind: 'interview',
          title: '20 interview questions: security and networking',
          minutes: 20,
          reason: 'Closes the gap on the two weakest skills.',
          status: 'next',
          module: 'questions',
        },
        {
          id: 'plan-4',
          kind: 'troubleshooting',
          title: 'Troubleshoot: Kubernetes DNS failure',
          minutes: 20,
          reason: 'Slowest root-cause localisation this month.',
          status: 'todo',
          module: 'incidents',
        },
        {
          id: 'plan-5',
          kind: 'architecture',
          title: 'Architecture: add failure modes to your design',
          minutes: 15,
          reason: 'Failure modes scored 40 in the last review.',
          status: 'todo',
          module: 'architecture',
        },
        {
          id: 'plan-6',
          kind: 'verbal',
          title: 'Verbal practice: explain your RCA out loud',
          minutes: 10,
          reason: 'Communication has been flat for two weeks.',
          status: 'todo',
          module: 'interviewer',
        },
      ],
    },
    continueTraining: [
      {
        id: 'cont-arch',
        kind: 'architecture',
        title: 'Multi-region payments platform',
        detail: 'Stage 4 of 6: failure modes',
        progress: 62,
        lastActive: ago(26 * HOUR),
        module: 'architecture',
      },
      {
        id: 'cont-inc',
        kind: 'incident',
        title: 'Checkout latency spike (SEV2)',
        detail: 'Mitigated, root cause not yet confirmed',
        progress: 70,
        lastActive: ago(2 * DAY),
        module: 'incidents',
      },
      {
        id: 'cont-int',
        kind: 'interview',
        title: 'Mock interview: Senior SRE round',
        detail: 'Question 7 of 12',
        progress: 58,
        lastActive: ago(3 * DAY),
        module: 'interviewer',
      },
    ],
    recentEvidence: [
      {
        id: 'ev-1',
        at: ago(18 * MINUTE),
        mode: 'flashcards',
        subject: 'Kubernetes RBAC',
        outcome: 'pass',
        dimension: 'knowledge',
        impact: 0.4,
        note: '14 of 15 cards recalled.',
      },
      {
        id: 'ev-2',
        at: ago(52 * MINUTE),
        mode: 'interview',
        subject: 'Secrets rotation strategy',
        outcome: 'partial',
        dimension: 'security',
        impact: -0.6,
        note: 'No mention of blast radius or audit trail.',
      },
      {
        id: 'ev-3',
        at: ago(26 * HOUR),
        mode: 'incident',
        subject: 'Checkout latency spike',
        outcome: 'partial',
        dimension: 'incident-response',
        impact: 0.5,
        note: 'Mitigated in 14 min; root cause not confirmed.',
      },
      {
        id: 'ev-4',
        at: ago(2 * DAY),
        mode: 'lab',
        subject: 'Terraform remote state migration',
        outcome: 'pass',
        dimension: 'hands-on',
        impact: 1.2,
        note: 'State locked and migrated without drift.',
      },
      {
        id: 'ev-5',
        at: ago(3 * DAY),
        mode: 'interview',
        subject: 'Explain a rolling deployment',
        outcome: 'pass',
        dimension: 'communication',
        impact: 0.3,
        note: 'Clear structure, one hedge under follow-up.',
      },
      {
        id: 'ev-6',
        at: ago(4 * DAY),
        mode: 'incident',
        subject: 'Pod DNS resolution failing',
        outcome: 'fail',
        dimension: 'troubleshooting',
        impact: -1.1,
        note: 'Reached CoreDNS after 19 min (target 8).',
      },
    ],
    recentIncidents: [
      {
        id: 'inc-1',
        title: 'Checkout latency spike',
        severity: 'SEV2',
        outcome: 'partial',
        minutesToMitigate: 14,
        rootCauseFound: false,
        at: ago(26 * HOUR),
      },
      {
        id: 'inc-2',
        title: 'Pod DNS resolution failing',
        severity: 'SEV2',
        outcome: 'failed',
        minutesToMitigate: null,
        rootCauseFound: false,
        at: ago(4 * DAY),
      },
      {
        id: 'inc-3',
        title: 'Expired TLS certificate on ingress',
        severity: 'SEV3',
        outcome: 'resolved',
        minutesToMitigate: 9,
        rootCauseFound: true,
        at: ago(6 * DAY),
      },
      {
        id: 'inc-4',
        title: 'Terraform apply wiped a security group',
        severity: 'SEV1',
        outcome: 'resolved',
        minutesToMitigate: 22,
        rootCauseFound: true,
        at: ago(9 * DAY),
      },
    ],
    architecture: {
      scenariosCompleted: 3,
      scenariosTotal: 8,
      current: { title: 'Multi-region payments platform', stageProgress: 62 },
      stages: [
        { id: 'req', label: 'Requirements', status: 'done' },
        { id: 'hld', label: 'High-level design', status: 'done' },
        { id: 'data', label: 'Data and state', status: 'done' },
        { id: 'fail', label: 'Failure modes', status: 'current' },
        { id: 'sec', label: 'Security', status: 'todo' },
        { id: 'cost', label: 'Cost and ops', status: 'todo' },
      ],
      rubric: [
        { id: 'scal', label: 'Scalability', score: 72, target: 75, band: 'solid' },
        { id: 'rel', label: 'Reliability', score: 58, target: 75, band: 'developing' },
        { id: 'fail', label: 'Failure modes', score: 40, target: 70, band: 'weak' },
        { id: 'cost', label: 'Cost', score: 45, target: 65, band: 'weak' },
      ],
    },
    nextAction: {
      title: '20 security and networking questions',
      why: 'Security and networking are your two weakest skills and the most likely place a Senior interview ends early. Questions are the fastest way to turn them into evidence.',
      estimatedMinutes: 20,
      expectedImpact: 'Security +3 to +5 points',
      module: 'questions',
    },
  }
}

function row(
  id: string,
  label: string,
  overall: number,
  band: CommandCenterSnapshot['skills'][number]['band'],
  target: number,
  evidenceCount: number,
  scores: (number | null)[],
): CommandCenterSnapshot['skills'][number] {
  const modes = ['knowledge', 'hands-on', 'troubleshooting', 'interview'] as const
  return {
    id,
    label,
    overall,
    band,
    target,
    evidenceCount,
    cells: modes.map((mode, i) => {
      const score = scores[i] ?? null
      return { mode, score, band: score === null ? null : bandFor(score) }
    }),
  }
}

/** Fixture-only banding so sample cells look plausible; the real engine supplies bands. */
function bandFor(score: number): NonNullable<CommandCenterSnapshot['skills'][number]['band']> {
  if (score < 40) return 'critical'
  if (score < 55) return 'weak'
  if (score < 70) return 'developing'
  if (score < 85) return 'solid'
  return 'strong'
}
