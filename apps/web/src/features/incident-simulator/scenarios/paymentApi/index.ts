import type { IncidentScenario } from '@opsforge/types'
import { commands } from './commands'
import { evidence } from './evidence'
import { communication, hypotheses, prevention, prompts, remediation, rootCause } from './response'
import { impact, services } from './services'
import { logs, metrics, traces } from './telemetry'

export const paymentApiScenario: IncidentScenario = {
  id: 'payment-api-latency',
  title: 'Payment API: checkout failures',
  kind: 'outage',
  difficulty: 'senior',
  summary:
    'Checkout is failing for a large share of customers. Latency, errors and a Kafka consumer alert are all firing on the payments stack. You are the on-call engineer. Find out what is wrong, stop the impact, and explain it.',
  role: 'Primary on-call, payments platform',
  objective: 'Restore checkout, identify the root cause, and propose how to prevent a repeat.',
  timeboxMinutes: 30,
  pagedAtMinute: 14,
  initialSeverity: 'sev3',
  expectedSeverity: 'sev2',
  page: 'PAGE 14:09 UTC · PaymentApiLatencyP99High, PaymentApiErrorRateHigh, KafkaConsumerLagHigh · payment-api p99 8.2 s, 5xx 18.4%, checkout success down',
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
