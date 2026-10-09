import { describe, expect, it } from 'vitest'
import { analyzeJd } from './analyze'

const JD = `Senior Site Reliability Engineer

About us
We are a fast-growing company with great benefits and Python tooling.

Responsibilities
- Design and operate our Kubernetes platform across multiple regions
- Own incident response and lead blameless post-mortems
- Build CI/CD pipelines with GitHub Actions and improve deployment safety
- Mentor engineers and partner with product teams on reliability goals
- Define SLOs and improve monitoring with Prometheus and Grafana

Requirements
- 6+ years of experience running production systems
- Strong experience with Kubernetes, Docker and Terraform
- Hands-on AWS experience (EC2, VPC, IAM)
- Experience with on-call rotations and capacity planning

Nice to have
- Experience with service mesh
- Familiarity with Vault and Ansible
- Terraform Cloud is a plus

Benefits
Free lunch and Jenkins for everyone.
`

const analysis = analyzeJd({ id: 'jd-1', text: JD, now: '2026-01-01T00:00:00.000Z' })
const tech = (id: string) => analysis.technologies.find((t) => t.id === id)

describe('analyzeJd technologies', () => {
  it('splits required from preferred', () => {
    expect(tech('kubernetes')?.priority).toBe('required')
    expect(tech('terraform')?.priority).toBe('required')
    expect(tech('aws')?.priority).toBe('required')
    expect(tech('service-mesh')?.priority).toBe('preferred')
    expect(tech('vault')?.priority).toBe('preferred')
    expect(tech('ansible')?.priority).toBe('preferred')
  })

  it('upgrades to required when any sentence requires it', () => {
    expect(tech('terraform')?.priority).toBe('required')
  })

  it('ignores benefits and about sections and keeps quotes from the text', () => {
    expect(tech('jenkins')).toBeUndefined()
    expect(tech('python')).toBeUndefined()
    for (const t of analysis.technologies) expect(JD).toContain(t.quote.replace(/…$/, ''))
  })

  it('lists required technologies first', () => {
    const firstPreferred = analysis.technologies.findIndex((t) => t.priority === 'preferred')
    const lastRequired = analysis.technologies.map((t) => t.priority).lastIndexOf('required')
    expect(lastRequired).toBeLessThan(firstPreferred)
  })
})

describe('analyzeJd responsibilities', () => {
  it('extracts each responsibility with a theme and its technologies', () => {
    expect(analysis.responsibilities).toHaveLength(5)
    const byText = (s: string) => analysis.responsibilities.find((r) => r.text.includes(s))
    expect(byText('incident response')?.theme).toBe('reliability')
    expect(byText('CI/CD')?.theme).toBe('delivery')
    expect(byText('Mentor')?.theme).toBe('leadership')
    expect(byText('SLOs')?.theme).toBe('observability')
    expect(byText('Kubernetes platform')?.technologies).toContain('kubernetes')
  })
})

describe('analyzeJd seniority', () => {
  it('reads the title, years and role signals', () => {
    const kinds = analysis.seniority.map((s) => s.kind)
    expect(kinds).toEqual(expect.arrayContaining(['title', 'years', 'ownership', 'on-call']))
    expect(analysis.seniority.find((s) => s.kind === 'years')?.level).toBe('senior')
    expect(analysis.title).toBe('Senior Site Reliability Engineer')
    expect(analysis.seniorityLevel).toBe('senior')
  })

  it('derives a level from signals when there is no title', () => {
    const a = analyzeJd({
      id: 'x',
      text: '- 10+ years running distributed systems\n- Set the technical direction across the org',
      now: 'n',
    })
    expect(a.seniorityLevel).toBe('staff')
  })

  it('returns null when the posting says too little', () => {
    expect(
      analyzeJd({ id: 'x', text: 'We need someone to help out.', now: 'n' }).seniorityLevel,
    ).toBeNull()
  })
})

describe('analyzeJd skills', () => {
  it('extracts non-technology skills with priority and an evidence technology', () => {
    const skill = (label: string) => analysis.skills.find((s) => s.label === label)
    expect(skill('Incident response')?.evidenceTechnology).toBe('sre')
    expect(skill('Capacity and performance')?.priority).toBe('required')
    expect(skill('Mentoring')?.area).toBe('leadership')
    expect(skill('Monitoring and alerting')).toBeDefined()
  })

  it('handles empty text', () => {
    const a = analyzeJd({ id: 'x', text: '', now: 'n' })
    expect(a.technologies).toEqual([])
    expect(a.responsibilities).toEqual([])
    expect(a.skills).toEqual([])
  })
})

describe('analyzeJd real-world postings', () => {
  const POSTING = `Cloud & DevOps Engineer

We are looking for a Cloud & DevOps Engineer to join our platform team.

Your Impact OR Responsibilities
- Build and operate Kubernetes clusters on AWS for our product teams
- Automate delivery with Jenkins and Terraform pipelines

Your Skills & Experience
- 5 to 9 years of experience in cloud infrastructure
- Hands-on Docker and Linux administration
`

  it('takes the lower bound of a years range, so 5 to 9 years is senior, not staff', () => {
    const a = analyzeJd({ id: 'p', text: POSTING, now: 'n' })
    expect(a.seniority.find((s) => s.kind === 'years')?.level).toBe('senior')
    expect(a.seniorityLevel).not.toBe('staff')
  })

  it('recognises “Your Skills & Experience” and “Your Impact” headings', () => {
    const a = analyzeJd({ id: 'p', text: POSTING, now: 'n' })
    expect(a.responsibilities.length).toBeGreaterThanOrEqual(2)
    const docker = a.technologies.find((t) => t.id === 'docker')
    expect(docker?.priority).toBe('required')
  })

  it('finds the title in a “looking for a …” sentence when the first line is not one', () => {
    const a = analyzeJd({
      id: 'p',
      text: 'About the role\nWe are looking for a Cloud & DevOps Engineer to run Kubernetes on AWS.\n\nRequirements\n- Kubernetes experience\n',
      now: 'n',
    })
    expect(a.title).toBe('Cloud & DevOps Engineer')
  })
})

describe('analyzeJd alternatives', () => {
  const analyse = (text: string) => analyzeJd({ id: 'a', text, now: 'n' })

  it('groups "at least one of" cloud providers into one choice', () => {
    const a = analyse(
      'Requirements\n- Hands-on experience with at least one of AWS, Azure or GCP\n- Strong Kubernetes experience\n',
    )
    expect(a.alternatives).toHaveLength(1)
    expect(a.alternatives?.[0]?.options).toEqual(['aws', 'azure', 'gcp'])
    expect(a.alternatives?.[0]?.priority).toBe('required')
    expect(a.technologies.find((t) => t.id === 'aws')?.group).toBe(a.alternatives?.[0]?.id)
    expect(a.technologies.find((t) => t.id === 'kubernetes')?.group).toBeUndefined()
  })

  it('groups a cue line followed by a bullet list of tools', () => {
    const a = analyse(
      'Requirements\n- Experience with one of the following cloud platforms:\n- AWS\n- Azure\n- GCP\n- Docker\n',
    )
    expect(a.alternatives?.[0]?.options).toEqual(['aws', 'azure', 'gcp'])
  })

  it('groups tools of one kind joined by "or", but not an "and" list', () => {
    expect(analyse('Requirements\n- Jenkins or GitLab CI experience\n').alternatives).toHaveLength(
      1,
    )
    expect(analyse('Requirements\n- Jenkins and GitLab CI experience\n').alternatives).toHaveLength(
      0,
    )
  })

  it('keeps a tool separate when the posting also asks for it on its own', () => {
    const a = analyse(
      'Requirements\n- At least one of AWS, Azure or GCP\n- Deep AWS networking knowledge\n',
    )
    expect(a.technologies.find((t) => t.id === 'aws')?.group).toBeUndefined()
    expect(a.technologies.find((t) => t.id === 'azure')?.group).toBeDefined()
  })

  it('groups a Word-style list: cue line, then "o" sub-bullets with details in brackets', () => {
    const a = analyse(
      [
        'Requirements',
        '•\tExpertise in at-least one Cloud Must Have ',
        'o\tGCP (Compute, IAM, VPC, Kubernetes, Pub-Sub)  ',
        'o\tAzure (Virtual Machines, Azure Active Directory, Blob Storage) ',
        'o\tAWS (EC2, IAM, VPC, S3, Lambda, RDS)',
        '•\tStrong Terraform experience',
      ].join('\n'),
    )
    expect(a.alternatives).toHaveLength(1)
    expect(new Set(a.alternatives?.[0]?.options)).toEqual(new Set(['aws', 'azure', 'gcp']))
    expect(a.alternatives?.[0]?.priority).toBe('required')
    expect(a.technologies.find((t) => t.id === 'terraform')?.group).toBeUndefined()
  })

  it('does not treat a tool named only as an example as a separate requirement', () => {
    const a = analyse(
      'Requirements\n- At least one of AWS, Azure or GCP\n- Managing container infrastructure (e.g., AWS ECS or GKE)\n',
    )
    expect(a.technologies.find((t) => t.id === 'aws')?.group).toBeDefined()
  })

  it('does not group tools of different kinds', () => {
    expect(analyse('Requirements\n- One of Kubernetes or Terraform\n').alternatives).toHaveLength(0)
  })
})
