import { describe, expect, it } from 'vitest'
import type { DrillAttempt, InterrogationCategory } from '@opsforge/types'
import { createAnswerAnalyzer } from '../interviewer/factory'
import { buildResumeRecord, extractResume } from '../resume/claims'
import { LocalStorageResumeRepository } from '../resume/repository'
import { assessClaim } from './defensibility'
import { evaluateDrill } from './evaluate'
import { generateClaimQuestions } from './questions/generate'

const claim = (() => {
  const found = extractResume('EXPERIENCE\n- Implemented Kubernetes\n').claims[0]
  if (!found) throw new Error('no claim')
  return found
})()
const questions = generateClaimQuestions(claim)
const analyzer = createAnswerAnalyzer(null)

const STRONG_SECURITY =
  'We used RBAC with least privilege roles per namespace, network policies for default deny, pod security standards, secrets from Vault rather than plain secrets, and image scanning with signed images in admission control.'

function attempt(category: InterrogationCategory, score: number): DrillAttempt {
  return {
    id: `a-${category}-${score}`,
    claimId: claim.id,
    category,
    questionId: `${claim.id}:${category}`,
    answer: 'x',
    answeredAt: '2026-01-01T00:00:00.000Z',
    analyzerId: 'test',
    evaluation: {
      scoringVersion: 'test',
      basis: 'rule-based',
      score,
      dimensions: [],
      concepts: [],
      redFlags: [],
      signals: [],
      followUps: { asked: 0, productive: 0 },
    },
  }
}

describe('evaluateDrill', () => {
  it('scores deterministically from analyzer evidence', async () => {
    const q = questions.find((x) => x.category === 'security')!
    const a = await evaluateDrill({ question: q, answer: STRONG_SECURITY, analyzer })
    const b = await evaluateDrill({ question: q, answer: STRONG_SECURITY, analyzer })
    expect(a.evaluation.score).toBe(b.evaluation.score)
    expect(a.claimId).toBe(claim.id)
    expect(a.analyzerId).toBe('rule-based')
    expect(a.evaluation.basis).toBe('rule-based')
  })

  it('scores a strong answer above a thin one and an empty answer at the floor', async () => {
    const q = questions.find((x) => x.category === 'security')!
    const strong = await evaluateDrill({ question: q, answer: STRONG_SECURITY, analyzer })
    const thin = await evaluateDrill({ question: q, answer: 'We made it secure.', analyzer })
    const empty = await evaluateDrill({ question: q, answer: '   ', analyzer })
    expect(strong.evaluation.score).toBeGreaterThan(thin.evaluation.score)
    expect(empty.evaluation.score).toBeLessThan(thin.evaluation.score + 1)
    expect(empty.answer).toBe('')
  })
})

describe('assessClaim', () => {
  it('is untested without attempts', () => {
    const d = assessClaim(claim.id, [])
    expect(d.level).toBe('untested')
    expect(d.score).toBeNull()
    expect(d.covered).toBe(0)
    expect(d.total).toBe(8)
  })

  it('caps a high score from too few categories at shaky', () => {
    const d = assessClaim(claim.id, [attempt('security', 95), attempt('networking', 90)])
    expect(d.score).toBe(93)
    expect(d.level).toBe('shaky')
  })

  it('takes the best attempt per category and reports the weakest', () => {
    const d = assessClaim(claim.id, [
      attempt('security', 40),
      attempt('security', 80),
      attempt('networking', 70),
      attempt('incidents', 60),
    ])
    expect(d.categories.find((c) => c.category === 'security')?.best).toBe(80)
    expect(d.categories.find((c) => c.category === 'security')?.attempts).toBe(2)
    expect(d.score).toBe(70)
    expect(d.level).toBe('defensible')
    expect(d.weakest).toBe('incidents')
  })

  it('reaches strong only with four categories at a high mean', () => {
    const d = assessClaim(claim.id, [
      attempt('security', 85),
      attempt('networking', 85),
      attempt('incidents', 85),
      attempt('architecture', 85),
    ])
    expect(d.level).toBe('strong')
  })

  it('is exposed when answers are poor', () => {
    expect(assessClaim(claim.id, [attempt('security', 20)]).level).toBe('exposed')
  })

  it('ignores attempts for other claims', () => {
    const other = { ...attempt('security', 90), claimId: 'claim-99' }
    expect(assessClaim(claim.id, [other]).level).toBe('untested')
  })
})

describe('LocalStorageResumeRepository', () => {
  const record = buildResumeRecord({
    id: 'r1',
    text: 'EXPERIENCE\n- Implemented Kubernetes\n',
    format: 'paste',
    now: '2026-01-01T00:00:00.000Z',
  })

  it('round-trips through memory when storage is unavailable', async () => {
    const repo = new LocalStorageResumeRepository(null)
    expect(await repo.load()).toBeNull()
    await repo.save(record)
    expect((await repo.load())?.claims).toHaveLength(record.claims.length)
    await repo.clear()
    expect(await repo.load()).toBeNull()
  })

  it('persists to the store and rejects corrupt data', async () => {
    const data = new Map<string, string>()
    const store = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    }
    await new LocalStorageResumeRepository(store).save(record)
    expect(await new LocalStorageResumeRepository(store).load()).not.toBeNull()
    data.set('opsforge.resume.current', '{"oops":true}')
    expect(await new LocalStorageResumeRepository(store).load()).toBeNull()
  })
})
