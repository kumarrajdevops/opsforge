import type { EvidenceItem } from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { collectEvidence } from '../readiness-evidence/collect'
import { buildResumeRecord } from './claims'
import { assessResumeTools } from './tools'

const RESUME = buildResumeRecord({
  id: 'r',
  text: 'EXPERIENCE\n- Implemented Kubernetes for 40 services across 3 regions\n- Wrote Terraform modules for AWS accounts\n\nSKILLS\nPrometheus, Docker\n',
  format: 'paste',
  now: '2026-01-01T00:00:00.000Z',
})

function tested(technology: string, score: number, n: number): EvidenceItem[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t:${technology}:${i}`,
    technology,
    source: 'interview' as const,
    strength: 'tested' as const,
    score,
    label: 'Interview',
    at: '2026-01-02T00:00:00.000Z',
    adjacent: false,
  }))
}

describe('assessResumeTools', () => {
  it('is empty without a resume', () => {
    expect(assessResumeTools(null, [])).toEqual([])
  })

  it('lists every tool the resume names, all merely claimed without scored answers', () => {
    const tools = assessResumeTools(RESUME, collectEvidence({ sessions: [], resume: RESUME }))
    const ids = tools.map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining(['kubernetes', 'terraform', 'aws', 'prometheus', 'docker']),
    )
    expect(tools.every((t) => t.status === 'claimed-untested' && t.score === null)).toBe(true)
    expect(tools.every((t) => t.testedAnswers === 0)).toBe(true)
  })

  it('separates work claims from skills-list entries', () => {
    const tools = assessResumeTools(RESUME, collectEvidence({ sessions: [], resume: RESUME }))
    const k8s = tools.find((t) => t.id === 'kubernetes')!
    const docker = tools.find((t) => t.id === 'docker')!
    expect(k8s.workClaimIds).toHaveLength(1)
    expect(docker.workClaimIds).toHaveLength(0)
    expect(docker.claimIds).toHaveLength(1)
  })

  it('grades readiness from scored answers only and puts the weakest first', () => {
    const evidence = [
      ...collectEvidence({ sessions: [], resume: RESUME }),
      ...tested('kubernetes', 82, 3),
      ...tested('terraform', 30, 2),
    ]
    const tools = assessResumeTools(RESUME, evidence)
    const by = Object.fromEntries(tools.map((t) => [t.id, t]))
    expect(by.kubernetes).toMatchObject({ status: 'demonstrated', score: 82, testedAnswers: 3 })
    expect(by.terraform).toMatchObject({ status: 'weak', score: 30, testedAnswers: 2 })
    expect(tools[0]?.id).toBe('terraform')
    expect(tools.findIndex((t) => t.id === 'kubernetes')).toBeGreaterThan(
      tools.findIndex((t) => t.status === 'claimed-untested'),
    )
  })
})
