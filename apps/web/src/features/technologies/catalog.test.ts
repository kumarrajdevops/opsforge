import { describe, expect, it } from 'vitest'
import { isTool, technologiesIn } from './catalog'

describe('consolidated tool extraction', () => {
  it('folds cloud services into their parent platform', () => {
    const ids = technologiesIn(
      'Ran EC2, S3, Lambda, RDS and CloudWatch; GKE with Pub/Sub; Blob Storage',
    )
    expect(ids.filter((id) => id === 'aws')).toHaveLength(1)
    expect(ids).toEqual(expect.arrayContaining(['aws', 'gcp', 'azure']))
    expect(ids).not.toContain('ec2')
    expect(ids).not.toContain('s3')
  })

  it('does not treat generic IAM or VPC wording as AWS', () => {
    expect(technologiesIn('Managed IAM policies and a VPC peering design')).not.toContain('aws')
  })

  it('collapses the Elastic components into one entry', () => {
    const ids = technologiesIn('Elasticsearch, Logstash and Kibana dashboards')
    expect(ids.filter((id) => id === 'elk')).toEqual(['elk'])
  })

  it.each([
    [
      'Jenkins, GitLab CI/CD, CircleCI, Bamboo and Travis CI',
      ['jenkins', 'gitlab', 'circleci', 'bamboo', 'travis-ci'],
    ],
    [
      'Prometheus, Grafana, Datadog, New Relic and Dynatrace',
      ['prometheus', 'grafana', 'datadog', 'new-relic', 'dynatrace'],
    ],
    [
      'Terraform, Pulumi, Ansible, Chef and Puppet',
      ['terraform', 'pulumi', 'ansible', 'chef', 'puppet'],
    ],
  ])('keeps distinct products separate: %s', (text, expected) => {
    expect(technologiesIn(text)).toEqual(expect.arrayContaining(expected))
  })

  it('does not read Key Vault as Vault or GitHub Actions as GitHub', () => {
    expect(technologiesIn('Azure Key Vault for secrets')).not.toContain('vault')
    const ids = technologiesIn('Pipelines in GitHub Actions')
    expect(ids).toContain('github-actions')
    expect(ids).not.toContain('github')
  })

  it('lists DNS, load balancers and firewalls when named, and excludes concepts from tools', () => {
    const ids = technologiesIn('Configured DNS, load balancers and firewalls with a CI/CD pipeline')
    expect(ids).toEqual(expect.arrayContaining(['dns', 'load-balancer', 'firewall']))
    expect(ids.filter(isTool)).not.toContain('ci-cd')
    expect(isTool('dns')).toBe(true)
    expect(isTool('sre')).toBe(false)
  })

  it('reads the spellings a real posting uses', () => {
    const ids = technologiesIn(
      'IaC using Terraform or Cloud Formation/ARM Templates/Deployment Manager/Pulumi. ' +
        'Automate builds using Groovy, GO, Python, Shell, PowerShell. ' +
        'Observability: Jaeger, Kiali, CloudTrail, Open Telemetry. Logging: Fluentd. ' +
        'Configuration and monitoring DNS, APP Servers, Load Balancer, Firewall.',
    )
    expect(ids).toEqual(
      expect.arrayContaining([
        'terraform',
        'cloudformation',
        'arm-templates',
        'deployment-manager',
        'pulumi',
        'groovy',
        'go',
        'python',
        'bash',
        'powershell',
        'jaeger',
        'kiali',
        'opentelemetry',
        'fluentd',
        'dns',
        'app-servers',
        'load-balancer',
        'firewall',
      ]),
    )
    expect(ids).not.toContain('docker')
  })

  it('does not read the verb "go" as the Go language', () => {
    expect(technologiesIn('We go beyond the brief and go live weekly')).not.toContain('go')
  })

  it('invents nothing from text with no tools', () => {
    expect(technologiesIn('Improved scalability, automation and high availability')).toEqual([])
  })
})
