import type {
  ArchitectureDocument,
  ArchitectureEdge,
  ArchitectureNode,
  ComponentConfig,
  ConnectionKind,
  Scenario,
} from '@opsforge/types'
import { getComponent } from './catalog'

/*
 * SAMPLE CONTENT. Scenarios and starter designs are authored fixtures until the content service
 * exists. Each starter design intentionally contains gaps so the checks have something to find.
 */

type Patch = Partial<ComponentConfig>

function node(
  id: string,
  componentId: string,
  x: number,
  y: number,
  patch: Patch = {},
  label?: string,
): ArchitectureNode {
  const def = getComponent(componentId)
  if (!def) throw new Error(`Unknown component in starter design: ${componentId}`)
  return {
    id,
    componentId,
    label: label ?? def.name,
    position: { x, y },
    config: { ...def.defaults, ...patch },
  }
}

function edge(
  source: string,
  target: string,
  kind: ConnectionKind,
  encrypted = true,
): ArchitectureEdge {
  return { id: `e-${source}-${target}`, source, target, kind, encrypted }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'payments-multi-region',
    title: 'Multi-region payments platform',
    summary:
      'Card payments API for a fintech. Must survive the loss of a zone without user impact and the loss of a region within the recovery objectives, and satisfy PCI-DSS network and data controls.',
    difficulty: 'architect',
    workload: {
      peakRps: 4000,
      readRatio: 0.7,
      globalUsers: true,
      availabilityTarget: 99.99,
      rpoMinutes: 1,
      rtoMinutes: 15,
      monthlyBudgetUsd: 22000,
      compliance: ['PCI-DSS'],
    },
    requirements: [
      {
        id: 'pay-1',
        text: 'Public traffic is filtered by a WAF',
        priority: 'must',
        check: { kind: 'path', from: 'client', to: 'waf' },
      },
      {
        id: 'pay-2',
        text: 'Serving tier and database span at least two availability zones',
        priority: 'must',
        check: {
          kind: 'min-zones',
          zones: 2,
          categories: ['compute', 'kubernetes', 'database', 'load-balancer'],
        },
      },
      {
        id: 'pay-3',
        text: 'The workload runs in more than one region',
        priority: 'must',
        check: { kind: 'multi-region' },
      },
      {
        id: 'pay-4',
        text: 'Every database is encrypted at rest',
        priority: 'must',
        check: {
          kind: 'property',
          category: 'database',
          key: 'encryptedAtRest',
          value: true,
          scope: 'all',
        },
      },
      {
        id: 'pay-5',
        text: 'Secrets are held in a secrets manager',
        priority: 'must',
        check: { kind: 'has-category', category: 'secrets' },
      },
      {
        id: 'pay-6',
        text: 'Payment events are processed asynchronously via a queue or stream',
        priority: 'should',
        check: { kind: 'has-category', category: 'queue' },
      },
      {
        id: 'pay-7',
        text: 'Monitoring covers the platform',
        priority: 'should',
        check: { kind: 'has-category', category: 'monitoring' },
      },
    ],
  },
  {
    id: 'order-event-pipeline',
    title: 'Event-driven order pipeline',
    summary:
      'Retail order intake that fans out to inventory, billing and notifications through a streaming backbone. Spiky load; no order may be lost.',
    difficulty: 'senior',
    workload: {
      peakRps: 1800,
      readRatio: 0.4,
      globalUsers: false,
      availabilityTarget: 99.9,
      rpoMinutes: 5,
      rtoMinutes: 30,
      monthlyBudgetUsd: 9000,
      compliance: [],
    },
    requirements: [
      {
        id: 'ord-1',
        text: 'Orders are published to a durable stream',
        priority: 'must',
        check: { kind: 'has-category', category: 'kafka' },
      },
      {
        id: 'ord-2',
        text: 'Order processing runs in at least two zones',
        priority: 'must',
        check: { kind: 'min-zones', zones: 2, categories: ['compute', 'kubernetes'] },
      },
      {
        id: 'ord-3',
        text: 'Order data is backed up',
        priority: 'must',
        check: {
          kind: 'property',
          category: 'database',
          key: 'backups',
          value: true,
          scope: 'all',
        },
      },
      {
        id: 'ord-4',
        text: 'Failed events land in a dead-letter path',
        priority: 'should',
        check: {
          kind: 'property',
          category: 'kafka',
          key: 'deadLetter',
          value: true,
          scope: 'any',
        },
      },
      {
        id: 'ord-5',
        text: 'Hot reads are served from a cache',
        priority: 'should',
        check: { kind: 'has-category', category: 'cache' },
      },
      {
        id: 'ord-6',
        text: 'Deployments go through a pipeline',
        priority: 'should',
        check: { kind: 'has-category', category: 'cicd' },
      },
    ],
  },
  {
    id: 'global-media-site',
    title: 'Global media and content site',
    summary:
      'Read-heavy publishing site with worldwide readers and bursty traffic from breaking news. Cost matters; reads must stay fast and the site must stay up if a region fails.',
    difficulty: 'intermediate',
    workload: {
      peakRps: 12000,
      readRatio: 0.97,
      globalUsers: true,
      availabilityTarget: 99.95,
      rpoMinutes: 60,
      rtoMinutes: 60,
      monthlyBudgetUsd: 14000,
      compliance: [],
    },
    requirements: [
      {
        id: 'med-1',
        text: 'Static and cacheable content is served from a CDN',
        priority: 'must',
        check: { kind: 'path', from: 'client', to: 'cdn' },
      },
      {
        id: 'med-2',
        text: 'Media assets live in object storage',
        priority: 'must',
        check: { kind: 'has-category', category: 'storage' },
      },
      {
        id: 'med-3',
        text: 'Origin tier runs in at least two zones',
        priority: 'must',
        check: {
          kind: 'min-zones',
          zones: 2,
          categories: ['compute', 'kubernetes', 'load-balancer'],
        },
      },
      {
        id: 'med-4',
        text: 'Object storage has versioning or backups',
        priority: 'should',
        check: { kind: 'property', category: 'storage', key: 'backups', value: true, scope: 'all' },
      },
      {
        id: 'med-5',
        text: 'DNS can steer users away from an unhealthy origin',
        priority: 'should',
        check: {
          kind: 'property',
          category: 'dns',
          key: 'failover',
          value: 'automatic',
          scope: 'any',
        },
      },
      {
        id: 'med-6',
        text: 'Monitoring covers the origin',
        priority: 'should',
        check: { kind: 'has-category', category: 'monitoring' },
      },
    ],
  },
]

const STARTERS: Record<string, () => ArchitectureDocument> = {
  'payments-multi-region': () => ({
    schemaVersion: 1,
    nodes: [
      node('client', 'generic-client', 0, 180, {}, 'Mobile & web clients'),
      node('dns', 'aws-route53', 220, 180),
      node('cdn', 'aws-cloudfront', 440, 180),
      node('alb', 'aws-alb', 660, 180, { zones: 1 }),
      node('api', 'aws-eks', 900, 80, { replicas: 3, zones: 1 }, 'Payments API'),
      node(
        'db',
        'aws-rds',
        1160,
        80,
        { zones: 1, failover: 'none', backups: true, encryptedAtRest: false },
        'Payments DB',
      ),
      node('iam', 'aws-iam', 900, 300),
    ],
    edges: [
      edge('client', 'dns', 'traffic'),
      edge('dns', 'cdn', 'traffic'),
      edge('cdn', 'alb', 'traffic'),
      edge('alb', 'api', 'traffic'),
      edge('api', 'db', 'data', false),
    ],
  }),
  'order-event-pipeline': () => ({
    schemaVersion: 1,
    nodes: [
      node('client', 'generic-client', 0, 160, {}, 'Storefront'),
      node('lb', 'generic-lb', 220, 160),
      node('intake', 'generic-service', 460, 160, { replicas: 2, zones: 1 }, 'Order intake'),
      node('stream', 'generic-kafka', 700, 40, { deadLetter: false }, 'Order events'),
      node('worker', 'generic-service', 960, 40, { replicas: 2, zones: 1 }, 'Order workers'),
      node('db', 'generic-sql', 1200, 160, { zones: 1, backups: false }, 'Orders DB'),
    ],
    edges: [
      edge('client', 'lb', 'traffic'),
      edge('lb', 'intake', 'traffic'),
      edge('intake', 'stream', 'async'),
      edge('stream', 'worker', 'async'),
      edge('worker', 'db', 'data'),
      edge('intake', 'db', 'data'),
    ],
  }),
  'global-media-site': () => ({
    schemaVersion: 1,
    nodes: [
      node('client', 'generic-client', 0, 160, {}, 'Readers'),
      node('dns', 'azure-dns', 220, 160),
      node('cdn', 'azure-front-door', 440, 160),
      node('app', 'azure-app-service', 680, 160, { replicas: 2, zones: 1 }, 'CMS front end'),
      node('blob', 'azure-blob', 920, 60, { backups: false }, 'Media assets'),
      node('db', 'azure-sql', 920, 260, { zones: 1 }, 'Content DB'),
    ],
    edges: [
      edge('client', 'dns', 'traffic'),
      edge('dns', 'cdn', 'traffic'),
      edge('cdn', 'app', 'traffic'),
      edge('app', 'blob', 'data'),
      edge('app', 'db', 'data'),
    ],
  }),
}

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

export const DEFAULT_SCENARIO_ID = SCENARIOS[0]!.id

export function starterDocument(scenarioId: string): ArchitectureDocument {
  return (STARTERS[scenarioId] ?? (() => ({ schemaVersion: 1 as const, nodes: [], edges: [] })))()
}
