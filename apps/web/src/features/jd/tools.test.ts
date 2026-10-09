import type { EvidenceItem } from '@opsforge/types'
import { describe, expect, it } from 'vitest'
import { analyzeJd } from './analyze'
import { assessJdTools } from './tools'

const jd = analyzeJd({
  id: 'j',
  now: 'n',
  text: [
    'Cloud Engineer',
    '',
    'Requirements',
    '- Strong Kubernetes and Terraform experience',
    '- At least one of AWS, Azure or GCP',
    '',
    'Nice to have',
    '- Familiarity with Vault',
  ].join('\n'),
})

const item = (
  technology: string,
  strength: EvidenceItem['strength'],
  score: number | null,
  source: EvidenceItem['source'] = 'interview',
  n = 0,
): EvidenceItem => ({
  id: `${technology}-${strength}-${n}`,
  technology,
  source,
  strength,
  score,
  label: `${source} ${n}`,
  at: `2026-01-0${n + 1}`,
  adjacent: false,
})

describe('assessJdTools', () => {
  it('returns nothing without a posting', () => {
    expect(assessJdTools(null, [])).toEqual([])
  })

  it('lists every tool the posting names, required first', () => {
    const tools = assessJdTools(jd, [])
    expect(tools.map((t) => t.id).sort()).toEqual(
      ['aws', 'azure', 'gcp', 'kubernetes', 'terraform', 'vault'].sort(),
    )
    expect(tools.at(-1)?.id).toBe('vault')
    expect(tools.at(-1)?.priority).toBe('preferred')
  })

  it('marks each option of an "at least one of" group with its group', () => {
    const tools = assessJdTools(jd, [])
    expect(tools.find((t) => t.id === 'aws')?.choiceOf).toBe('One of AWS / Azure / GCP')
    expect(tools.find((t) => t.id === 'kubernetes')?.choiceOf).toBeNull()
  })

  it('scores from tested answers only and counts resume claims separately', () => {
    const tools = assessJdTools(jd, [
      item('kubernetes', 'tested', 80, 'interview', 0),
      item('kubernetes', 'tested', 90, 'drill', 1),
      item('terraform', 'claimed', null, 'resume', 0),
      item('terraform', 'claimed', null, 'resume', 1),
    ])
    const k8s = tools.find((t) => t.id === 'kubernetes')
    expect(k8s).toMatchObject({ status: 'demonstrated', score: 85, testedAnswers: 2, claims: 0 })
    const tf = tools.find((t) => t.id === 'terraform')
    expect(tf).toMatchObject({
      status: 'claimed-untested',
      score: null,
      testedAnswers: 0,
      claims: 2,
    })
  })

  it('puts the weakest required tool before the strongest', () => {
    const tools = assessJdTools(jd, [
      item('kubernetes', 'tested', 80, 'interview', 0),
      item('kubernetes', 'tested', 90, 'drill', 1),
      item('terraform', 'tested', 10, 'interview', 2),
    ])
    const required = tools.filter((t) => t.priority === 'required').map((t) => t.id)
    expect(required.indexOf('terraform')).toBeLessThan(required.indexOf('kubernetes'))
  })
})
