import { describe, expect, it } from 'vitest'
import type { IncidentScenario, SessionEvent } from '@opsforge/types'
import { deriveState, isRevealed, matchCommand } from './engine'
import { evaluateSession } from './evaluator'
import { getScenario } from './scenarios'

const scenario = getScenario('leaked-aws-key') as IncidentScenario

let clock = 0
const at = () => (clock += 20)
const start: SessionEvent = { at: 0, type: 'start' }

function command(input: string): SessionEvent {
  const spec = matchCommand(scenario, input)
  return { at: at(), type: 'command', input, commandId: spec?.id ?? null }
}

const state = (events: SessionEvent[]) => deriveState(scenario, { events })

describe('leaked AWS key scenario', () => {
  it('is a security scenario that does not reveal its cause in the briefing', () => {
    expect(scenario.kind).toBe('security')
    const briefing = `${scenario.summary} ${scenario.page}`.toLowerCase()
    expect(briefing).not.toContain('github')
    expect(briefing).not.toContain('leak')
    expect(briefing).not.toContain('public')
  })

  it('shows only alerts on arrival; the persistence is not visible', () => {
    clock = 0
    const s = state([start])
    expect(isRevealed(s, 'e-alert-guardduty')).toBe(true)
    expect(isRevealed(s, 'e-iam-new-user')).toBe(false)
    expect(isRevealed(s, 'e-gh-visibility')).toBe(false)
  })

  it('does not reveal the attacker user before the key has been traced', () => {
    clock = 0
    const s = state([start, command('aws iam list-users')])
    expect(isRevealed(s, 'e-iam-new-user')).toBe(false)
  })

  it('reveals the persistence once the key trail leads there', () => {
    clock = 0
    const s = state([
      start,
      command(
        'aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAJ4EXAMPLEKEY7Q2A --max-results 20',
      ),
      command('aws iam list-users'),
    ])
    expect(isRevealed(s, 'e-cloudtrail-keyuse')).toBe(true)
    expect(isRevealed(s, 'e-iam-new-user')).toBe(true)
  })

  it('disabling only the leaked key does not resolve, and exposes the second identity', () => {
    clock = 0
    const s = state([
      start,
      command(
        'aws iam update-access-key --user-name svc-deploy-legacy --access-key-id AKIAJ4EXAMPLEKEY7Q2A --status Inactive',
      ),
      { at: at(), type: 'remediation', actionId: 'act-disable-key', via: 'terminal' },
    ])
    expect(s.resolved).toBe(false)
    expect(s.applied.map((a) => a.actionId)).toContain('act-disable-key')
    expect(isRevealed(s, 'e-after-disable')).toBe(true)
  })

  it('does not let a delete-first shortcut resolve the incident', () => {
    clock = 0
    const s = state([
      start,
      { at: 20, type: 'remediation', actionId: 'act-delete-repo', via: 'panel' },
    ])
    expect(s.resolved).toBe(false)
  })

  it('full containment resolves once the persistence is known', () => {
    clock = 0
    const events: SessionEvent[] = [
      start,
      command(
        'aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAJ4EXAMPLEKEY7Q2A --max-results 20',
      ),
      command('aws iam list-users'),
      { at: at(), type: 'remediation', actionId: 'act-contain-all', via: 'panel' },
    ]
    expect(state(events).resolved).toBe(true)
  })

  it('scores a considered response above a reflexive one', () => {
    clock = 0
    const careful: SessionEvent[] = [
      start,
      { at: at(), type: 'view', channel: 'metrics', target: 'm-iam-calls' },
      command('aws ec2 describe-instances --region us-east-2'),
      command(
        'aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAJ4EXAMPLEKEY7Q2A --max-results 20',
      ),
      command('aws iam list-users'),
      command('gh search code AKIAJ4EXAMPLEKEY7Q2A --owner acme'),
      command('gh repo view acme/infra-scripts'),
      {
        at: at(),
        type: 'hypothesis-add',
        id: 'h1',
        category: 'security',
        serviceId: 'github-repo',
        statement: 'Key leaked via public repo',
      },
      { at: at(), type: 'remediation', actionId: 'act-contain-all', via: 'panel' },
    ]
    clock = 0
    const reflexive: SessionEvent[] = [
      start,
      { at: 20, type: 'remediation', actionId: 'act-terminate-instances', via: 'panel' },
    ]

    const score = (events: SessionEvent[]) =>
      evaluateSession(scenario, events, 600).dimensions.find((d) => d.id === 'mitigation')?.score ??
      0

    expect(score(careful)).toBeGreaterThan(score(reflexive))
    expect(evaluateSession(scenario, careful, 600).stats.resolved).toBe(true)
  })
})
