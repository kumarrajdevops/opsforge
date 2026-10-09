import { describe, expect, it } from 'vitest'
import type { ResumeClaimItem } from '@opsforge/types'
import { extractResume } from '../../resume/claims'
import { analyzeAnswerText } from '../../interviewer/analysis/ruleBased'
import { CATEGORY_ORDER } from './generic'
import { categoryOrderFor, generateClaimQuestions } from './generate'
import { TECHNOLOGY_PACKS } from './packs'

function claimFrom(text: string): ResumeClaimItem {
  const found = extractResume(`EXPERIENCE\n- ${text}\n`).claims[0]
  if (!found) throw new Error('no claim extracted')
  return found
}

describe('generateClaimQuestions', () => {
  it('produces one question per category for “Implemented Kubernetes”', () => {
    const claim = claimFrom('Implemented Kubernetes')
    const questions = generateClaimQuestions(claim)

    expect(questions.map((q) => q.category).sort()).toEqual([...CATEGORY_ORDER].sort())
    expect(questions).toHaveLength(8)
    for (const q of questions) {
      expect(q.id).toBe(`${claim.id}:${q.category}`)
      expect(q.spec.prompt).toContain('Implemented Kubernetes')
      expect(q.spec.concepts.length).toBeGreaterThanOrEqual(4)
      expect(q.spec.technologies).toContain('kubernetes')
    }
  })

  it('uses the technology pack except for leadership, which is generic', () => {
    const questions = generateClaimQuestions(claimFrom('Implemented Kubernetes'))
    const byCategory = new Map(questions.map((q) => [q.category, q]))
    expect(byCategory.get('architecture')?.rubric).toBe('technology-pack')
    expect(byCategory.get('leadership')?.rubric).toBe('generic')
  })

  it('falls back to the generic rubric for technologies without a pack', () => {
    const questions = generateClaimQuestions(
      claimFrom('Implemented Kafka consumers for order events'),
    )
    expect(questions).toHaveLength(8)
    expect(questions.every((q) => q.rubric === 'generic')).toBe(true)
  })

  it('still generates eight questions for a claim with no known technology', () => {
    const questions = generateClaimQuestions(
      claimFrom('Improved the on-call handoff process across three teams'),
    )
    expect(questions).toHaveLength(8)
  })

  it('leads with the categories that fit the claim kind and keeps ids stable', () => {
    expect(categoryOrderFor('leadership')[0]).toBe('leadership')
    expect(categoryOrderFor('operations')[0]).toBe('troubleshooting')
    const claim = claimFrom('Implemented Kubernetes')
    expect(generateClaimQuestions(claim).map((q) => q.id)).toEqual(
      generateClaimQuestions(claim).map((q) => q.id),
    )
  })

  it('credits an answer that names the pack rubric terms and not an empty one', () => {
    const claim = claimFrom('Implemented Kubernetes')
    const q = generateClaimQuestions(claim).find((x) => x.category === 'security')
    if (!q) throw new Error('missing security question')
    const strong = analyzeAnswerText(
      q.spec,
      'We used RBAC with least privilege roles per namespace, network policies for default deny, pod security standards, secrets from Vault rather than plain secrets, and image scanning with signed images in admission control.',
    )
    const weak = analyzeAnswerText(q.spec, 'We made it secure.')
    expect(strong.concepts.length).toBeGreaterThanOrEqual(3)
    expect(weak.concepts).toHaveLength(0)
  })
})

describe('technology packs', () => {
  it('cover the categories they claim with weighted, probe-bearing rows', () => {
    for (const pack of TECHNOLOGY_PACKS) {
      expect(Object.keys(pack.categories).length).toBeGreaterThanOrEqual(6)
      for (const category of Object.values(pack.categories)) {
        expect(category.prompt.length).toBeGreaterThan(40)
        expect(category.concepts.length).toBeGreaterThanOrEqual(4)
        for (const [label, terms, probe] of category.concepts) {
          expect(label).toBeTruthy()
          expect(terms.length).toBeGreaterThanOrEqual(3)
          expect(probe.endsWith('?')).toBe(true)
        }
      }
    }
  })
})
