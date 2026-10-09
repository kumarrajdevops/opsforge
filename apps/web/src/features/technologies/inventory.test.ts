import { describe, expect, it } from 'vitest'
import { findTechnology, isTool, TECHNOLOGIES, technologiesIn } from './catalog'
import INVENTORY from './inventory.json'
import { aliasesOf, buildInventoryCatalog, categoryOf, platformOf } from './inventory'

describe('shared tools inventory', () => {
  it('adds the inventory tools to the catalog without duplicate ids', () => {
    const ids = TECHNOLOGIES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(TECHNOLOGIES.length).toBeGreaterThan(400)
  })

  it('recognises tools from every kind of discipline', () => {
    const ids = technologiesIn(
      'Airflow DAGs, MLflow, Kyverno policies, Keycloak SSO, Playwright tests, Backstage portal, Kubecost reports',
    )
    for (const id of [
      'apache-airflow',
      'mlflow',
      'kyverno',
      'keycloak',
      'playwright',
      'backstage',
    ]) {
      expect(ids.some((found) => found.includes(id.split('-').pop()!))).toBe(true)
    }
    expect(ids).toContain('kubecost')
  })

  it('folds cloud-vendor services into their platform', () => {
    expect(platformOf('Amazon Bedrock')).toBe('aws')
    expect(platformOf('Google Cloud Armor')).toBe('gcp')
    expect(technologiesIn('Models on Amazon Bedrock')).toEqual(['aws'])
    expect(TECHNOLOGIES.some((t) => t.label === 'Amazon Bedrock')).toBe(false)
  })

  it('treats Azure Active Directory as Azure but plain Active Directory as its own tool', () => {
    expect(technologiesIn('Azure Active Directory')).toEqual(['azure'])
    expect(technologiesIn('Active Directory administration')).toEqual(['active-directory'])
  })

  it('keeps product suites and distinct products as before', () => {
    expect(technologiesIn('Elasticsearch and Kibana')).toEqual(['elk'])
    expect(technologiesIn('Jenkins and GitLab')).toEqual(['jenkins', 'gitlab'])
  })

  it('does not invent tools from ordinary words', () => {
    const text =
      'We make things and just go. Take a task, set a port, follow the guidance, use a vector, mark it, ' +
      'a compass, continue to salt the cursor with a comet; kind regards. The ray of neon harness was a dex of notion.'
    expect(technologiesIn(text).filter(isTool)).toEqual([])
  })

  it('matches ambiguous names only when written as the product', () => {
    expect(technologiesIn('Notion, Slack and Harness')).toEqual(
      expect.arrayContaining(['notion', 'slack', 'harness']),
    )
    expect(technologiesIn('Ray').length).toBe(1)
  })

  it('matches names with symbols', () => {
    expect(technologiesIn('Wrote C++ and C# services')).toEqual(
      expect.arrayContaining(['cpp', 'csharp']),
    )
    expect(technologiesIn('Nothing in C major')).toEqual([])
  })

  it('no longer reads Argo Workflows as Argo CD', () => {
    const ids = technologiesIn('Argo Workflows for batch jobs')
    expect(ids).not.toContain('argocd')
    expect(ids).toContain('argo-workflows')
  })

  it('carries the official links for inventory tools', () => {
    expect(findTechnology('kyverno')?.links?.website).toMatch(/^https?:\/\//)
  })

  it('derives spellings from abbreviations, slashes and the Apache prefix', () => {
    expect(aliasesOf('Open Policy Agent (OPA)')).toEqual(
      expect.arrayContaining(['Open Policy Agent!', '=OPA']),
    )
    expect(aliasesOf('Apache Airflow')).toEqual(expect.arrayContaining(['=Airflow']))
    expect(aliasesOf('Foobar / Bazqux')).toEqual(['Foobar!', 'Bazqux!'])
    expect(aliasesOf('Abc')).toEqual(['=Abc'])
  })

  it('classifies by discipline', () => {
    expect(categoryOf({ discipline: 'MLOps', name: 'MLflow' })).toBe('ai')
    expect(categoryOf({ discipline: 'DevSecOps and Security', name: 'Falco' })).toBe('security')
  })

  it('drops duplicate names and prefers the non-AI discipline', () => {
    const built = buildInventoryCatalog(
      [
        { id: 1, discipline: 'MLOps', name: 'Widgetron', category: '', website: '', docs: '' },
        {
          id: 2,
          discipline: 'Data Engineering',
          name: 'Widgetron',
          category: '',
          website: '',
          docs: '',
        },
      ],
      { isCovered: () => false, knownIds: [], topicFor: () => 'architecture' },
    )
    expect(built.entries).toHaveLength(1)
    expect(built.entries[0]?.category).toBe('data')
  })

  it('lists every distinct inventory name at most once', () => {
    const names = new Set(INVENTORY.map((row) => row.name.toLowerCase()))
    expect(names.size).toBeGreaterThan(600)
    expect(TECHNOLOGIES.length).toBeLessThanOrEqual(names.size + 120)
  })
})
