import { describe, expect, it } from 'vitest'
import type {
  ArchitectureDocument,
  ArchitectureReviewProvider,
  ArchitectureVersion,
} from '@opsforge/types'
import { COMPONENT_CATALOG, getComponent, CATEGORY_ORDER } from './catalog'
import { DIMENSIONS, deterministicEvaluator, CRITICAL_CAP } from './evaluator'
import {
  addNode,
  connect,
  emptyDocument,
  removeNodes,
  sanitizeDocument,
  semanticKey,
  moveNode,
  updateNodeConfig,
} from './documentOps'
import { LocalStorageArchitectureRepository } from './repository'
import { SCENARIOS, starterDocument } from './scenarios'
import { simulateFailure } from './simulation'
import { contentHash, diffVersions, summarize } from './versioning'
import {
  ReviewProviderRegistry,
  ReviewValidationError,
  runReview,
  validateReviewResult,
} from './review'

const payments = SCENARIOS[0]!
const media = SCENARIOS[2]!

function evaluate(scenarioIndex: number, doc: ArchitectureDocument) {
  return deterministicEvaluator.evaluate({ scenario: SCENARIOS[scenarioIndex]!, document: doc })
}

describe('catalog', () => {
  it('has unique ids, provider coverage and all required categories', () => {
    const ids = COMPONENT_CATALOG.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const provider of ['aws', 'azure', 'generic']) {
      expect(COMPONENT_CATALOG.some((c) => c.provider === provider)).toBe(true)
    }
    for (const category of CATEGORY_ORDER) {
      expect(
        COMPONENT_CATALOG.some((c) => c.category === category),
        category,
      ).toBe(true)
    }
    for (const def of COMPONENT_CATALOG) {
      expect(def.id.startsWith(def.provider + '-'), def.id).toBe(true)
    }
  })
})

describe('deterministic evaluator', () => {
  it('scores all twelve dimensions', () => {
    expect(DIMENSIONS).toHaveLength(12)
    const result = evaluate(0, starterDocument(payments.id))
    expect(result.dimensions.map((d) => d.id).sort()).toEqual(DIMENSIONS.map((d) => d.id).sort())
  })

  it('is deterministic', () => {
    const doc = starterDocument(payments.id)
    expect(evaluate(0, doc)).toEqual(evaluate(0, doc))
  })

  it('gives no score for an empty canvas rather than zero', () => {
    const result = evaluate(0, emptyDocument())
    expect(result.overall).toBeNull()
    expect(result.dimensions.every((d) => d.score === null)).toBe(true)
  })

  it('caps the overall score while a critical check fails', () => {
    const result = evaluate(0, starterDocument(payments.id))
    expect(result.checks.some((c) => c.status === 'fail' && c.severity === 'critical')).toBe(true)
    expect(result.overall).not.toBeNull()
    expect(result.overall!).toBeLessThanOrEqual(CRITICAL_CAP)
  })

  it('does not change when only positions change', () => {
    const doc = starterDocument(payments.id)
    const moved = moveNode(doc, doc.nodes[0]!.id, { x: 999, y: 999 })
    expect(semanticKey(moved)).toBe(semanticKey(doc))
    expect(evaluate(0, moved)).toEqual(evaluate(0, doc))
  })

  it('improves when a gap is fixed', () => {
    const doc = starterDocument(payments.id)
    const before = evaluate(0, doc)
    let next = updateNodeConfig(doc, 'db', {
      zones: 2,
      failover: 'automatic',
      encryptedAtRest: true,
    })
    next = updateNodeConfig(next, 'api', { zones: 3, autoscaling: true })
    next = updateNodeConfig(next, 'alb', { zones: 3 })
    const after = evaluate(0, next)
    expect(after.overall!).toBeGreaterThan(before.overall!)
    const avail = (e: typeof before) => e.dimensions.find((d) => d.id === 'availability')!.score!
    expect(avail(after)).toBeGreaterThan(avail(before))
  })

  it('evaluates the requirement DSL', () => {
    const doc = starterDocument(payments.id)
    const reqs = evaluate(0, doc).checks.filter((c) => c.dimension === 'requirements')
    expect(reqs).toHaveLength(payments.requirements.length)
    const waf = addNode(doc, 'aws-waf', { x: 0, y: 0 }, 'waf').document
    const wired = connect(connect(waf, 'client', 'waf').document, 'waf', 'dns').document
    const rewired = evaluate(0, wired).checks.find((c) => c.checkId === 'REQ-01')!
    expect(rewired.status).toBe('pass')
  })

  it('estimates cost as indicative', () => {
    const result = evaluate(0, starterDocument(payments.id))
    expect(result.cost.indicative).toBe(true)
    expect(result.cost.monthlyUsd).toBeGreaterThan(0)
  })

  it('produces failures with evidence and a fix', () => {
    const failures = evaluate(2, starterDocument(media.id)).checks.filter(
      (c) => c.status === 'fail',
    )
    expect(failures.length).toBeGreaterThan(0)
    for (const f of failures) {
      expect(f.evidence.length).toBeGreaterThan(0)
      expect(f.fix?.length).toBeGreaterThan(0)
    }
  })
})

describe('document operations', () => {
  it('adds, connects and removes', () => {
    const a = addNode(emptyDocument(), 'generic-service', { x: 0, y: 0 }, 'a')
    const b = addNode(a.document, 'generic-sql', { x: 100, y: 0 }, 'b')
    const c = connect(b.document, 'a', 'b', 'e1')
    expect(c.document.edges[0]!.kind).toBe('data')
    expect(connect(c.document, 'a', 'b').edgeId).toBeNull()
    expect(connect(c.document, 'a', 'a').edgeId).toBeNull()
    const removed = removeNodes(c.document, ['b'])
    expect(removed.edges).toHaveLength(0)
  })

  it('rejects unknown components and cleans persisted junk', () => {
    expect(addNode(emptyDocument(), 'nope', { x: 0, y: 0 }).nodeId).toBeNull()
    const dirty = sanitizeDocument({
      nodes: [
        { id: 'x', componentId: 'generic-sql', label: 'x', position: { x: 1, y: 2 }, config: {} },
        { id: 'y', componentId: 'gone', label: 'y', position: { x: 1, y: 2 }, config: {} },
      ],
      edges: [{ id: 'e', source: 'x', target: 'y', kind: 'data', encrypted: true }],
    })
    expect(dirty!.nodes).toHaveLength(1)
    expect(dirty!.edges).toHaveLength(0)
    expect(sanitizeDocument('nonsense')).toBeNull()
  })

  it('labels repeated components distinctly', () => {
    let doc = addNode(emptyDocument(), 'generic-service', { x: 0, y: 0 }, 'a').document
    doc = addNode(doc, 'generic-service', { x: 0, y: 0 }, 'b').document
    expect(doc.nodes[1]!.label).toBe(`${getComponent('generic-service')!.name} 2`)
  })
})

describe('failure simulation', () => {
  it('takes the site down when the single-zone tier loses a zone', () => {
    const result = simulateFailure(payments, starterDocument(payments.id), { kind: 'zone-loss' })
    expect(result.userImpact).toBe('outage')
    expect(result.observations.length).toBeGreaterThan(0)
  })

  it('survives a zone loss once the tiers are multi-zone and autoscaled', () => {
    let doc = starterDocument(payments.id)
    doc = updateNodeConfig(doc, 'alb', { zones: 3 })
    doc = updateNodeConfig(doc, 'api', { zones: 3, autoscaling: true })
    doc = updateNodeConfig(doc, 'db', { zones: 2, failover: 'automatic' })
    const result = simulateFailure(payments, doc, { kind: 'zone-loss' })
    expect(result.userImpact).not.toBe('outage')
  })

  it('reports no recovery path for a region loss without a second region', () => {
    const result = simulateFailure(payments, starterDocument(payments.id), { kind: 'region-loss' })
    expect(result.userImpact).toBe('outage')
    expect(result.recovery?.estimatedRtoMinutes).toBeNull()
    expect(result.recovery?.meetsRto).toBe(false)
  })

  it('degrades but does not take users down when a cache is lost', () => {
    let doc = starterDocument(payments.id)
    doc = addNode(doc, 'aws-elasticache', { x: 0, y: 0 }, 'cache').document
    doc = connect(doc, 'api', 'cache').document
    const result = simulateFailure(payments, doc, { kind: 'node-loss', nodeId: 'cache' })
    expect(result.nodeImpact['api']).toBe('degraded')
    expect(result.userImpact).not.toBe('outage')
  })
})

describe('versioning', () => {
  const memory = () => {
    const map = new Map<string, string>()
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    }
  }

  it('hashes by content, ignoring tiny position jitter and ordering', () => {
    const doc = starterDocument(payments.id)
    const reordered = { ...doc, nodes: [...doc.nodes].reverse() }
    expect(contentHash(reordered)).toBe(contentHash(doc))
    expect(contentHash(updateNodeConfig(doc, 'db', { zones: 3 }))).not.toBe(contentHash(doc))
  })

  it('stores versions, skips duplicates and diffs them', async () => {
    const repo = new LocalStorageArchitectureRepository(memory())
    const doc = starterDocument(payments.id)
    const first = await repo.saveVersion(payments.id, {
      document: doc,
      note: 'baseline',
      summary: summarize(evaluate(0, doc)),
    })
    expect(first.created).toBe(true)
    expect(first.version.number).toBe(1)

    const again = await repo.saveVersion(payments.id, {
      document: doc,
      note: 'same',
      summary: summarize(evaluate(0, doc)),
    })
    expect(again.created).toBe(false)

    const improved = updateNodeConfig(doc, 'db', { zones: 2, encryptedAtRest: true })
    const second = await repo.saveVersion(payments.id, {
      document: improved,
      note: 'harden db',
      summary: summarize(evaluate(0, improved)),
    })
    expect(second.version.number).toBe(2)

    const list: ArchitectureVersion[] = await repo.listVersions(payments.id)
    expect(list.map((v) => v.number)).toEqual([2, 1])
    const diff = diffVersions(list[1]!, list[0]!)
    expect(diff.nodesChanged[0]?.fields).toEqual(
      expect.arrayContaining(['zones', 'encryptedAtRest']),
    )
    expect(diff.overallDelta).not.toBeNull()
  })

  it('round-trips drafts and survives corrupt storage', async () => {
    const store = memory()
    const repo = new LocalStorageArchitectureRepository(store)
    const doc = starterDocument(media.id)
    await repo.saveDraft(media.id, doc)
    expect((await repo.loadDraft(media.id))?.nodes).toHaveLength(doc.nodes.length)
    store.setItem('opsforge.architecture.draft.bad', '{not json')
    expect(await repo.loadDraft('bad')).toBeNull()
  })
})

describe('AI review contract', () => {
  const doc = starterDocument(payments.id)
  const evaluation = evaluate(0, doc)
  const base = {
    providerId: 'fake',
    summary: 'The database is a single point of failure.',
    findings: [
      {
        id: 'f1',
        severity: 'major',
        dimension: 'availability',
        title: 'Single-zone DB',
        detail: 'Details',
        nodeIds: ['db'],
      },
    ],
    signals: [{ dimension: 'availability', strength: 'gap', note: 'One zone' }],
  }

  it('accepts evidence-only output', () => {
    expect(validateReviewResult(base, doc).findings).toHaveLength(1)
  })

  it('rejects scores anywhere', () => {
    expect(() => validateReviewResult({ ...base, score: 80 }, doc)).toThrow(ReviewValidationError)
    expect(() =>
      validateReviewResult({ ...base, findings: [{ ...base.findings[0], score: 3 }] }, doc),
    ).toThrow(ReviewValidationError)
    expect(() =>
      validateReviewResult({ ...base, signals: [{ ...base.signals[0], rating: 4 }] }, doc),
    ).toThrow(ReviewValidationError)
  })

  it('rejects unknown nodes and dimensions', () => {
    expect(() =>
      validateReviewResult(
        { ...base, findings: [{ ...base.findings[0], nodeIds: ['ghost'] }] },
        doc,
      ),
    ).toThrow(/unknown node/)
    expect(() =>
      validateReviewResult(
        { ...base, signals: [{ dimension: 'vibes', strength: 'gap', note: 'x' }] },
        doc,
      ),
    ).toThrow(/dimension/)
  })

  it('runs providers through validation and never alters the evaluation', async () => {
    const provider: ArchitectureReviewProvider = {
      id: 'fake',
      name: 'Fake',
      review: async () => base as never,
    }
    const registry = new ReviewProviderRegistry()
    expect(registry.isConfigured).toBe(false)
    registry.register(provider)
    expect(registry.list()).toHaveLength(1)
    const before = JSON.stringify(evaluation)
    const result = await runReview(provider, { scenario: payments, document: doc, evaluation })
    expect(result.providerId).toBe('fake')
    expect(JSON.stringify(evaluation)).toBe(before)

    const bad: ArchitectureReviewProvider = {
      id: 'bad',
      name: 'Bad',
      review: async () => ({ ...base, overall: 99 }) as never,
    }
    await expect(runReview(bad, { scenario: payments, document: doc, evaluation })).rejects.toThrow(
      ReviewValidationError,
    )
  })
})
