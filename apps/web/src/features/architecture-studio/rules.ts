import type {
  CheckSeverity,
  ComponentCategory,
  CostEstimate,
  RequirementCheck,
  Scenario,
  ScoreDimensionId,
} from '@opsforge/types'
import { DATA_STORE_CATEGORIES, SERVING_CATEGORIES, hasTrait } from './catalog'
import {
  hasPath,
  isSyncEdge,
  longestSyncChain,
  ofCategory,
  syncCycleNodes,
  type Graph,
  type ResolvedNode,
} from './graph'
import { baselineCapacity, burstCapacity } from './sizing'

export interface RuleContext {
  scenario: Scenario
  graph: Graph
  cost: CostEstimate
}

export interface RuleOutcome {
  ok: boolean
  evidence: string
  nodeIds?: string[]
  /** Escalates (or relaxes) the rule's default severity for this specific outcome. */
  severity?: CheckSeverity
}

export interface Rule {
  id: string
  dimension: ScoreDimensionId
  title: string
  severity: CheckSeverity
  applies(ctx: RuleContext): boolean
  run(ctx: RuleContext): RuleOutcome
  fix: string
}

const label = (ctx: RuleContext, id: string) => ctx.graph.byId.get(id)?.node.label ?? id
const list = (ctx: RuleContext, ids: string[]) => {
  const names = ids.map((id) => label(ctx, id))
  return names.length > 4
    ? `${names.slice(0, 4).join(', ')} and ${names.length - 4} more`
    : names.join(', ')
}
const ids = (nodes: ResolvedNode[]) => nodes.map((n) => n.node.id)
const notSecondary = (n: ResolvedNode) => n.node.config.region !== 'secondary'
const servingPrimary = (g: Graph) => ofCategory(g, ...SERVING_CATEGORIES).filter(notSecondary)
const hasCompliance = (ctx: RuleContext) => ctx.scenario.workload.compliance.length > 0

function pass(evidence: string): RuleOutcome {
  return { ok: true, evidence }
}
function fail(
  ctx: RuleContext,
  failing: string[],
  evidence: (names: string) => string,
  severity?: CheckSeverity,
): RuleOutcome {
  return { ok: false, nodeIds: failing, evidence: evidence(list(ctx, failing)), severity }
}

/** Declarative per-node rule: failing nodes are those where `bad` is true. */
function perNode(
  select: (ctx: RuleContext) => ResolvedNode[],
  bad: (n: ResolvedNode, ctx: RuleContext) => boolean,
  messages: { pass: string; fail: (names: string) => string },
  severity?: (ctx: RuleContext) => CheckSeverity | undefined,
) {
  return (ctx: RuleContext): RuleOutcome => {
    const failing = ids(select(ctx).filter((n) => bad(n, ctx)))
    return failing.length === 0
      ? pass(messages.pass)
      : fail(ctx, failing, messages.fail, severity?.(ctx))
  }
}

const monitoringNodes = (g: Graph) => ofCategory(g, 'monitoring')

export const RULES: Rule[] = [
  // ───────── Availability ─────────
  {
    id: 'AVL-01',
    dimension: 'availability',
    title: 'No single point of failure in the serving tier',
    severity: 'critical',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: perNode(
      (c) => servingPrimary(c.graph),
      (n) => !hasTrait(n.def, 'serverless') && n.node.config.replicas < 2,
      {
        pass: 'Every serving component runs at least two replicas or is serverless.',
        fail: (n) => `${n} run a single replica, so one failure takes the tier down.`,
      },
    ),
    fix: 'Run at least two replicas behind a load balancer, or use a serverless or autoscaled service.',
  },
  {
    id: 'AVL-02',
    dimension: 'availability',
    title: 'Replicated services sit behind a load balancer',
    severity: 'major',
    applies: (c) =>
      servingPrimary(c.graph).some(
        (n) =>
          !hasTrait(n.def, 'serverless') &&
          (n.node.config.replicas >= 2 || n.node.config.autoscaling),
      ),
    run: perNode(
      (c) =>
        servingPrimary(c.graph).filter(
          (n) =>
            !hasTrait(n.def, 'serverless') &&
            (n.node.config.replicas >= 2 || n.node.config.autoscaling),
        ),
      (n, c) =>
        !(c.graph.inc.get(n.node.id) ?? []).some(
          (e) => c.graph.byId.get(e.source)?.def.category === 'load-balancer',
        ),
      {
        pass: 'Every replicated service receives traffic through a load balancer.',
        fail: (n) => `${n} have several replicas but no load balancer in front of them.`,
      },
    ),
    fix: 'Add a load balancer or API gateway and connect it to the service.',
  },
  {
    id: 'AVL-03',
    dimension: 'availability',
    title: 'Tiers span multiple availability zones',
    severity: 'major',
    applies: (c) => c.scenario.workload.availabilityTarget >= 99.9,
    run: (c) => {
      const failing = ids(
        c.graph.nodes.filter(
          (n) =>
            notSecondary(n) &&
            ['compute', 'kubernetes', 'database', 'cache', 'load-balancer', 'kafka'].includes(
              n.def.category,
            ) &&
            n.node.config.zones < 2,
        ),
      )
      const target = c.scenario.workload.availabilityTarget
      return failing.length === 0
        ? pass(`All zonal tiers span two or more zones for the ${target}% target.`)
        : fail(
            c,
            failing,
            (n) => `${n} are confined to one zone; a zone outage breaks the ${target}% target.`,
            target >= 99.95 ? 'critical' : 'major',
          )
    },
    fix: 'Spread these components across at least two availability zones.',
  },
  {
    id: 'AVL-04',
    dimension: 'availability',
    title: 'Databases fail over automatically',
    severity: 'major',
    applies: (c) =>
      c.scenario.workload.availabilityTarget >= 99.9 &&
      ofCategory(c.graph, 'database').some(notSecondary),
    run: (c) => {
      const failing = ids(
        ofCategory(c.graph, 'database').filter(
          (n) =>
            notSecondary(n) &&
            !(n.node.config.zones >= 2 && n.node.config.failover === 'automatic'),
        ),
      )
      return failing.length === 0
        ? pass('Databases are multi-zone with automatic failover.')
        : fail(
            c,
            failing,
            (n) =>
              `${n} lack multi-zone automatic failover, so a primary failure needs manual action.`,
            c.scenario.workload.availabilityTarget >= 99.99 ? 'critical' : 'major',
          )
    },
    fix: 'Use two or more zones and set failover to automatic.',
  },
  {
    id: 'AVL-05',
    dimension: 'availability',
    title: 'Cache is not a single point of failure',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'cache').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'cache'),
      (n) => n.node.config.replicas < 2 && n.node.config.zones < 2,
      {
        pass: 'Caches are replicated or multi-zone.',
        fail: (n) => `${n} have one node in one zone; losing it pushes full load to the database.`,
      },
    ),
    fix: 'Add a replica or span two zones so a cache failure is survivable.',
  },
  {
    id: 'AVL-06',
    dimension: 'availability',
    title: 'Kafka runs a quorum of brokers across zones',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'kafka').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'kafka'),
      (n) => n.node.config.replicas < 3 || n.node.config.zones < 2,
      {
        pass: 'Kafka has three or more brokers across at least two zones.',
        fail: (n) =>
          `${n} need at least three brokers across two or more zones to survive a broker or zone loss.`,
      },
    ),
    fix: 'Use three or more brokers spread over at least two zones.',
  },

  // ───────── Reliability ─────────
  {
    id: 'REL-01',
    dimension: 'reliability',
    title: 'Queues and streams handle poison messages',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'queue', 'kafka').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'queue', 'kafka'),
      (n) => !n.node.config.deadLetter,
      {
        pass: 'Every queue or stream has dead-letter handling.',
        fail: (n) =>
          `${n} have no dead-letter handling; one poison message can block or silently drop work.`,
      },
    ),
    fix: 'Enable a dead-letter queue or topic with alerting on its depth.',
  },
  {
    id: 'REL-02',
    dimension: 'reliability',
    title: 'Synchronous call chains stay short',
    severity: 'minor',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: (c) => {
      const { depth, nodeIds } = longestSyncChain(c.graph)
      return depth <= 4
        ? pass(`Longest synchronous chain is ${depth} service${depth === 1 ? '' : 's'}.`)
        : {
            ok: false,
            nodeIds,
            evidence: `A synchronous chain of ${depth} services (${list(c, nodeIds)}) multiplies latency and failure probability.`,
          }
    },
    fix: 'Collapse hops or make some calls asynchronous.',
  },
  {
    id: 'REL-03',
    dimension: 'reliability',
    title: 'No synchronous dependency cycles',
    severity: 'major',
    applies: (c) => c.graph.edges.some(isSyncEdge),
    run: (c) => {
      const cycle = syncCycleNodes(c.graph)
      return cycle.length === 0
        ? pass('No cycles in the synchronous call graph.')
        : fail(
            c,
            cycle,
            (n) => `${n} call each other synchronously; a slow node can exhaust the whole cycle.`,
          )
    },
    fix: 'Break the cycle with an event or a one-way dependency.',
  },
  {
    id: 'REL-04',
    dimension: 'reliability',
    title: 'Write-heavy load is buffered asynchronously',
    severity: 'major',
    applies: (c) => c.scenario.workload.readRatio <= 0.5 && c.scenario.workload.peakRps >= 2000,
    run: (c) =>
      ofCategory(c.graph, 'queue', 'kafka').length > 0
        ? pass('A queue or stream absorbs write bursts.')
        : {
            ok: false,
            evidence: `${c.scenario.workload.peakRps} rps at ${Math.round((1 - c.scenario.workload.readRatio) * 100)}% writes has no queue or stream to absorb bursts.`,
          },
    fix: 'Add a queue or Kafka between the write path and slower downstream work.',
  },
  {
    id: 'REL-05',
    dimension: 'reliability',
    title: 'Queues and streams have producers and consumers',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'queue', 'kafka').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'queue', 'kafka'),
      (n, c) =>
        (c.graph.inc.get(n.node.id) ?? []).length === 0 ||
        (c.graph.out.get(n.node.id) ?? []).length === 0,
      {
        pass: 'Every queue or stream is connected to a producer and a consumer.',
        fail: (n) =>
          `${n} are missing a producer or a consumer connection, so messages are never produced or never processed.`,
      },
    ),
    fix: 'Connect a producer into the queue and a consumer out of it.',
  },

  // ───────── Scalability ─────────
  {
    id: 'SCL-01',
    dimension: 'scalability',
    title: 'Serving capacity covers peak load with headroom',
    severity: 'major',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: (c) => {
      const serving = servingPrimary(c.graph)
      const peak = c.scenario.workload.peakRps
      const burst = serving.reduce((s, n) => s + burstCapacity(n), 0)
      const base = serving.reduce((s, n) => s + baselineCapacity(n), 0)
      if (burst >= peak * 1.3) {
        return pass(
          Number.isFinite(burst)
            ? `Capacity ~${Math.round(burst)} rps vs peak ${peak} rps (30% headroom required).`
            : 'Serverless capacity scales with load.',
        )
      }
      return {
        ok: false,
        nodeIds: ids(serving),
        severity: burst < peak ? 'critical' : 'major',
        evidence: `Capacity ~${Math.round(burst)} rps${base !== burst ? ` (${Math.round(base)} baseline)` : ''} vs peak ${peak} rps; ${burst < peak ? 'the design cannot serve peak' : 'less than 30% headroom'}.`,
      }
    },
    fix: 'Increase replicas or size, or enable autoscaling on the serving tier.',
  },
  {
    id: 'SCL-02',
    dimension: 'scalability',
    title: 'Read-heavy load is served from a cache',
    severity: 'major',
    applies: (c) =>
      c.scenario.workload.readRatio >= 0.7 &&
      c.scenario.workload.peakRps >= 1000 &&
      ofCategory(c.graph, 'database').length > 0,
    run: (c) =>
      hasPath(c.graph, 'compute', 'cache', ['traffic', 'data']) ||
      hasPath(c.graph, 'kubernetes', 'cache', ['traffic', 'data'])
        ? pass('A cache sits between the services and the database.')
        : fail(
            c,
            ids(ofCategory(c.graph, 'database')),
            (n) =>
              `${Math.round(c.scenario.workload.readRatio * 100)}% reads at ${c.scenario.workload.peakRps} rps all reach ${n}.`,
          ),
    fix: 'Add a cache that the services read through before hitting the database.',
  },
  {
    id: 'SCL-03',
    dimension: 'scalability',
    title: 'The database can scale to the load',
    severity: 'major',
    applies: (c) =>
      c.scenario.workload.peakRps >= 5000 && ofCategory(c.graph, 'database').length > 0,
    run: (c) => {
      const readHeavy = c.scenario.workload.readRatio >= 0.5
      return perNode(
        (x) => ofCategory(x.graph, 'database'),
        (n) =>
          !hasTrait(n.def, 'horizontal-scale') &&
          (readHeavy ? n.node.config.readReplicas < 1 : n.node.config.tier !== 'large'),
        {
          pass: 'The database scales horizontally or has read replicas / a large tier for this load.',
          fail: (names) =>
            `${names} ${readHeavy ? 'have no read replicas' : 'are not sized for a write-heavy load'} at ${c.scenario.workload.peakRps} rps.`,
        },
      )(c)
    },
    fix: 'Add read replicas, use a horizontally scalable store, or increase the size for write-heavy load.',
  },
  {
    id: 'SCL-04',
    dimension: 'scalability',
    title: 'Global users are served from the edge',
    severity: 'major',
    applies: (c) => c.scenario.workload.globalUsers,
    run: (c) =>
      ofCategory(c.graph, 'cdn').length > 0
        ? pass('A CDN serves content close to users.')
        : {
            ok: false,
            evidence:
              'Users are global but there is no CDN, so every request pays full cross-region latency.',
          },
    fix: 'Put a CDN in front of the application.',
  },

  // ───────── Security ─────────
  {
    id: 'SEC-01',
    dimension: 'security',
    title: 'Public entry points are protected by a WAF',
    severity: 'major',
    applies: (c) => publicEntries(c.graph).length > 0,
    run: (c) => {
      const unprotected = publicEntries(c.graph).filter(
        (n) =>
          ![
            ...(c.graph.out.get(n.node.id) ?? []).map((e) => e.target),
            ...(c.graph.inc.get(n.node.id) ?? []).map((e) => e.source),
          ].some((id) => c.graph.byId.get(id)?.def.category === 'waf'),
      )
      return unprotected.length === 0
        ? pass('Every public entry point is adjacent to a WAF.')
        : fail(
            c,
            ids(unprotected),
            (n) => `${n} are internet-facing without a WAF.`,
            hasCompliance(c) ? 'critical' : 'major',
          )
    },
    fix: 'Attach a WAF to every public CDN, gateway or load balancer.',
  },
  {
    id: 'SEC-02',
    dimension: 'security',
    title: 'Data stores are not exposed publicly',
    severity: 'critical',
    applies: (c) => ofCategory(c.graph, ...DATA_STORE_CATEGORIES).length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, ...DATA_STORE_CATEGORIES),
      (n) => n.node.config.exposure === 'public',
      {
        pass: 'No database, cache or queue is publicly reachable.',
        fail: (n) => `${n} are reachable from the internet.`,
      },
    ),
    fix: 'Set exposure to private and reach the store only from the application tier.',
  },
  {
    id: 'SEC-03',
    dimension: 'security',
    title: 'Clients never reach data stores directly',
    severity: 'critical',
    applies: (c) => ofCategory(c.graph, 'client').length > 0,
    run: (c) => {
      const bad = c.graph.edges.filter(
        (e) =>
          c.graph.byId.get(e.source)?.def.category === 'client' &&
          DATA_STORE_CATEGORIES.includes(
            c.graph.byId.get(e.target)?.def.category as ComponentCategory,
          ),
      )
      const nodeIds = [...new Set(bad.flatMap((e) => [e.source, e.target]))]
      return bad.length === 0
        ? pass('No client connects straight to a data store.')
        : fail(c, nodeIds, (n) => `Clients connect directly to a data store (${n}).`)
    },
    fix: 'Route client requests through an application tier.',
  },
  {
    id: 'SEC-04',
    dimension: 'security',
    title: 'Persistent data is encrypted at rest',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'database', 'storage', 'kafka', 'queue').length > 0,
    run: (c) =>
      perNode(
        (x) => ofCategory(x.graph, 'database', 'storage', 'kafka', 'queue'),
        (n) => !n.node.config.encryptedAtRest,
        {
          pass: 'All persistent stores are encrypted at rest.',
          fail: (n) => `${n} are not encrypted at rest.`,
        },
        (x) => (hasCompliance(x) ? 'critical' : undefined),
      )(c),
    fix: 'Enable encryption at rest with managed keys.',
  },
  {
    id: 'SEC-05',
    dimension: 'security',
    title: 'Traffic is encrypted in transit',
    severity: 'major',
    applies: (c) => c.graph.edges.some((e) => e.kind !== 'telemetry' && e.kind !== 'deploy'),
    run: (c) => {
      const bad = c.graph.edges.filter(
        (e) => e.kind !== 'telemetry' && e.kind !== 'deploy' && !e.encrypted,
      )
      const nodeIds = [...new Set(bad.flatMap((e) => [e.source, e.target]))]
      return bad.length === 0
        ? pass('All request, data and event connections use TLS.')
        : fail(
            c,
            nodeIds,
            (n) =>
              `${bad.length} connection${bad.length === 1 ? '' : 's'} carry plaintext traffic (${n}).`,
            hasCompliance(c) ? 'critical' : 'major',
          )
    },
    fix: 'Turn on TLS for the listed connections.',
  },
  {
    id: 'SEC-06',
    dimension: 'security',
    title: 'Workloads use least-privilege identities',
    severity: 'major',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: (c) => {
      const iam = ofCategory(c.graph, 'iam')
      if (iam.length === 0)
        return {
          ok: false,
          nodeIds: ids(servingPrimary(c.graph)),
          evidence: 'No identity or IAM component is defined for the workloads.',
        }
      const loose = iam.filter((n) => !n.node.config.leastPrivilege)
      return loose.length === 0
        ? pass('IAM policies are least-privilege.')
        : fail(c, ids(loose), (n) => `${n} do not enforce least-privilege policies.`)
    },
    fix: 'Add an IAM component and scope policies per workload.',
  },
  {
    id: 'SEC-07',
    dimension: 'security',
    title: 'Secrets are managed and rotated',
    severity: 'major',
    applies: (c) =>
      servingPrimary(c.graph).length > 0 && ofCategory(c.graph, 'database').length > 0,
    run: (c) => {
      const secrets = ofCategory(c.graph, 'secrets')
      if (secrets.length === 0)
        return {
          ok: false,
          evidence:
            'Services use a database but no secrets manager is defined, so credentials live in config or code.',
        }
      const stale = secrets.filter((n) => !n.node.config.rotation)
      return stale.length === 0
        ? pass('Secrets are stored centrally with rotation.')
        : fail(c, ids(stale), (n) => `${n} do not rotate secrets automatically.`)
    },
    fix: 'Add a secrets manager and enable rotation for database credentials.',
  },

  // ───────── Networking ─────────
  {
    id: 'NET-01',
    dimension: 'networking',
    title: 'Names resolve through managed DNS',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'client').length > 0,
    run: (c) =>
      ofCategory(c.graph, 'dns').length > 0
        ? pass('A DNS component fronts the application.')
        : {
            ok: false,
            evidence:
              'Clients have no DNS component, so there is no controllable entry name or routing policy.',
          },
    fix: 'Add DNS in front of the entry point.',
  },
  {
    id: 'NET-02',
    dimension: 'networking',
    title: 'Application tier is private',
    severity: 'major',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, ...SERVING_CATEGORIES),
      (n) => n.node.config.exposure === 'public',
      {
        pass: 'Compute is only reachable through the edge tier.',
        fail: (n) =>
          `${n} are directly internet-facing instead of sitting behind a load balancer or gateway.`,
      },
    ),
    fix: 'Set exposure to private and publish through a load balancer or gateway.',
  },
  {
    id: 'NET-03',
    dimension: 'networking',
    title: 'Multi-region traffic is steered by health-aware DNS',
    severity: 'major',
    applies: (c) => c.graph.nodes.some((n) => n.node.config.region === 'secondary'),
    run: (c) =>
      ofCategory(c.graph, 'dns').some((n) => n.node.config.failover !== 'none')
        ? pass('DNS has health-checked failover between regions.')
        : {
            ok: false,
            nodeIds: ids(ofCategory(c.graph, 'dns')),
            evidence: 'A secondary region exists but no DNS failover routes users to it.',
          },
    fix: 'Enable failover routing on the DNS component.',
  },
  {
    id: 'NET-04',
    dimension: 'networking',
    title: 'Clients do not bypass the edge tier',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'client').length > 0,
    run: (c) => {
      const bad = c.graph.edges.filter(
        (e) =>
          c.graph.byId.get(e.source)?.def.category === 'client' &&
          SERVING_CATEGORIES.includes(
            c.graph.byId.get(e.target)?.def.category as ComponentCategory,
          ),
      )
      const nodeIds = [...new Set(bad.map((e) => e.target))]
      return bad.length === 0
        ? pass('Clients enter through DNS, CDN, WAF or a gateway.')
        : fail(c, nodeIds, (n) => `Clients call ${n} directly, skipping the edge tier.`)
    },
    fix: 'Route client traffic through DNS, a CDN or a load balancer.',
  },

  // ───────── Data ─────────
  {
    id: 'DAT-01',
    dimension: 'data',
    title: 'Durable stores are backed up',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'database', 'storage').length > 0,
    run: (c) =>
      perNode(
        (x) => ofCategory(x.graph, 'database', 'storage'),
        (n) => !n.node.config.backups,
        {
          pass: 'Databases and storage have backups or versioning.',
          fail: (n) => `${n} have no backups or versioning.`,
        },
        (x) => (hasCompliance(x) ? 'critical' : undefined),
      )(c),
    fix: 'Enable automated backups or object versioning.',
  },
  {
    id: 'DAT-02',
    dimension: 'data',
    title: 'State lives in a durable store',
    severity: 'critical',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: (c) =>
      ofCategory(c.graph, 'database', 'storage').length > 0
        ? pass('A durable database or object store holds application state.')
        : {
            ok: false,
            evidence:
              'The services have no database or object storage; state would be lost with the instances.',
          },
    fix: 'Add a database or object store for application state.',
  },
  {
    id: 'DAT-03',
    dimension: 'data',
    title: 'Services do not share one database',
    severity: 'minor',
    applies: (c) => ofCategory(c.graph, 'database').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'database'),
      (n, c) =>
        new Set(
          (c.graph.inc.get(n.node.id) ?? [])
            .filter((e) =>
              SERVING_CATEGORIES.includes(
                c.graph.byId.get(e.source)?.def.category as ComponentCategory,
              ),
            )
            .map((e) => e.source),
        ).size >= 3,
      {
        pass: 'No database is shared by three or more services.',
        fail: (n) =>
          `${n} are shared by three or more services, coupling their schemas and failure modes.`,
      },
    ),
    fix: 'Give services their own data stores or put an API in front of the shared one.',
  },

  // ───────── Disaster recovery ─────────
  {
    id: 'DR-01',
    dimension: 'disaster-recovery',
    title: 'A secondary region exists',
    severity: 'major',
    applies: (c) =>
      c.scenario.workload.rtoMinutes <= 60 || c.scenario.workload.availabilityTarget >= 99.99,
    run: (c) =>
      c.graph.nodes.some(
        (n) =>
          n.node.config.region === 'secondary' &&
          ['compute', 'kubernetes', 'database'].includes(n.def.category),
      )
        ? pass('Compute or data runs in a secondary region.')
        : {
            ok: false,
            evidence: `RTO ${c.scenario.workload.rtoMinutes} min and ${c.scenario.workload.availabilityTarget}% availability cannot survive a regional outage with one region.`,
            severity: c.scenario.workload.availabilityTarget >= 99.99 ? 'critical' : 'major',
          },
    fix: 'Add a secondary region with compute and a replicated database.',
  },
  {
    id: 'DR-02',
    dimension: 'disaster-recovery',
    title: 'Data is replicated across regions',
    severity: 'major',
    applies: (c) =>
      ofCategory(c.graph, 'database').some(notSecondary) &&
      (c.scenario.workload.rpoMinutes <= 15 ||
        c.graph.nodes.some((n) => n.node.config.region === 'secondary')),
    run: (c) =>
      perNode(
        (x) => ofCategory(x.graph, 'database').filter(notSecondary),
        (n) => !n.node.config.crossRegionReplication,
        {
          pass: 'Primary databases replicate to another region.',
          fail: (n) =>
            `${n} do not replicate across regions; RPO is bounded by the last backup, not ${c.scenario.workload.rpoMinutes} min.`,
        },
        (x) => (x.scenario.workload.rpoMinutes <= 5 ? 'critical' : undefined),
      )(c),
    fix: 'Enable cross-region replication on the primary database.',
  },
  {
    id: 'DR-03',
    dimension: 'disaster-recovery',
    title: 'Regional failover is automatic',
    severity: 'major',
    applies: (c) =>
      c.scenario.workload.rtoMinutes <= 15 &&
      c.graph.nodes.some((n) => n.node.config.region === 'secondary'),
    run: (c) =>
      ofCategory(c.graph, 'dns').some((n) => n.node.config.failover === 'automatic')
        ? pass('DNS fails over automatically on health-check failure.')
        : {
            ok: false,
            nodeIds: ids(ofCategory(c.graph, 'dns')),
            evidence: `An RTO of ${c.scenario.workload.rtoMinutes} min leaves no time for a manual failover decision.`,
          },
    fix: 'Set DNS failover to automatic with health checks.',
  },
  {
    id: 'DR-04',
    dimension: 'disaster-recovery',
    title: 'Backups can be restored outside the primary region',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'database').some(notSecondary),
    run: (c) => {
      const offsite = ofCategory(c.graph, 'storage').some((n) => n.node.config.region !== 'primary')
      return perNode(
        (x) => ofCategory(x.graph, 'database').filter(notSecondary),
        (n) => !(n.node.config.backups && (n.node.config.crossRegionReplication || offsite)),
        {
          pass: 'Backups or replicas exist outside the primary region.',
          fail: (names) =>
            `${names} have no backups or replicas reachable if the primary region is lost.`,
        },
      )(c)
    },
    fix: 'Enable backups plus cross-region replication or an off-region storage copy.',
  },

  // ───────── Observability ─────────
  {
    id: 'OBS-01',
    dimension: 'observability',
    title: 'Monitoring exists',
    severity: 'major',
    applies: (c) => c.graph.nodes.length >= 2,
    run: (c) =>
      monitoringNodes(c.graph).length > 0
        ? pass('A monitoring component is present.')
        : { ok: false, evidence: 'No monitoring component; failures would be found by users.' },
    fix: 'Add a monitoring component and connect it to the workloads.',
  },
  {
    id: 'OBS-02',
    dimension: 'observability',
    title: 'Monitoring covers at least 80% of the tiers',
    severity: 'major',
    applies: (c) => monitoringNodes(c.graph).length > 0,
    run: (c) => {
      const mon = new Set(ids(monitoringNodes(c.graph)))
      const tiers = ofCategory(
        c.graph,
        'compute',
        'kubernetes',
        'database',
        'cache',
        'queue',
        'kafka',
        'load-balancer',
      )
      if (tiers.length === 0) return pass('No tiers to observe yet.')
      const uncovered = tiers.filter(
        (n) =>
          ![
            ...(c.graph.out.get(n.node.id) ?? []).map((e) => e.target),
            ...(c.graph.inc.get(n.node.id) ?? []).map((e) => e.source),
          ].some((id) => mon.has(id)),
      )
      const coverage = Math.round(((tiers.length - uncovered.length) / tiers.length) * 100)
      return coverage >= 80
        ? pass(`${coverage}% of tiers send telemetry to monitoring.`)
        : {
            ok: false,
            nodeIds: ids(uncovered),
            evidence: `Only ${coverage}% of tiers are connected to monitoring; uncovered: ${list(c, ids(uncovered))}.`,
          }
    },
    fix: 'Draw telemetry connections from the uncovered components to monitoring.',
  },
  {
    id: 'OBS-03',
    dimension: 'observability',
    title: 'Alerting is configured',
    severity: 'major',
    applies: (c) => monitoringNodes(c.graph).length > 0,
    run: perNode(
      (c) => monitoringNodes(c.graph),
      (n) => !n.node.config.alerting,
      {
        pass: 'Monitoring has alerting rules.',
        fail: (n) => `${n} collect data but have no alerting, so nobody is paged.`,
      },
    ),
    fix: 'Enable alerting on symptoms such as error rate and latency.',
  },
  {
    id: 'OBS-04',
    dimension: 'observability',
    title: 'Distributed tracing for multi-service systems',
    severity: 'minor',
    applies: (c) =>
      monitoringNodes(c.graph).length > 0 && ofCategory(c.graph, ...SERVING_CATEGORIES).length >= 3,
    run: (c) =>
      monitoringNodes(c.graph).some((n) => n.node.config.tracing)
        ? pass('Tracing is enabled.')
        : {
            ok: false,
            nodeIds: ids(monitoringNodes(c.graph)),
            evidence:
              'Three or more services without tracing make cross-service latency hard to attribute.',
          },
    fix: 'Enable distributed tracing.',
  },

  // ───────── CI/CD ─────────
  {
    id: 'CD-01',
    dimension: 'cicd',
    title: 'A delivery pipeline exists',
    severity: 'major',
    applies: (c) => servingPrimary(c.graph).length > 0,
    run: (c) =>
      ofCategory(c.graph, 'cicd').length > 0
        ? pass('A CI/CD pipeline is present.')
        : { ok: false, evidence: 'No CI/CD component; releases are manual and unrepeatable.' },
    fix: 'Add a CI/CD pipeline that deploys to the workloads.',
  },
  {
    id: 'CD-02',
    dimension: 'cicd',
    title: 'Pipelines run automated tests',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'cicd').length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, 'cicd'),
      (n) => !n.node.config.automatedTests,
      {
        pass: 'Pipelines gate releases on automated tests.',
        fail: (n) => `${n} deploy without automated tests.`,
      },
    ),
    fix: 'Add unit, integration and smoke tests as pipeline gates.',
  },
  {
    id: 'CD-03',
    dimension: 'cicd',
    title: 'Deployments are progressive',
    severity: 'major',
    applies: (c) =>
      ofCategory(c.graph, 'cicd').length > 0 && c.scenario.workload.availabilityTarget >= 99.9,
    run: perNode(
      (c) => ofCategory(c.graph, 'cicd'),
      (n) => !['rolling', 'blue-green', 'canary'].includes(n.node.config.strategy),
      {
        pass: 'Pipelines use rolling, blue-green or canary releases.',
        fail: (n) =>
          `${n} use manual or recreate deployments, which cause downtime or all-at-once risk.`,
      },
    ),
    fix: 'Use rolling, blue-green or canary deployments with automated rollback.',
  },
  {
    id: 'CD-04',
    dimension: 'cicd',
    title: 'Pipeline deploys to every workload',
    severity: 'major',
    applies: (c) => ofCategory(c.graph, 'cicd').length > 0 && servingPrimary(c.graph).length > 0,
    run: perNode(
      (c) => ofCategory(c.graph, ...SERVING_CATEGORIES),
      (n, c) => !(c.graph.inc.get(n.node.id) ?? []).some((e) => e.kind === 'deploy'),
      {
        pass: 'Every workload has a deployment connection from the pipeline.',
        fail: (n) => `${n} have no deployment connection from CI/CD.`,
      },
    ),
    fix: 'Connect the pipeline to each workload with a deployment edge.',
  },

  // ───────── Cost ─────────
  {
    id: 'CST-01',
    dimension: 'cost',
    title: 'Estimated cost fits the budget',
    severity: 'major',
    applies: (c) => c.scenario.workload.monthlyBudgetUsd > 0 && c.graph.nodes.length > 0,
    run: (c) => {
      const { monthlyUsd, byNode } = c.cost
      const budget = c.scenario.workload.monthlyBudgetUsd
      const top = Object.entries(byNode)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id]) => id)
      return monthlyUsd <= budget
        ? pass(
            `~$${monthlyUsd.toLocaleString('en-US')}/month vs $${budget.toLocaleString('en-US')} budget (indicative).`,
          )
        : {
            ok: false,
            nodeIds: top,
            severity: monthlyUsd > budget * 1.5 ? 'critical' : 'major',
            evidence: `~$${monthlyUsd.toLocaleString('en-US')}/month exceeds the $${budget.toLocaleString('en-US')} budget (indicative). Largest: ${list(c, top)}.`,
          }
    },
    fix: 'Right-size the largest components or remove redundancy the requirements do not need.',
  },
  {
    id: 'CST-02',
    dimension: 'cost',
    title: 'Serving tier is not heavily over-provisioned',
    severity: 'minor',
    applies: (c) => servingPrimary(c.graph).some((n) => !hasTrait(n.def, 'serverless')),
    run: (c) => {
      const serving = servingPrimary(c.graph).filter((n) => !hasTrait(n.def, 'serverless'))
      const base = serving.reduce((s, n) => s + baselineCapacity(n), 0)
      const peak = c.scenario.workload.peakRps
      return base <= peak * 4
        ? pass('Baseline capacity is within 4x of peak load.')
        : fail(
            c,
            ids(serving),
            (n) =>
              `Baseline capacity ~${Math.round(base)} rps is over 4x the ${peak} rps peak (${n}).`,
          )
    },
    fix: 'Reduce replicas or size and rely on autoscaling for peaks.',
  },
  {
    id: 'CST-03',
    dimension: 'cost',
    title: 'Multi-region cost is justified by the requirements',
    severity: 'minor',
    applies: (c) => c.graph.nodes.some((n) => n.node.config.region === 'secondary'),
    run: (c) => {
      const w = c.scenario.workload
      const justified = w.availabilityTarget >= 99.95 || w.rtoMinutes <= 60 || w.rpoMinutes <= 15
      return justified
        ? pass('Availability, RTO or RPO targets justify a second region.')
        : fail(
            c,
            ids(c.graph.nodes.filter((n) => n.node.config.region === 'secondary')),
            (n) => `A second region (${n}) doubles cost without a requirement that needs it.`,
          )
    },
    fix: 'Drop the secondary region or tighten the stated requirements.',
  },

  // ───────── Operational complexity ─────────
  {
    id: 'OPX-01',
    dimension: 'operational-complexity',
    title: 'Component count matches the scale',
    severity: 'minor',
    applies: (c) => c.graph.nodes.length > 0,
    run: (c) => {
      const count = c.graph.nodes.filter((n) => n.def.category !== 'client').length
      const allowed = Math.min(30, 12 + 3 * Math.floor(c.scenario.workload.peakRps / 5000))
      return count <= allowed
        ? pass(`${count} components for ${c.scenario.workload.peakRps} rps (limit ${allowed}).`)
        : {
            ok: false,
            evidence: `${count} components for ${c.scenario.workload.peakRps} rps exceeds the ${allowed} a team can reasonably operate.`,
          }
    },
    fix: 'Consolidate components or use managed services to reduce what is operated.',
  },
  {
    id: 'OPX-02',
    dimension: 'operational-complexity',
    title: 'Kubernetes is justified by the workload',
    severity: 'minor',
    applies: (c) => ofCategory(c.graph, 'kubernetes').length > 0,
    run: (c) => {
      const workloads = ofCategory(c.graph, ...SERVING_CATEGORIES).length
      return c.scenario.workload.peakRps >= 3000 || workloads >= 3
        ? pass('Scale or service count justifies a cluster.')
        : fail(
            c,
            ids(ofCategory(c.graph, 'kubernetes')),
            (n) =>
              `${n} adds upgrades, networking and capacity management for only ${c.scenario.workload.peakRps} rps and ${workloads} workload${workloads === 1 ? '' : 's'}.`,
          )
    },
    fix: 'Use a simpler managed compute service until scale demands orchestration.',
  },
  {
    id: 'OPX-03',
    dimension: 'operational-complexity',
    title: 'Single cloud provider',
    severity: 'minor',
    applies: (c) =>
      new Set(c.graph.nodes.map((n) => n.def.provider).filter((p) => p !== 'generic')).size >= 2,
    run: (c) => ({
      ok: false,
      evidence:
        'AWS and Azure components are mixed; two clouds double IAM, networking and tooling to operate.',
      nodeIds: ids(c.graph.nodes.filter((n) => n.def.provider !== 'generic')),
    }),
    fix: 'Standardise on one provider unless a requirement forces multi-cloud.',
  },
  {
    id: 'OPX-04',
    dimension: 'operational-complexity',
    title: 'No orphan components',
    severity: 'minor',
    applies: (c) => c.graph.nodes.length >= 2,
    run: perNode(
      (c) => c.graph.nodes,
      (n, c) =>
        (c.graph.out.get(n.node.id) ?? []).length + (c.graph.inc.get(n.node.id) ?? []).length === 0,
      { pass: 'Every component is connected.', fail: (n) => `${n} are not connected to anything.` },
    ),
    fix: 'Connect or remove the unused components.',
  },
]

function publicEntries(g: Graph): ResolvedNode[] {
  const edge = ofCategory(g, 'cdn', 'load-balancer').filter(
    (n) => n.node.config.exposure === 'public',
  )
  if (edge.length > 0) return edge
  return ofCategory(g, ...SERVING_CATEGORIES).filter((n) => n.node.config.exposure === 'public')
}

// ───────── Scenario requirements ─────────

export function evaluateRequirementCheck(
  check: RequirementCheck,
  graph: Graph,
): { ok: boolean; nodeIds: string[]; evidence: string } {
  switch (check.kind) {
    case 'has-category': {
      const min = check.min ?? 1
      const found = ofCategory(graph, check.category)
      return {
        ok: found.length >= min,
        nodeIds: ids(found),
        evidence: `${found.length} ${check.category} component${found.length === 1 ? '' : 's'} present (need ${min}).`,
      }
    }
    case 'min-zones': {
      const nodes = ofCategory(graph, ...check.categories).filter(notSecondary)
      const bad = nodes.filter((n) => n.node.config.zones < check.zones)
      return {
        ok: nodes.length > 0 && bad.length === 0,
        nodeIds: ids(bad),
        evidence:
          nodes.length === 0
            ? 'No matching components yet.'
            : bad.length === 0
              ? `All span ${check.zones}+ zones.`
              : `${bad.length} of ${nodes.length} span fewer than ${check.zones} zones.`,
      }
    }
    case 'multi-region': {
      const hasPrimary = graph.nodes.some(
        (n) =>
          n.node.config.region === 'primary' &&
          ['compute', 'kubernetes', 'database'].includes(n.def.category),
      )
      const secondary = graph.nodes.filter(
        (n) =>
          n.node.config.region === 'secondary' &&
          ['compute', 'kubernetes', 'database'].includes(n.def.category),
      )
      return {
        ok: hasPrimary && secondary.length > 0,
        nodeIds: ids(secondary),
        evidence:
          secondary.length > 0
            ? 'A secondary region runs workloads.'
            : 'Everything runs in the primary region.',
      }
    }
    case 'property': {
      const nodes = ofCategory(graph, check.category)
      const matching = nodes.filter((n) => n.node.config[check.key] === check.value)
      const ok =
        check.scope === 'all'
          ? nodes.length > 0 && matching.length === nodes.length
          : matching.length > 0
      return {
        ok,
        nodeIds: ids(nodes.filter((n) => !matching.includes(n))),
        evidence:
          nodes.length === 0
            ? `No ${check.category} component yet.`
            : `${matching.length} of ${nodes.length} ${check.category} components have ${check.key} = ${String(check.value)}.`,
      }
    }
    case 'path': {
      const ok = hasPath(graph, check.from, check.to)
      return {
        ok,
        nodeIds: [],
        evidence: ok
          ? `${check.from} reaches ${check.to}.`
          : `No connection path from ${check.from} to ${check.to}.`,
      }
    }
  }
}
