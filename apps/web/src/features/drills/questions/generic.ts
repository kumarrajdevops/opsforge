import type {
  AnswerSignalId,
  ConceptSpec,
  InterrogationCategory,
  InterviewRoundKind,
} from '@opsforge/types'
import { concept } from '../../interviewer/bank/author'

/** label, rubric terms, neutral probe, weight */
export type ConceptRow = [label: string, terms: string[], probe: string, weight?: 1 | 2 | 3]

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function conceptsFrom(category: InterrogationCategory, rows: ConceptRow[]): ConceptSpec[] {
  return rows.map(([label, terms, probe, weight]) =>
    concept(
      `${category}-${slug(label)}`,
      label,
      `Be able to explain: ${label.charAt(0).toLowerCase()}${label.slice(1)}.`,
      terms,
      probe,
      { w: weight ?? 2, kind: category === 'trade-offs' ? 'tradeoff' : 'core' },
    ),
  )
}

export interface CategoryDefinition {
  label: string
  /** One line shown on the category chip. */
  blurb: string
  round: InterviewRoundKind
  signals: AnswerSignalId[]
  /** Question tail for a claim about `subject` (a technology label or "this work"). */
  prompt: (subject: string) => string
  intent: (subject: string) => string
  /** Rubric used when no technology pack covers the claim. Technology-neutral on purpose. */
  generic: ConceptRow[]
}

export const CATEGORY_ORDER: InterrogationCategory[] = [
  'architecture',
  'networking',
  'security',
  'observability',
  'troubleshooting',
  'trade-offs',
  'incidents',
  'leadership',
]

export const CATEGORIES: Record<InterrogationCategory, CategoryDefinition> = {
  architecture: {
    label: 'Architecture',
    blurb: 'How it was put together, and why',
    round: 'architecture',
    signals: ['requirements', 'failure-modes', 'scalability', 'tradeoff'],
    prompt: (s) =>
      `Draw the architecture behind that for me: the main components of ${s}, how they fit together, how it scaled and where it could fail, and why it was shaped that way.`,
    intent: (s) =>
      `Checks the candidate can explain the design behind ${s}, not just that they used it.`,
    generic: [
      [
        'Components and how they connect',
        [
          'component',
          'service',
          'layer',
          'database',
          'queue',
          'load balancer',
          'api',
          'flow',
          'diagram',
        ],
        'Which pieces were involved, and how did they talk to each other?',
        3,
      ],
      [
        'Scaling approach',
        ['scale', 'scaling', 'autoscal', 'horizontal', 'capacity', 'load', 'throughput', 'replica'],
        'What happens to this design when load grows tenfold?',
        2,
      ],
      [
        'Failure modes and resilience',
        [
          'failure',
          'failover',
          'redundan',
          'availability zone',
          'replica',
          'single point',
          'degrade',
          'retry',
          'backup',
        ],
        'What was the first thing that would break, and what happens then?',
        3,
      ],
      [
        'Requirements that drove the design',
        [
          'requirement',
          'constraint',
          'sla',
          'slo',
          'budget',
          'deadline',
          'compliance',
          'because',
          'needed to',
        ],
        'What constraints shaped this design?',
        2,
      ],
      [
        'Environments and delivery',
        ['environment', 'staging', 'production', 'pipeline', 'deploy', 'rollout', 'release'],
        'How did a change get from a laptop to production?',
        1,
      ],
    ],
  },
  networking: {
    label: 'Networking',
    blurb: 'Traffic paths, names, ports and boundaries',
    round: 'technical',
    signals: ['structured', 'example'],
    prompt: (s) =>
      `Trace a request through the networking behind ${s}. How does traffic reach it, what names, addresses and ports are involved, and where could it be blocked or slowed down?`,
    intent: (s) =>
      `Checks the candidate understands the network path around ${s}, which is where most production faults hide.`,
    generic: [
      [
        'End-to-end request path',
        [
          'dns',
          'load balancer',
          'proxy',
          'gateway',
          'route',
          'hop',
          'ingress',
          'request path',
          'client',
        ],
        'Take one request from the client to the workload. What does it pass through?',
        3,
      ],
      [
        'Names and discovery',
        ['dns', 'service discovery', 'record', 'hostname', 'resolve', 'ttl', 'private zone'],
        'How did one component find another?',
        2,
      ],
      [
        'Ports, protocols and TLS',
        ['port', 'tcp', 'udp', 'http', 'https', 'tls', 'certificate', 'protocol', 'grpc'],
        'What protocols and ports were in play, and who terminated encryption?',
        2,
      ],
      [
        'Segmentation and access rules',
        [
          'security group',
          'firewall',
          'subnet',
          'vpc',
          'network policy',
          'acl',
          'private',
          'public',
          'cidr',
          'segment',
        ],
        'What stopped something from reaching what it should not?',
        3,
      ],
      [
        'Latency, timeouts and debugging tools',
        [
          'latency',
          'timeout',
          'retry',
          'packet',
          'traceroute',
          'tcpdump',
          'curl',
          'dig',
          'mtu',
          'connection',
        ],
        'If it were slow, how would you tell where the time went?',
        2,
      ],
    ],
  },
  security: {
    label: 'Security',
    blurb: 'Risks, controls and least privilege',
    round: 'technical',
    signals: ['security', 'tradeoff'],
    prompt: (s) =>
      `What were the security risks around ${s} in that work, and what specifically did you put in place to contain them?`,
    intent: (s) =>
      `Checks the candidate treats ${s} as an attack surface and can name concrete controls, not generic advice.`,
    generic: [
      [
        'Least privilege and access control',
        [
          'least privilege',
          'iam',
          'rbac',
          'role',
          'permission',
          'access control',
          'mfa',
          'service account',
        ],
        'Who and what had access, and how narrow was it?',
        3,
      ],
      [
        'Secrets handling',
        ['secret', 'vault', 'kms', 'rotation', 'rotate', 'credential', 'token', 'encrypt'],
        'Where did credentials live and how were they rotated?',
        3,
      ],
      [
        'Exposure and attack surface',
        [
          'exposure',
          'public',
          'private',
          'attack surface',
          'firewall',
          'internet-facing',
          'port',
          'segment',
          'endpoint',
        ],
        'What was reachable from outside, and why?',
        2,
      ],
      [
        'Supply chain and patching',
        [
          'patch',
          'vulnerab',
          'scan',
          'cve',
          'dependency',
          'image',
          'sbom',
          'signed',
          'update',
          'supply chain',
        ],
        'How did you find out something you ran was vulnerable?',
        2,
      ],
      [
        'Audit and detection',
        ['audit', 'log', 'cloudtrail', 'detect', 'alert', 'compliance', 'siem', 'trace'],
        'How would you know if something went wrong or someone misused access?',
        2,
      ],
    ],
  },
  observability: {
    label: 'Observability',
    blurb: 'Knowing it is healthy, and finding out when it is not',
    round: 'technical',
    signals: ['observability', 'metric'],
    prompt: (s) =>
      `How did you know ${s} was healthy in production? What did you measure, what alerted, and who got paged when it was not?`,
    intent: (s) =>
      `Checks the candidate operated ${s} with signals and alerts, rather than finding out from users.`,
    generic: [
      [
        'Service-level indicators and objectives',
        [
          'sli',
          'slo',
          'error rate',
          'latency',
          'availability',
          'golden signal',
          'saturation',
          'error budget',
        ],
        'What single number told you it was working?',
        3,
      ],
      [
        'Metrics and dashboards',
        [
          'metric',
          'dashboard',
          'grafana',
          'prometheus',
          'datadog',
          'cloudwatch',
          'graph',
          'counter',
        ],
        'What did you look at first when something felt off?',
        2,
      ],
      [
        'Logs and traces',
        [
          'log',
          'trace',
          'tracing',
          'opentelemetry',
          'correlation',
          'structured',
          'elk',
          'loki',
          'span',
        ],
        'How would you follow one failing request through the system?',
        2,
      ],
      [
        'Alert design and routing',
        [
          'alert',
          'page',
          'pager',
          'threshold',
          'on-call',
          'noise',
          'runbook',
          'burn rate',
          'severity',
        ],
        'Which alerts woke people up, and which did not?',
        3,
      ],
      [
        'Capacity and trends',
        ['capacity', 'trend', 'forecast', 'saturation', 'headroom', 'usage', 'cost'],
        'How did you see a problem coming before it hit?',
        1,
      ],
    ],
  },
  troubleshooting: {
    label: 'Troubleshooting',
    blurb: 'Finding the cause under uncertainty',
    round: 'troubleshooting',
    signals: ['scope-first', 'hypothesis', 'verification'],
    prompt: (s) =>
      `Something that depends on ${s} stops working and nobody knows why. Walk me through how you would find the cause, step by step.`,
    intent: (s) =>
      `Checks for a method when ${s} misbehaves: scope first, evidence over guesses, verify the fix.`,
    generic: [
      [
        'Scoping the problem first',
        [
          'scope',
          'blast radius',
          'who is affected',
          'what changed',
          'recent change',
          'started',
          'impact',
          'reproduce',
        ],
        'Before touching anything, what do you want to know?',
        3,
      ],
      [
        'Forming and testing hypotheses',
        ['hypothesis', 'suspect', 'rule out', 'narrow', 'bisect', 'compare', 'isolate', 'likely'],
        'How do you decide what to check next?',
        3,
      ],
      [
        'Evidence and tooling',
        [
          'log',
          'metric',
          'trace',
          'dashboard',
          'describe',
          'inspect',
          'curl',
          'strace',
          'tcpdump',
          'events',
        ],
        'What would you actually look at, and what would it tell you?',
        2,
      ],
      [
        'Mitigating before fully understanding',
        [
          'mitigate',
          'rollback',
          'roll back',
          'restart',
          'failover',
          'workaround',
          'revert',
          'scale up',
        ],
        'What if users are still affected while you investigate?',
        2,
      ],
      [
        'Verifying the fix',
        ['verify', 'confirm', 'monitor', 'recovered', 'regression', 'test', 'validate'],
        'How do you know it is really fixed?',
        2,
      ],
    ],
  },
  'trade-offs': {
    label: 'Trade-offs',
    blurb: 'What else was possible, and what it cost',
    round: 'architecture',
    signals: ['tradeoff', 'cost'],
    prompt: (s) =>
      `What alternatives to ${s}, or to how you used it, did you weigh? What did your choice cost you, and when would you choose differently?`,
    intent: (s) => `Checks the candidate chose ${s} deliberately and can say what was given up.`,
    generic: [
      [
        'Real alternatives considered',
        [
          'alternative',
          'instead of',
          'considered',
          'compared',
          'evaluated',
          'versus',
          'vs',
          'rather than',
          'option',
        ],
        'What else was on the table?',
        3,
      ],
      [
        'Costs and downsides accepted',
        [
          'downside',
          'cost',
          'drawback',
          'limitation',
          'overhead',
          'complexity',
          'lock-in',
          'lock in',
          'give up',
          'gave up',
        ],
        'What did this choice make worse?',
        3,
      ],
      [
        'Decision criteria',
        [
          'criteria',
          'because',
          'requirement',
          'team size',
          'skills',
          'budget',
          'time',
          'risk',
          'priority',
        ],
        'What tipped the decision?',
        2,
      ],
      [
        'Reversibility',
        [
          'reversib',
          'migrate away',
          'exit',
          'rollback',
          'later',
          'revisit',
          'phase',
          'incremental',
        ],
        'How hard would it be to undo?',
        2,
      ],
      [
        'When to choose differently',
        [
          'would change',
          'if the',
          'at larger scale',
          'smaller team',
          'next time',
          'today i',
          'no longer',
        ],
        'Under what conditions would you have gone the other way?',
        2,
      ],
    ],
  },
  incidents: {
    label: 'Incidents',
    blurb: 'Detection, mitigation, comms and prevention',
    round: 'troubleshooting',
    signals: ['mitigation', 'communication-plan', 'prevention', 'scope-first'],
    prompt: (s) =>
      `Tell me about an incident involving ${s}, from your own experience or the worst one you can realistically imagine: how it was detected, mitigated, communicated and prevented from happening again.`,
    intent: (s) =>
      `Checks the candidate has operated ${s} through failure, with mitigation first and a real prevention loop.`,
    generic: [
      [
        'Detection and impact',
        [
          'detected',
          'alert',
          'paged',
          'noticed',
          'customers',
          'impact',
          'error rate',
          'reported',
          'monitor',
        ],
        'How did you find out, and how bad was it?',
        2,
      ],
      [
        'Mitigation before root cause',
        [
          'mitigate',
          'rollback',
          'roll back',
          'failover',
          'restore',
          'workaround',
          'revert',
          'stop the bleeding',
        ],
        'What did you do first to stop the damage?',
        3,
      ],
      [
        'Root cause',
        [
          'root cause',
          'cause',
          'turned out',
          'contributing factor',
          'trigger',
          'because',
          'misconfig',
        ],
        'What was it really, once you got to the bottom?',
        2,
      ],
      [
        'Communication during the incident',
        [
          'communicat',
          'stakeholder',
          'status page',
          'incident commander',
          'update',
          'war room',
          'customers were told',
          'escalat',
        ],
        'Who needed to know, and how did they find out?',
        2,
      ],
      [
        'Prevention and follow-up',
        [
          'postmortem',
          'post-mortem',
          'blameless',
          'action item',
          'prevent',
          'guardrail',
          'runbook',
          'follow-up',
          'lesson',
        ],
        'What changed afterwards so it could not repeat?',
        3,
      ],
    ],
  },
  leadership: {
    label: 'Leadership',
    blurb: 'Influence, ownership and bringing people with you',
    round: 'behavioral',
    signals: ['situation', 'action', 'result', 'ownership', 'reflection'],
    prompt: (s) =>
      `Who else had to agree or change for ${s} to succeed, and how did you bring them along? What did you do for the people around you, and what would you handle differently?`,
    intent: (s) => `Checks the candidate drove ${s} through people and not only through tooling.`,
    generic: [
      [
        'Stakeholders and buy-in',
        [
          'stakeholder',
          'buy-in',
          'convince',
          'persuade',
          'alignment',
          'sponsor',
          'management',
          'product',
          'agree',
        ],
        'Who needed convincing, and how did you do it?',
        3,
      ],
      [
        'Personal ownership and decisions',
        [
          'i decided',
          'i led',
          'i owned',
          'i drove',
          'i proposed',
          'my decision',
          'i took',
          'i set',
        ],
        'Which calls were yours to make?',
        3,
      ],
      [
        'Growing others',
        [
          'mentor',
          'coach',
          'onboard',
          'taught',
          'documentation',
          'pairing',
          'training',
          'review',
          'enable',
        ],
        'How did the team get better at this because of you?',
        2,
      ],
      [
        'Conflict and disagreement',
        [
          'disagree',
          'conflict',
          'pushback',
          'compromise',
          'objection',
          'resistance',
          'trade-off',
          'escalate',
        ],
        'Where did people disagree with you?',
        2,
      ],
      [
        'Outcome and reflection',
        [
          'result',
          'outcome',
          'measured',
          'learned',
          'differently',
          'lesson',
          'improved',
          'reduced',
        ],
        'What was the result, and what would you change?',
        2,
      ],
    ],
  },
}
