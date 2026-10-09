import { compileTerm } from '../interviewer/analysis/text'
import INVENTORY from './inventory.json'
import { buildInventoryCatalog, type InventoryRow } from './inventory'

export type TechnologyCategory =
  | 'cloud'
  | 'iac'
  | 'containers'
  | 'orchestration'
  | 'delivery'
  | 'source-control'
  | 'artifacts'
  | 'observability'
  | 'security'
  | 'platform'
  | 'data'
  | 'language'
  | 'practice'
  | 'identity'
  | 'testing'
  | 'itsm'
  | 'finops'
  | 'collaboration'
  | 'automation'
  | 'ai'

export interface Technology {
  id: string
  label: string
  category: TechnologyCategory
  /**
   * A concept (CI/CD, SRE, observability) is something a posting asks for but not a product. It is
   * assessed as a requirement but never listed as a tool.
   */
  concept?: true
  /**
   * Spellings that identify it in free text. Matched on word starts, case-insensitively; a trailing
   * "!" requires a whole word, a leading "=" a case-sensitive whole word. Services of a cloud
   * platform belong to the platform, never on their own.
   */
  aliases: string[]
  /** Interview-bank topic used for question grouping. */
  topic: string
  /** Other catalog ids whose evidence also counts, loosely, towards this one. */
  related?: string[]
  /** Official website and documentation, when the shared inventory provides them. */
  links?: { website: string; docs: string }
}

const CURATED: Technology[] = [
  // Cloud platforms: every service belongs to its platform.
  {
    id: 'aws',
    label: 'AWS',
    category: 'cloud',
    aliases: [
      'aws',
      'amazon web services',
      'ec2',
      's3',
      'lambda',
      'cloudwatch',
      'cloud watch',
      'cloudtrail',
      'cloud trail',
      'sns',
      'ecs',
      'eks',
      'ecr',
      'fargate',
      'rds',
      'aurora',
      'dynamodb',
      'sqs',
      'route 53',
      'route53',
      'cloudfront',
      'codepipeline',
      'codebuild',
      'codedeploy',
      'secrets manager',
    ],
    topic: 'aws',
  },
  {
    id: 'azure',
    label: 'Azure',
    category: 'cloud',
    aliases: ['azure', 'aks', 'entra', 'blob storage'],
    topic: 'architecture',
    related: ['aws'],
  },
  {
    id: 'gcp',
    label: 'GCP',
    category: 'cloud',
    aliases: [
      'gcp',
      'google cloud',
      'gke',
      'pub/sub',
      'pub sub',
      'bigquery',
      'cloud run',
      'operations suite',
      'stackdriver',
    ],
    topic: 'architecture',
    related: ['aws'],
  },

  // Infrastructure as code and configuration management: distinct products stay separate.
  {
    id: 'terraform',
    label: 'Terraform',
    category: 'iac',
    aliases: ['terraform', 'opentofu', 'terragrunt'],
    topic: 'terraform',
  },
  {
    id: 'pulumi',
    label: 'Pulumi',
    category: 'iac',
    aliases: ['pulumi'],
    topic: 'terraform',
    related: ['terraform'],
  },
  {
    id: 'cloudformation',
    label: 'CloudFormation',
    category: 'iac',
    aliases: ['cloudformation', 'cloud formation'],
    topic: 'terraform',
    related: ['terraform'],
  },
  {
    id: 'arm-templates',
    label: 'ARM Templates',
    category: 'iac',
    aliases: ['arm template', 'bicep'],
    topic: 'terraform',
    related: ['terraform'],
  },
  {
    id: 'deployment-manager',
    label: 'Deployment Manager',
    category: 'iac',
    aliases: ['deployment manager'],
    topic: 'terraform',
    related: ['terraform'],
  },
  {
    id: 'ansible',
    label: 'Ansible',
    category: 'iac',
    aliases: ['ansible'],
    topic: 'terraform',
    related: ['terraform'],
  },
  {
    id: 'chef',
    label: 'Chef',
    category: 'iac',
    aliases: ['chef'],
    topic: 'terraform',
    related: ['ansible'],
  },
  {
    id: 'puppet',
    label: 'Puppet',
    category: 'iac',
    aliases: ['puppet'],
    topic: 'terraform',
    related: ['ansible'],
  },

  // Containers and orchestration.
  {
    id: 'docker',
    label: 'Docker',
    category: 'containers',
    aliases: ['docker', 'dockerfile'],
    topic: 'containers',
  },
  {
    id: 'podman',
    label: 'Podman',
    category: 'containers',
    aliases: ['podman'],
    topic: 'containers',
    related: ['docker'],
  },
  {
    id: 'kubernetes',
    label: 'Kubernetes',
    category: 'orchestration',
    aliases: ['kubernetes', 'k8s', 'kubectl'],
    topic: 'kubernetes',
    related: ['docker'],
  },
  {
    id: 'helm',
    label: 'Helm',
    category: 'orchestration',
    aliases: ['helm'],
    topic: 'kubernetes',
    related: ['kubernetes'],
  },
  {
    id: 'openshift',
    label: 'OpenShift',
    category: 'orchestration',
    aliases: ['openshift'],
    topic: 'kubernetes',
    related: ['kubernetes'],
  },

  // CI/CD, GitOps and version control.
  {
    id: 'jenkins',
    label: 'Jenkins',
    category: 'delivery',
    aliases: ['jenkins'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'github-actions',
    label: 'GitHub Actions',
    category: 'delivery',
    aliases: ['ghactions'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'gitlab',
    label: 'GitLab CI/CD',
    category: 'delivery',
    aliases: ['gitlab'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'circleci',
    label: 'CircleCI',
    category: 'delivery',
    aliases: ['circleci'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'bamboo',
    label: 'Bamboo',
    category: 'delivery',
    aliases: ['bamboo'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'travis-ci',
    label: 'Travis CI',
    category: 'delivery',
    aliases: ['travis ci', 'travisci'],
    topic: 'ci-cd',
    related: ['ci-cd'],
  },
  {
    id: 'argocd',
    label: 'Argo CD',
    category: 'delivery',
    aliases: ['argocd', 'argo cd'],
    topic: 'gitops',
    related: ['ci-cd', 'kubernetes'],
  },
  {
    id: 'flux',
    label: 'Flux CD',
    category: 'delivery',
    aliases: ['fluxcd', 'flux cd'],
    topic: 'gitops',
    related: ['argocd', 'kubernetes'],
  },
  {
    id: 'git',
    label: 'Git',
    category: 'source-control',
    aliases: ['git'],
    topic: 'ci-cd',
  },
  {
    id: 'github',
    label: 'GitHub',
    category: 'source-control',
    aliases: ['github'],
    topic: 'ci-cd',
    related: ['git'],
  },
  {
    id: 'bitbucket',
    label: 'Bitbucket',
    category: 'source-control',
    aliases: ['bitbucket'],
    topic: 'ci-cd',
    related: ['git'],
  },
  {
    id: 'nexus',
    label: 'Nexus Repository',
    category: 'artifacts',
    aliases: ['nexus'],
    topic: 'ci-cd',
  },
  {
    id: 'artifactory',
    label: 'JFrog Artifactory',
    category: 'artifacts',
    aliases: ['artifactory', 'jfrog'],
    topic: 'ci-cd',
  },

  // Monitoring, logging and observability: distinct products stay separate; a suite is one entry.
  {
    id: 'prometheus',
    label: 'Prometheus',
    category: 'observability',
    aliases: ['prometheus', 'alertmanager', 'promql'],
    topic: 'observability',
    related: ['grafana', 'observability'],
  },
  {
    id: 'grafana',
    label: 'Grafana',
    category: 'observability',
    aliases: ['grafana', 'loki', 'tempo'],
    topic: 'observability',
    related: ['prometheus', 'observability'],
  },
  {
    id: 'datadog',
    label: 'Datadog',
    category: 'observability',
    aliases: ['datadog'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'new-relic',
    label: 'New Relic',
    category: 'observability',
    aliases: ['new relic', 'newrelic'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'dynatrace',
    label: 'Dynatrace',
    category: 'observability',
    aliases: ['dynatrace'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'splunk',
    label: 'Splunk',
    category: 'observability',
    aliases: ['splunk'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'elk',
    label: 'Elastic Stack (ELK)',
    category: 'observability',
    aliases: ['elk', 'elastic stack', 'elasticsearch', 'logstash', 'kibana', 'opensearch'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'opentelemetry',
    label: 'OpenTelemetry',
    category: 'observability',
    aliases: ['opentelemetry', 'open telemetry', 'otel'],
    topic: 'observability',
    related: ['observability'],
  },
  {
    id: 'jaeger',
    label: 'Jaeger',
    category: 'observability',
    aliases: ['jaeger'],
    topic: 'observability',
    related: ['opentelemetry'],
  },
  {
    id: 'kiali',
    label: 'Kiali',
    category: 'observability',
    aliases: ['kiali'],
    topic: 'observability',
    related: ['istio'],
  },
  {
    id: 'fluentd',
    label: 'Fluentd',
    category: 'observability',
    aliases: ['fluentd', 'fluent bit', 'fluentbit'],
    topic: 'observability',
    related: ['elk'],
  },
  {
    id: 'pagerduty',
    label: 'PagerDuty',
    category: 'observability',
    aliases: ['pagerduty', 'opsgenie'],
    topic: 'sre',
    related: ['sre'],
  },

  // Security tooling.
  {
    id: 'vault',
    label: 'HashiCorp Vault',
    category: 'security',
    aliases: ['hashicorp vault', 'vault'],
    topic: 'security',
  },
  {
    id: 'sonarqube',
    label: 'SonarQube',
    category: 'security',
    aliases: ['sonarqube'],
    topic: 'security',
    related: ['devsecops'],
  },
  {
    id: 'snyk',
    label: 'Snyk',
    category: 'security',
    aliases: ['snyk'],
    topic: 'security',
    related: ['devsecops'],
  },
  {
    id: 'trivy',
    label: 'Trivy',
    category: 'security',
    aliases: ['trivy'],
    topic: 'security',
    related: ['devsecops'],
  },

  // Operating system, scripting and named network technologies.
  {
    id: 'linux',
    label: 'Linux',
    category: 'platform',
    aliases: ['linux', 'unix'],
    topic: 'linux',
  },
  {
    id: 'bash',
    label: 'Bash / shell scripting',
    category: 'language',
    aliases: ['bash', 'shell scripting', 'shell script', 'shell!'],
    topic: 'linux',
    related: ['linux'],
  },
  {
    id: 'python',
    label: 'Python',
    category: 'language',
    aliases: ['python'],
    topic: 'ci-cd',
  },
  {
    id: 'go',
    label: 'Go',
    category: 'language',
    aliases: ['golang', 'go lang', '=GO'],
    topic: 'ci-cd',
  },
  {
    id: 'groovy',
    label: 'Groovy',
    category: 'language',
    aliases: ['groovy'],
    topic: 'ci-cd',
    related: ['jenkins'],
  },
  {
    id: 'powershell',
    label: 'PowerShell',
    category: 'language',
    aliases: ['powershell'],
    topic: 'linux',
  },
  {
    id: 'nginx',
    label: 'NGINX',
    category: 'platform',
    aliases: ['nginx'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'haproxy',
    label: 'HAProxy',
    category: 'platform',
    aliases: ['haproxy'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'dns',
    label: 'DNS',
    category: 'platform',
    aliases: ['dns'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'app-servers',
    label: 'Application servers',
    category: 'platform',
    aliases: ['application server', 'app server'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'load-balancer',
    label: 'Load balancers',
    category: 'platform',
    aliases: ['load balanc'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'firewall',
    label: 'Firewalls',
    category: 'platform',
    aliases: ['firewall'],
    topic: 'networking',
    related: ['networking'],
  },
  {
    id: 'istio',
    label: 'Istio',
    category: 'platform',
    aliases: ['istio'],
    topic: 'kubernetes',
    related: ['service-mesh', 'kubernetes'],
  },
  {
    id: 'linkerd',
    label: 'Linkerd',
    category: 'platform',
    aliases: ['linkerd'],
    topic: 'kubernetes',
    related: ['service-mesh', 'kubernetes'],
  },
  {
    id: 'envoy',
    label: 'Envoy',
    category: 'platform',
    aliases: ['envoy'],
    topic: 'kubernetes',
    related: ['service-mesh', 'kubernetes'],
  },

  // Data stores and messaging.
  {
    id: 'postgres',
    label: 'PostgreSQL',
    category: 'data',
    aliases: ['postgres', 'postgresql'],
    topic: 'observability',
  },
  {
    id: 'mysql',
    label: 'MySQL',
    category: 'data',
    aliases: ['mysql', 'mariadb'],
    topic: 'observability',
    related: ['postgres'],
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    category: 'data',
    aliases: ['mongodb', 'mongo db'],
    topic: 'architecture',
  },
  {
    id: 'redis',
    label: 'Redis',
    category: 'data',
    aliases: ['redis'],
    topic: 'architecture',
  },
  {
    id: 'kafka',
    label: 'Kafka',
    category: 'data',
    aliases: ['kafka'],
    topic: 'architecture',
  },
  {
    id: 'rabbitmq',
    label: 'RabbitMQ',
    category: 'data',
    aliases: ['rabbitmq'],
    topic: 'architecture',
    related: ['kafka'],
  },

  // Concepts: assessed as requirements, never listed as tools.
  {
    id: 'ci-cd',
    label: 'CI/CD',
    category: 'delivery',
    concept: true,
    aliases: [
      'ci/cd',
      'cicd',
      'ci cd',
      'continuous delivery',
      'continuous integration',
      'continuous deployment',
      'pipelines',
    ],
    topic: 'ci-cd',
    related: [
      'jenkins',
      'github-actions',
      'gitlab',
      'circleci',
      'bamboo',
      'travis-ci',
      'argocd',
      'flux',
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    category: 'observability',
    concept: true,
    aliases: ['observability', 'monitoring', 'logging', 'tracing'],
    topic: 'observability',
    related: [
      'prometheus',
      'grafana',
      'datadog',
      'new-relic',
      'dynatrace',
      'splunk',
      'elk',
      'opentelemetry',
    ],
  },
  {
    id: 'networking',
    label: 'Networking',
    category: 'platform',
    concept: true,
    aliases: ['networking', 'tcp/ip', 'tls', 'cdn'],
    topic: 'networking',
  },
  {
    id: 'service-mesh',
    label: 'Service mesh',
    category: 'platform',
    concept: true,
    aliases: ['service mesh'],
    topic: 'kubernetes',
    related: ['kubernetes', 'networking'],
  },
  {
    id: 'devsecops',
    label: 'DevSecOps',
    category: 'security',
    concept: true,
    aliases: ['devsecops', 'sast', 'dast', 'owasp', 'vulnerability scanning', 'shift left'],
    topic: 'security',
    related: ['vault'],
  },
  {
    id: 'sre',
    label: 'SRE',
    category: 'practice',
    concept: true,
    aliases: [
      'sre',
      'site reliability',
      'slo',
      'sla',
      'incident response',
      'incident management',
      'on-call',
      'on call',
      'postmortem',
      'reliability',
    ],
    topic: 'sre',
  },
]

/** Question-bank tags that are not catalog spellings. */
const TAG_ALIASES: Record<string, string> = {
  containers: 'docker',
  iam: 'aws',
  vpc: 'aws',
  flux: 'flux',
}

/** Phrases rewritten before matching so a product is not mistaken for part of another. */
const MASKS: [RegExp, string][] = [
  [/\bkey[\s-]vault\b/gi, 'azure kv'],
  [/\bgithub[\s-]actions\b/gi, 'ghactions'],
  [/\bazure[\s-]active[\s-]directory\b/gi, 'azure entra'],
]

function normalise(text: string): string {
  return MASKS.reduce((out, [pattern, to]) => out.replace(pattern, to), text)
}

/** A literal spelling as a pattern: specials escaped, spaces and hyphens interchangeable. */
function literal(spelling: string): string {
  return spelling
    .split(/[\s-]+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[\\s-]+')
}

function compileAlias(alias: string): RegExp {
  // "=GO" is a case-sensitive whole word: "GO" in a tool list, never the verb "go".
  if (alias.startsWith('=')) {
    return new RegExp(`(?<![\\p{L}\\p{N}])${literal(alias.slice(1))}(?![\\p{L}\\p{N}])`, 'u')
  }
  if (!alias.endsWith('!')) return compileTerm(alias)
  return new RegExp(`(?<![\\p{L}\\p{N}])${literal(alias.slice(0, -1))}(?![\\p{L}\\p{N}])`, 'iu')
}

function compile(technologies: Technology[]) {
  return technologies.map((t) => ({ id: t.id, patterns: t.aliases.map(compileAlias) }))
}

const CURATED_MATCHERS = compile(CURATED)

const FIRST_TOPIC = new Map<TechnologyCategory, string>()
for (const t of CURATED) if (!FIRST_TOPIC.has(t.category)) FIRST_TOPIC.set(t.category, t.topic)

const inventory = buildInventoryCatalog(INVENTORY as InventoryRow[], {
  isCovered: (name) => {
    const subject = normalise(name)
    return CURATED_MATCHERS.some((m) => m.patterns.some((p) => p.test(subject)))
  },
  knownIds: CURATED.map((t) => t.id),
  topicFor: (category) => FIRST_TOPIC.get(category) ?? 'architecture',
})

/**
 * The curated entries (hand-checked spellings and relations) followed by every other tool in the
 * shared inventory workbook. Cloud-vendor services are spellings of their platform, not entries.
 */
export const TECHNOLOGIES: Technology[] = [
  ...CURATED.map((t) =>
    inventory.folded[t.id] ? { ...t, aliases: [...t.aliases, ...inventory.folded[t.id]!] } : t,
  ),
  ...inventory.entries,
]

const BY_ID = new Map(TECHNOLOGIES.map((t) => [t.id, t]))
const MATCHERS = compile(TECHNOLOGIES)

export function findTechnology(id: string): Technology | undefined {
  return BY_ID.get(id)
}

export function technologyLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id
}

export function technologyTopic(id: string): string {
  return BY_ID.get(id)?.topic ?? 'architecture'
}

/** True for a named product or language; false for a concept such as CI/CD or SRE. */
export function isTool(id: string): boolean {
  const technology = BY_ID.get(id)
  return technology !== undefined && !technology.concept
}

/** Catalog ids named in free text, in catalog order. */
export function technologiesIn(text: string): string[] {
  const subject = normalise(text)
  return MATCHERS.filter((m) => m.patterns.some((p) => p.test(subject))).map((m) => m.id)
}

/** How many times a technology is named in the text (any alias, each occurrence). */
export function countMentions(text: string, id: string): number {
  const matcher = MATCHERS.find((m) => m.id === id)
  if (!matcher) return 0
  const subject = normalise(text)
  let total = 0
  for (const pattern of matcher.patterns) {
    const global = new RegExp(
      pattern.source,
      pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
    )
    total += subject.match(global)?.length ?? 0
  }
  return total
}

/**
 * Maps a free tag (as used by the question bank, e.g. `opentelemetry`, `flux`) to a catalog id.
 * Returns undefined for tags that are not a recognised technology.
 */
export function canonicalTechnologyId(tag: string): string | undefined {
  if (BY_ID.has(tag)) return tag
  const alias = TAG_ALIASES[tag]
  if (alias) return alias
  const text = tag.replace(/-/g, ' ')
  return technologiesIn(text)[0]
}
