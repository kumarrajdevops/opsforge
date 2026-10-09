import type { IncidentScenario } from '@opsforge/types'
import { commands } from './commands'
import { evidence } from './evidence'
import { communication, hypotheses, prevention, prompts, remediation, rootCause } from './response'
import { impact, services } from './services'
import { logs, metrics, traces } from './telemetry'

export const leakedAwsKeyScenario: IncidentScenario = {
  id: 'leaked-aws-key',
  title: 'Cloud spend spike: unexpected GPU fleet',
  kind: 'security',
  difficulty: 'senior',
  summary:
    'Billing and threat detection have both fired on your AWS account: compute spend is many times its baseline and instances are running that nobody launched. Nothing customer-facing is down. You are on call for cloud security. Work out what is happening, contain it, and explain how it happened.',
  role: 'Primary on-call, cloud security',
  objective:
    'Contain the activity, establish how it started and what was touched, and propose how to stop it recurring.',
  timeboxMinutes: 30,
  pagedAtMinute: 12,
  initialSeverity: 'sev3',
  expectedSeverity: 'sev2',
  page: 'PAGE 14:12 UTC · GuardDuty CryptoCurrency:EC2/BitcoinTool.B!DNS (us-east-2), BillingAnomalyHigh · compute spend $526/h vs $38/h baseline',
  services,
  impact,
  evidence,
  commands,
  metrics,
  logs,
  traces,
  hypotheses,
  remediation,
  rootCause,
  prevention,
  communication,
  prompts,
}
