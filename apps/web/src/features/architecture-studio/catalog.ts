import type {
  CloudProvider,
  ComponentCategory,
  ComponentConfig,
  ComponentDefinition,
  ComponentTier,
  ComponentTrait,
  ConfigKey,
} from '@opsforge/types'

export const BASE_CONFIG: ComponentConfig = {
  replicas: 1,
  zones: 1,
  region: 'primary',
  autoscaling: false,
  exposure: 'private',
  encryptedAtRest: false,
  backups: false,
  readReplicas: 0,
  crossRegionReplication: false,
  failover: 'none',
  deadLetter: false,
  alerting: false,
  tracing: false,
  strategy: 'manual',
  automatedTests: false,
  leastPrivilege: false,
  rotation: false,
  tier: 'medium',
}

export const TIER_FACTORS: Record<ComponentTier, { cost: number; capacity: number }> = {
  small: { cost: 0.5, capacity: 0.4 },
  medium: { cost: 1, capacity: 1 },
  large: { cost: 2.2, capacity: 2.5 },
}

export const CATEGORY_ORDER: ComponentCategory[] = [
  'client',
  'dns',
  'cdn',
  'waf',
  'load-balancer',
  'compute',
  'kubernetes',
  'database',
  'cache',
  'queue',
  'kafka',
  'storage',
  'iam',
  'secrets',
  'monitoring',
  'cicd',
]

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  client: 'Clients',
  dns: 'DNS',
  cdn: 'CDN',
  waf: 'WAF',
  'load-balancer': 'Load balancing & gateways',
  compute: 'Compute',
  kubernetes: 'Kubernetes',
  database: 'Databases',
  cache: 'Cache',
  queue: 'Queues',
  kafka: 'Kafka & streaming',
  storage: 'Storage',
  iam: 'Identity & IAM',
  secrets: 'Secrets',
  monitoring: 'Monitoring',
  cicd: 'CI/CD',
}

/** Categories that serve requests and therefore have a throughput capacity. */
export const SERVING_CATEGORIES: ComponentCategory[] = ['compute', 'kubernetes']
/** Categories that hold state and are the first place a failure becomes data loss. */
export const STATEFUL_CATEGORIES: ComponentCategory[] = [
  'database',
  'cache',
  'queue',
  'kafka',
  'storage',
]
export const DATA_STORE_CATEGORIES: ComponentCategory[] = ['database', 'cache', 'queue', 'kafka']

export const CONFIG_LABELS: Record<ConfigKey, string> = {
  replicas: 'Replicas',
  zones: 'Availability zones',
  region: 'Region',
  autoscaling: 'Autoscaling',
  exposure: 'Network exposure',
  encryptedAtRest: 'Encrypted at rest',
  backups: 'Backups / versioning',
  readReplicas: 'Read replicas',
  crossRegionReplication: 'Cross-region replication',
  failover: 'Failover',
  deadLetter: 'Dead-letter handling',
  alerting: 'Alerting rules',
  tracing: 'Distributed tracing',
  strategy: 'Deploy strategy',
  automatedTests: 'Automated tests in pipeline',
  leastPrivilege: 'Least-privilege policies',
  rotation: 'Automatic rotation',
  tier: 'Size',
}

interface CategoryDef {
  properties: ConfigKey[]
  defaults: Partial<ComponentConfig>
  pricing: { base: number; unit: number; perRps: number }
}

const CATEGORY_DEFS: Record<ComponentCategory, CategoryDef> = {
  client: {
    properties: [],
    defaults: { region: 'global', zones: 3, exposure: 'public' },
    pricing: { base: 0, unit: 0, perRps: 0 },
  },
  dns: {
    properties: ['failover'],
    defaults: { region: 'global', zones: 3, exposure: 'public' },
    pricing: { base: 5, unit: 0, perRps: 0.002 },
  },
  cdn: {
    properties: [],
    defaults: { region: 'global', zones: 3, exposure: 'public' },
    pricing: { base: 40, unit: 0, perRps: 0.12 },
  },
  waf: {
    properties: [],
    defaults: { region: 'global', zones: 3, exposure: 'public' },
    pricing: { base: 30, unit: 0, perRps: 0.06 },
  },
  'load-balancer': {
    properties: ['region', 'zones', 'exposure'],
    defaults: { exposure: 'public' },
    pricing: { base: 25, unit: 0, perRps: 0.04 },
  },
  compute: {
    properties: ['region', 'replicas', 'zones', 'autoscaling', 'tier', 'exposure'],
    defaults: { replicas: 2 },
    pricing: { base: 0, unit: 70, perRps: 0 },
  },
  kubernetes: {
    properties: ['region', 'replicas', 'zones', 'autoscaling', 'tier', 'exposure'],
    defaults: { replicas: 3 },
    pricing: { base: 75, unit: 70, perRps: 0 },
  },
  database: {
    properties: [
      'region',
      'tier',
      'zones',
      'failover',
      'readReplicas',
      'backups',
      'encryptedAtRest',
      'crossRegionReplication',
      'exposure',
    ],
    defaults: {},
    pricing: { base: 0, unit: 280, perRps: 0 },
  },
  cache: {
    properties: ['region', 'tier', 'replicas', 'zones', 'encryptedAtRest', 'exposure'],
    defaults: {},
    pricing: { base: 0, unit: 120, perRps: 0 },
  },
  queue: {
    properties: ['region', 'deadLetter', 'encryptedAtRest', 'exposure'],
    defaults: { zones: 3 },
    pricing: { base: 5, unit: 0, perRps: 0.02 },
  },
  kafka: {
    properties: [
      'region',
      'tier',
      'replicas',
      'zones',
      'encryptedAtRest',
      'deadLetter',
      'exposure',
    ],
    defaults: { replicas: 3, zones: 3 },
    pricing: { base: 0, unit: 210, perRps: 0 },
  },
  storage: {
    properties: ['region', 'backups', 'encryptedAtRest', 'crossRegionReplication', 'exposure'],
    defaults: { zones: 3 },
    pricing: { base: 20, unit: 0, perRps: 0.01 },
  },
  iam: {
    properties: ['leastPrivilege'],
    defaults: { region: 'global', zones: 3 },
    pricing: { base: 0, unit: 0, perRps: 0 },
  },
  secrets: {
    properties: ['rotation'],
    defaults: { zones: 3 },
    pricing: { base: 10, unit: 0, perRps: 0.001 },
  },
  monitoring: {
    properties: ['alerting', 'tracing'],
    defaults: { region: 'global', zones: 3 },
    pricing: { base: 60, unit: 0, perRps: 0.01 },
  },
  cicd: {
    properties: ['strategy', 'automatedTests'],
    defaults: { region: 'global', zones: 3, strategy: 'manual' },
    pricing: { base: 40, unit: 0, perRps: 0 },
  },
}

interface Spec {
  id: string
  provider: CloudProvider
  category: ComponentCategory
  name: string
  summary: string
  traits?: ComponentTrait[]
  properties?: ConfigKey[]
  defaults?: Partial<ComponentConfig>
  rpsPerReplica?: number
  pricing?: Partial<{ base: number; unit: number; perRps: number }>
}

const SERVERLESS: Pick<Spec, 'traits' | 'properties' | 'defaults' | 'pricing'> = {
  traits: ['serverless', 'managed-ha'],
  properties: ['region', 'exposure'],
  defaults: { zones: 3, autoscaling: true, replicas: 1 },
  pricing: { base: 0, unit: 0, perRps: 0.9 },
}

const MANAGED_NOSQL: Pick<Spec, 'traits' | 'properties' | 'defaults' | 'pricing'> = {
  traits: ['managed-ha', 'horizontal-scale'],
  properties: ['region', 'backups', 'encryptedAtRest', 'crossRegionReplication', 'exposure'],
  defaults: { zones: 3, failover: 'automatic', encryptedAtRest: true },
  pricing: { base: 50, unit: 0, perRps: 0.35 },
}

const MANAGED_QUEUE: Pick<Spec, 'traits' | 'properties' | 'defaults'> = {
  traits: ['managed-ha'],
  properties: ['region', 'deadLetter', 'encryptedAtRest', 'exposure'],
  defaults: { zones: 3 },
}

const MANAGED_STORAGE: Pick<Spec, 'traits' | 'properties' | 'defaults'> = {
  traits: ['managed-ha'],
  properties: ['region', 'backups', 'encryptedAtRest', 'crossRegionReplication', 'exposure'],
  defaults: { zones: 3 },
}

const GLOBAL_EDGE: Pick<Spec, 'traits'> = { traits: ['managed-ha'] }

const SPECS: Spec[] = [
  // ── Generic ──
  {
    id: 'generic-client',
    provider: 'generic',
    category: 'client',
    name: 'Users / Clients',
    summary: 'Browsers, mobile apps and API consumers.',
  },
  {
    id: 'generic-dns',
    provider: 'generic',
    category: 'dns',
    name: 'DNS',
    summary: 'Authoritative DNS with optional health-checked routing.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-cdn',
    provider: 'generic',
    category: 'cdn',
    name: 'CDN',
    summary: 'Edge caching and TLS termination close to users.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-waf',
    provider: 'generic',
    category: 'waf',
    name: 'WAF',
    summary: 'Web application firewall in front of public endpoints.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-lb',
    provider: 'generic',
    category: 'load-balancer',
    name: 'Load balancer',
    summary: 'Layer 7 balancer with health checks.',
  },
  {
    id: 'generic-api-gateway',
    provider: 'generic',
    category: 'load-balancer',
    name: 'API gateway',
    summary: 'Routing, auth and throttling for APIs.',
  },
  {
    id: 'generic-service',
    provider: 'generic',
    category: 'compute',
    name: 'Service / VM group',
    summary: 'Stateless application service on virtual machines.',
    rpsPerReplica: 400,
  },
  {
    id: 'generic-function',
    provider: 'generic',
    category: 'compute',
    name: 'Serverless function',
    summary: 'Event or request driven function, scales to demand.',
    ...SERVERLESS,
    rpsPerReplica: 100000,
  },
  {
    id: 'generic-k8s',
    provider: 'generic',
    category: 'kubernetes',
    name: 'Kubernetes cluster',
    summary: 'Container orchestration for many services.',
    rpsPerReplica: 450,
  },
  {
    id: 'generic-sql',
    provider: 'generic',
    category: 'database',
    name: 'SQL database',
    summary: 'Relational database with a primary and optional replicas.',
    traits: ['relational'],
    rpsPerReplica: 2500,
  },
  {
    id: 'generic-nosql',
    provider: 'generic',
    category: 'database',
    name: 'NoSQL database',
    summary: 'Horizontally scalable key-value or document store.',
    traits: ['horizontal-scale'],
    rpsPerReplica: 8000,
  },
  {
    id: 'generic-cache',
    provider: 'generic',
    category: 'cache',
    name: 'Cache (Redis)',
    summary: 'In-memory cache for hot reads and sessions.',
  },
  {
    id: 'generic-queue',
    provider: 'generic',
    category: 'queue',
    name: 'Message queue',
    summary: 'Durable queue that decouples producers and consumers.',
  },
  {
    id: 'generic-kafka',
    provider: 'generic',
    category: 'kafka',
    name: 'Kafka cluster',
    summary: 'Partitioned event log; brokers are the replicas.',
  },
  {
    id: 'generic-object-store',
    provider: 'generic',
    category: 'storage',
    name: 'Object storage',
    summary: 'Durable blob and file storage.',
  },
  {
    id: 'generic-iam',
    provider: 'generic',
    category: 'iam',
    name: 'Identity provider',
    summary: 'Authentication, authorisation and workload identity.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-secrets',
    provider: 'generic',
    category: 'secrets',
    name: 'Secrets manager',
    summary: 'Central secret storage with rotation.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-monitoring',
    provider: 'generic',
    category: 'monitoring',
    name: 'Monitoring stack',
    summary: 'Metrics, logs, alerts and dashboards.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'generic-cicd',
    provider: 'generic',
    category: 'cicd',
    name: 'CI/CD pipeline',
    summary: 'Build, test and deploy automation.',
    ...GLOBAL_EDGE,
  },

  // ── AWS ──
  {
    id: 'aws-route53',
    provider: 'aws',
    category: 'dns',
    name: 'Route 53',
    summary: 'DNS with health checks and latency/failover routing.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-cloudfront',
    provider: 'aws',
    category: 'cdn',
    name: 'CloudFront',
    summary: 'Global CDN with edge caching.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-waf',
    provider: 'aws',
    category: 'waf',
    name: 'AWS WAF',
    summary: 'Managed rules for CloudFront, ALB and API Gateway.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-alb',
    provider: 'aws',
    category: 'load-balancer',
    name: 'Application Load Balancer',
    summary: 'Layer 7 balancer across zones.',
  },
  {
    id: 'aws-apigw',
    provider: 'aws',
    category: 'load-balancer',
    name: 'API Gateway',
    summary: 'Managed API front door for Lambda and HTTP backends.',
    traits: ['managed-ha'],
    defaults: { zones: 3 },
  },
  {
    id: 'aws-ec2-asg',
    provider: 'aws',
    category: 'compute',
    name: 'EC2 Auto Scaling group',
    summary: 'Virtual machines behind an Auto Scaling group.',
    rpsPerReplica: 400,
  },
  {
    id: 'aws-fargate',
    provider: 'aws',
    category: 'compute',
    name: 'ECS on Fargate',
    summary: 'Containers without managing servers.',
    rpsPerReplica: 350,
    pricing: { unit: 60 },
  },
  {
    id: 'aws-lambda',
    provider: 'aws',
    category: 'compute',
    name: 'Lambda',
    summary: 'Functions that scale with requests.',
    ...SERVERLESS,
    rpsPerReplica: 100000,
  },
  {
    id: 'aws-eks',
    provider: 'aws',
    category: 'kubernetes',
    name: 'EKS',
    summary: 'Managed Kubernetes control plane on AWS.',
    traits: ['managed-control-plane'],
    rpsPerReplica: 450,
    defaults: { zones: 2 },
  },
  {
    id: 'aws-rds',
    provider: 'aws',
    category: 'database',
    name: 'RDS / Aurora',
    summary: 'Managed relational database with Multi-AZ.',
    traits: ['relational'],
    rpsPerReplica: 3000,
  },
  {
    id: 'aws-dynamodb',
    provider: 'aws',
    category: 'database',
    name: 'DynamoDB',
    summary: 'Managed NoSQL with global tables.',
    ...MANAGED_NOSQL,
    rpsPerReplica: 20000,
  },
  {
    id: 'aws-elasticache',
    provider: 'aws',
    category: 'cache',
    name: 'ElastiCache',
    summary: 'Managed Redis or Memcached.',
  },
  {
    id: 'aws-sqs',
    provider: 'aws',
    category: 'queue',
    name: 'SQS',
    summary: 'Managed queue with dead-letter support.',
    ...MANAGED_QUEUE,
  },
  {
    id: 'aws-msk',
    provider: 'aws',
    category: 'kafka',
    name: 'MSK',
    summary: 'Managed Apache Kafka.',
    traits: ['managed-control-plane'],
  },
  {
    id: 'aws-s3',
    provider: 'aws',
    category: 'storage',
    name: 'S3',
    summary: 'Object storage with versioning and replication.',
    ...MANAGED_STORAGE,
  },
  {
    id: 'aws-iam',
    provider: 'aws',
    category: 'iam',
    name: 'IAM',
    summary: 'Roles, policies and workload identity.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-secrets-manager',
    provider: 'aws',
    category: 'secrets',
    name: 'Secrets Manager',
    summary: 'Secrets with managed rotation.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-cloudwatch',
    provider: 'aws',
    category: 'monitoring',
    name: 'CloudWatch',
    summary: 'Metrics, logs, alarms and X-Ray tracing.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'aws-codepipeline',
    provider: 'aws',
    category: 'cicd',
    name: 'CodePipeline',
    summary: 'Release pipelines with CodeBuild and CodeDeploy.',
    ...GLOBAL_EDGE,
  },

  // ── Azure ──
  {
    id: 'azure-traffic-manager',
    provider: 'azure',
    category: 'dns',
    name: 'Traffic Manager',
    summary: 'DNS-based global traffic routing with health probes.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-dns',
    provider: 'azure',
    category: 'dns',
    name: 'Azure DNS',
    summary: 'Authoritative DNS hosting.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-front-door',
    provider: 'azure',
    category: 'cdn',
    name: 'Front Door',
    summary: 'Global CDN and application acceleration.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-waf',
    provider: 'azure',
    category: 'waf',
    name: 'Azure WAF',
    summary: 'WAF policies for Front Door and Application Gateway.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-app-gateway',
    provider: 'azure',
    category: 'load-balancer',
    name: 'Application Gateway',
    summary: 'Regional layer 7 load balancer.',
  },
  {
    id: 'azure-apim',
    provider: 'azure',
    category: 'load-balancer',
    name: 'API Management',
    summary: 'Managed API gateway.',
    traits: ['managed-ha'],
    defaults: { zones: 3 },
  },
  {
    id: 'azure-vmss',
    provider: 'azure',
    category: 'compute',
    name: 'VM Scale Sets',
    summary: 'Virtual machines with autoscale.',
    rpsPerReplica: 400,
  },
  {
    id: 'azure-app-service',
    provider: 'azure',
    category: 'compute',
    name: 'App Service',
    summary: 'Managed web app hosting.',
    rpsPerReplica: 380,
    pricing: { unit: 65 },
  },
  {
    id: 'azure-functions',
    provider: 'azure',
    category: 'compute',
    name: 'Functions',
    summary: 'Serverless functions.',
    ...SERVERLESS,
    rpsPerReplica: 100000,
  },
  {
    id: 'azure-aks',
    provider: 'azure',
    category: 'kubernetes',
    name: 'AKS',
    summary: 'Managed Kubernetes on Azure.',
    traits: ['managed-control-plane'],
    rpsPerReplica: 450,
    defaults: { zones: 2 },
  },
  {
    id: 'azure-sql',
    provider: 'azure',
    category: 'database',
    name: 'Azure SQL',
    summary: 'Managed SQL with zone redundancy and geo-replication.',
    traits: ['relational'],
    rpsPerReplica: 3000,
  },
  {
    id: 'azure-cosmos',
    provider: 'azure',
    category: 'database',
    name: 'Cosmos DB',
    summary: 'Globally distributed multi-model database.',
    ...MANAGED_NOSQL,
    rpsPerReplica: 20000,
  },
  {
    id: 'azure-redis',
    provider: 'azure',
    category: 'cache',
    name: 'Cache for Redis',
    summary: 'Managed Redis.',
  },
  {
    id: 'azure-service-bus',
    provider: 'azure',
    category: 'queue',
    name: 'Service Bus',
    summary: 'Queues and topics with dead-lettering.',
    ...MANAGED_QUEUE,
  },
  {
    id: 'azure-event-hubs',
    provider: 'azure',
    category: 'kafka',
    name: 'Event Hubs',
    summary: 'Streaming ingestion with a Kafka endpoint.',
    traits: ['managed-control-plane'],
  },
  {
    id: 'azure-blob',
    provider: 'azure',
    category: 'storage',
    name: 'Blob Storage',
    summary: 'Object storage with redundancy options.',
    ...MANAGED_STORAGE,
  },
  {
    id: 'azure-entra',
    provider: 'azure',
    category: 'iam',
    name: 'Entra ID',
    summary: 'Identity, RBAC and managed identities.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-key-vault',
    provider: 'azure',
    category: 'secrets',
    name: 'Key Vault',
    summary: 'Secrets, keys and certificates.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-monitor',
    provider: 'azure',
    category: 'monitoring',
    name: 'Azure Monitor',
    summary: 'Metrics, logs, alerts and Application Insights.',
    ...GLOBAL_EDGE,
  },
  {
    id: 'azure-devops',
    provider: 'azure',
    category: 'cicd',
    name: 'Azure DevOps',
    summary: 'Pipelines, repos and release gates.',
    ...GLOBAL_EDGE,
  },
]

function build(spec: Spec): ComponentDefinition {
  const category = CATEGORY_DEFS[spec.category]
  const pricing = { ...category.pricing, ...spec.pricing }
  return {
    id: spec.id,
    provider: spec.provider,
    category: spec.category,
    name: spec.name,
    summary: spec.summary,
    properties: spec.properties ?? category.properties,
    defaults: { ...BASE_CONFIG, ...category.defaults, ...spec.defaults },
    traits: spec.traits ?? [],
    rpsPerReplica: spec.rpsPerReplica,
    pricing: {
      baseMonthlyUsd: pricing.base,
      unitMonthlyUsd: pricing.unit,
      perRpsUsd: pricing.perRps,
    },
  }
}

export const COMPONENT_CATALOG: ComponentDefinition[] = SPECS.map(build)

const BY_ID = new Map(COMPONENT_CATALOG.map((c) => [c.id, c]))

export function getComponent(id: string): ComponentDefinition | undefined {
  return BY_ID.get(id)
}

export function hasTrait(def: ComponentDefinition, trait: ComponentTrait): boolean {
  return def.traits.includes(trait)
}

export const PROVIDER_LABELS: Record<CloudProvider, string> = {
  aws: 'AWS',
  azure: 'Azure',
  generic: 'Generic',
}

export function searchCatalog(
  query: string,
  provider: CloudProvider | 'all',
): ComponentDefinition[] {
  const q = query.trim().toLowerCase()
  return COMPONENT_CATALOG.filter((c) => {
    if (provider !== 'all' && c.provider !== provider) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.summary.toLowerCase().includes(q) ||
      CATEGORY_LABELS[c.category].toLowerCase().includes(q) ||
      PROVIDER_LABELS[c.provider].toLowerCase().includes(q)
    )
  })
}
