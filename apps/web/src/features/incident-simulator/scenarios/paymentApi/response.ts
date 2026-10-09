import type {
  CommunicationSpec,
  HypothesisSpec,
  InterviewerPrompt,
  PreventionOption,
  RemediationAction,
  RootCauseSpec,
} from '@opsforge/types'

/*
 * Each hypothesis is identified by its (category, service) pair, so a candidate's own phrasing is
 * matched to a spec without free-text scoring.
 */
export const hypotheses: HypothesisSpec[] = [
  {
    id: 'h-deploy',
    label: 'A recent release changed payment-api behaviour',
    category: 'change',
    serviceId: 'payment-api',
    verdict: 'root-cause',
    explanation:
      'v2.14.0 introduced a pre-authorization hold that opens a transaction and then waits for a second pooled connection. It is the only change this week and it lines up with the first minute of the ramp.',
  },
  {
    id: 'h-db-pool',
    label: 'The database connection pool is exhausted',
    category: 'data-store',
    serviceId: 'postgres-payments',
    verdict: 'mechanism',
    explanation:
      'The 98% connection usage, 176 idle-in-transaction sessions and db.acquire_connection spans explain every symptom, but exhaustion itself is a consequence. Something is holding the connections.',
  },
  {
    id: 'h-pool-config',
    label: 'Pool sizing and missing timeouts leave no headroom',
    category: 'configuration',
    serviceId: 'payment-api',
    verdict: 'contributing',
    explanation:
      '9 × 20 plus 3 × 8 connections is 204 against max_connections of 200 and no transaction timeout is set. This did not start the incident, but it removed the margin that would have absorbed it.',
  },
  {
    id: 'h-capacity-api',
    label: 'payment-api is under-provisioned for the load',
    category: 'capacity',
    serviceId: 'payment-api',
    verdict: 'ruled-out',
    explanation:
      'CPU is flat at 42%, traffic is steady and pods are far from their limits. Adding pods adds connections.',
  },
  {
    id: 'h-db-compute',
    label: 'The database is overloaded or running slow queries',
    category: 'capacity',
    serviceId: 'postgres-payments',
    verdict: 'ruled-out',
    explanation:
      'Database CPU is ~31%; the queries that do run are fast. The sessions are idle in a transaction, not busy.',
  },
  {
    id: 'h-redis',
    label: 'Redis (sessions / idempotency cache) is the problem',
    category: 'cache',
    serviceId: 'redis-sessions',
    verdict: 'ruled-out',
    explanation:
      'A brief save-related blip at T+02 recovered before errors began; hit ratio and clients are healthy.',
  },
  {
    id: 'h-kafka',
    label: 'Kafka is the bottleneck',
    category: 'messaging',
    serviceId: 'kafka-payments',
    verdict: 'symptom',
    explanation:
      'Consumer lag is real but downstream: the consumer is slow because its database writes are waiting for connections. Lag drains by itself after the fix.',
  },
  {
    id: 'h-k8s-node',
    label: 'A node problem or reschedule disrupted the pods',
    category: 'infrastructure',
    serviceId: 'k8s-platform',
    verdict: 'ruled-out',
    explanation:
      'The node drain at T+04 was routine and finished before the ramp. No pod has restarted.',
  },
  {
    id: 'h-psp',
    label: 'The payment provider is slow or failing',
    category: 'dependency',
    serviceId: 'psp-gateway',
    verdict: 'ruled-out',
    explanation:
      'Authorize p99 is 310 ms with zero errors; slow traces spend their time before the provider call.',
  },
  {
    id: 'h-fraud',
    label: 'fraud-scoring is slow',
    category: 'dependency',
    serviceId: 'fraud-scoring',
    verdict: 'ruled-out',
    explanation: 'The fraud-scoring span is 22 ms in slow traces.',
  },
]

export const remediation: RemediationAction[] = [
  {
    id: 'act-rollback',
    label: 'Roll back payment-api to v2.13.2',
    description:
      'Revert to the previous deployment revision. No data migration was part of v2.14.0.',
    risk: 'low',
    outcome: 'resolves',
    unlockedBy: ['e-cmd-rollout-history'],
    result:
      'Rollout complete. 9 of 9 pods are on revision 13. Held transactions drain as old pods terminate. Verify before declaring recovery.',
    evidenceBasis: [
      'e-cmd-rollout-history',
      'e-cmd-rollout-diff',
      'e-log-preauth',
      'e-trace-preauth',
      'e-cmd-pg-idle-detail',
    ],
    rationale:
      'Fastest safe mitigation: the change is recent, isolated and reversible. Rolling back removes the cause rather than treating the symptom.',
  },
  {
    id: 'act-disable-flag',
    label: 'Disable PREAUTH_ENABLED',
    description:
      'Turn off the new code path with the flag introduced in v2.14.0. The pods are restarted to pick it up.',
    risk: 'low',
    outcome: 'resolves',
    unlockedBy: ['e-cmd-rollout-diff'],
    result:
      'Flag set to false and pods restarted. The pre-authorization path is bypassed. Verify before declaring recovery.',
    evidenceBasis: [
      'e-cmd-rollout-diff',
      'e-log-preauth',
      'e-trace-preauth',
      'e-cmd-pg-idle-detail',
    ],
    rationale:
      'Equivalent to a rollback when a flag guards the change; arguably less disruptive because it keeps unrelated fixes.',
  },
  {
    id: 'act-restart',
    label: 'Restart payment-api pods',
    description: 'Recycle all payment-api pods to reset their connection pools.',
    risk: 'medium',
    outcome: 'relieves',
    result:
      'Pools reset and errors fall for about two minutes. New card payments then start pre-authorization holds again and the pools refill. The incident returns.',
    effects: [
      { serviceId: 'payment-api', metricId: 'errors', value: '9.1% (relapsing)', state: 'warn' },
      { serviceId: 'payment-api', metricId: 'db-conn', value: '74% (rising)', state: 'warn' },
    ],
    evidenceBasis: ['e-log-pool', 'e-metric-db-conn'],
    rationale:
      'Relieves symptoms without removing the cause, and it drops in-flight payments. A restart is a stop-gap at best.',
  },
  {
    id: 'act-kill-idle',
    label: 'Terminate idle-in-transaction sessions',
    description: 'Kill every session in state "idle in transaction" on postgres-payments.',
    risk: 'high',
    outcome: 'relieves',
    unlockedBy: ['e-cmd-pg-activity'],
    result:
      'The 176 sessions are terminated and connections fall to 12%. Customers mid-payment see errors. New pre-authorization holds refill the pool within minutes.',
    effects: [
      {
        serviceId: 'postgres-payments',
        metricId: 'connections',
        value: '118 / 200 (rising)',
        state: 'warn',
      },
      { serviceId: 'payment-api', metricId: 'errors', value: '7.4% (relapsing)', state: 'warn' },
    ],
    evidenceBasis: ['e-cmd-pg-activity', 'e-metric-db-idle'],
    rationale:
      'Useful as a short-term pressure release if you also stop the source, but on its own it cancels live payments and the pool refills.',
  },
  {
    id: 'act-scale-api',
    label: 'Scale payment-api to 18 replicas',
    description: 'Double the number of API pods to add capacity.',
    risk: 'medium',
    outcome: 'worsens',
    result:
      'Nine more pods start and each opens a pool of 20. Connection demand exceeds max_connections; the database starts refusing clients and the error rate rises.',
    effects: [
      { serviceId: 'payment-api', metricId: 'errors', value: '31.7%', state: 'crit' },
      {
        serviceId: 'postgres-payments',
        metricId: 'connections',
        value: '200 / 200',
        state: 'crit',
      },
    ],
    evidenceBasis: [],
    rationale:
      'Nothing indicates the pods are short of CPU or traffic. More pods means more connections against a database that is already full.',
  },
  {
    id: 'act-raise-max-conn',
    label: 'Raise Postgres max_connections to 400',
    description: 'Increase the database connection limit. Requires a restart of postgres-payments.',
    risk: 'high',
    outcome: 'worsens',
    unlockedBy: ['e-metric-db-conn'],
    result:
      'The database restarts, dropping every connection for about 90 seconds. All payments fail during the restart, then the larger pool fills with the same held transactions.',
    effects: [
      { serviceId: 'payment-api', metricId: 'errors', value: '52.0%', state: 'crit' },
      {
        serviceId: 'postgres-payments',
        metricId: 'connections',
        value: 'restarting',
        state: 'crit',
      },
    ],
    evidenceBasis: [],
    rationale:
      'Treats the limit rather than the leak. A restart during an incident turns a partial outage into a full one.',
  },
  {
    id: 'act-flush-redis',
    label: 'Flush Redis',
    description: 'Delete all keys in redis-sessions.',
    risk: 'high',
    outcome: 'worsens',
    result:
      'All sessions and idempotency keys are lost. Customers are signed out and retries can double-charge. Latency does not change.',
    effects: [{ serviceId: 'redis-sessions', metricId: 'hit-ratio', value: '0%', state: 'crit' }],
    evidenceBasis: [],
    rationale:
      'Redis is healthy; flushing it adds a data-integrity risk without addressing the cause.',
  },
  {
    id: 'act-restart-consumers',
    label: 'Restart payment-events-consumer',
    description: 'Restart the Kafka consumers to clear the lag.',
    risk: 'low',
    outcome: 'no-effect',
    result:
      'Consumers rejoin the group and lag continues to grow; they are still waiting on database writes.',
    evidenceBasis: [],
    rationale:
      'The consumer is a victim. Restarting it forces a rebalance and does nothing about the database.',
  },
]

export const rootCause: RootCauseSpec = {
  statement:
    'Release v2.14.0 enabled a pre-authorization path that opens a database transaction and, while holding that connection, requests a second pooled connection for the audit write. Under production concurrency every connection is held by a transaction waiting for another, so the pool (and then the database connection limit) is exhausted. Card payments time out, and the consumer behind them lags. Pool sizing with no headroom and no transaction timeout turned a bug into an outage.',
  requiredEvidence: [
    ['e-cmd-rollout-history', 'e-cmd-rollout-diff'],
    ['e-cmd-pg-activity', 'e-metric-db-idle', 'e-cmd-pg-idle-detail'],
    ['e-trace-preauth', 'e-log-preauth'],
  ],
  concepts: [
    {
      label: 'The triggering change',
      anyOf: [
        'v2.14',
        '2.14',
        'pre-auth',
        'preauth',
        'pre auth',
        'release',
        'deploy',
        'rollout',
        'pay-2291',
        'flag',
      ],
    },
    {
      label: 'Connection pool / connection limit exhaustion',
      anyOf: ['pool', 'connection', 'max_connections', 'exhaust', 'saturat'],
    },
    {
      label: 'Connections held by open transactions',
      anyOf: [
        'idle in transaction',
        'idle-in-transaction',
        'open transaction',
        'held',
        'holds',
        'holding',
        'nested',
        'second connection',
        'deadlock',
      ],
    },
    {
      label: 'Missing safeguards (timeouts / headroom)',
      anyOf: ['timeout', 'headroom', 'no limit', 'pool size', 'sizing', 'safeguard'],
    },
  ],
}

export const prevention: PreventionOption[] = [
  {
    id: 'pr-tx-timeout',
    label: 'Set idle_in_transaction_session_timeout and an application transaction timeout',
    detail:
      'Stuck transactions are killed automatically instead of holding connections indefinitely.',
    kind: 'prevent',
    quality: 'strong',
    rationale: 'Bounds the blast radius of any held-connection bug, not just this one.',
  },
  {
    id: 'pr-pool-budget',
    label: 'Budget pools against max_connections and put PgBouncer in front',
    detail:
      'Replicas × pool + consumers must stay below the limit with headroom, enforced in review or by a check.',
    kind: 'prevent',
    quality: 'strong',
    rationale: 'Removes the structural fragility: 204 requested against 200 allowed.',
  },
  {
    id: 'pr-canary',
    label: 'Progressive rollout (canary) with automatic rollback on SLO burn',
    detail: 'Release to 5% of traffic, watch error rate and latency, roll back automatically.',
    kind: 'prevent',
    quality: 'strong',
    rationale:
      'A canary would have caught this on a handful of pods within minutes, before customers were affected broadly.',
  },
  {
    id: 'pr-saturation-alerts',
    label: 'Alert on connection saturation and idle-in-transaction count',
    detail:
      'Page on 80% of max_connections or more than N idle-in-transaction sessions, before users feel it.',
    kind: 'detect',
    quality: 'strong',
    rationale: 'Detects the cause (saturation) rather than the late, noisy symptom (latency).',
  },
  {
    id: 'pr-load-test',
    label: 'Load-test new transactional code paths at production concurrency',
    detail: 'A pre-merge or pre-release concurrency test of the pre-authorization flow.',
    kind: 'prevent',
    quality: 'strong',
    rationale:
      'This deadlock-like pattern only appears under concurrency, which single-request tests never produce.',
  },
  {
    id: 'pr-lint-nested',
    label: 'Review checklist / lint rule: no second connection acquire inside an open transaction',
    detail: 'Catch the nested-acquire pattern in code review.',
    kind: 'prevent',
    quality: 'acceptable',
    rationale: 'Helpful but depends on reviewers; the timeouts and canary are stronger controls.',
  },
  {
    id: 'pr-flag-ramp',
    label: 'Gate new behaviour behind a percentage-based feature flag',
    detail:
      'Enable pre-authorization for a small share of traffic first, independent of the deploy.',
    kind: 'prevent',
    quality: 'acceptable',
    rationale:
      'Good practice, but only if the flag is runtime-controlled and ramped, not an env var shipped with the release.',
  },
  {
    id: 'pr-runbook',
    label: 'Write a runbook for connection-pool exhaustion',
    detail: 'Diagnosis queries, rollback steps and communication templates.',
    kind: 'respond',
    quality: 'acceptable',
    rationale: 'Shortens the next response but does not stop recurrence.',
  },
  {
    id: 'pr-postmortem',
    label: 'Blameless postmortem with tracked action items',
    detail: 'Review with the owning team and track the follow-ups to completion.',
    kind: 'process',
    quality: 'acceptable',
    rationale: 'Necessary, but it only works if the actions above are actually delivered.',
  },
  {
    id: 'pr-bigger-db',
    label: 'Increase max_connections or move to a bigger database instance',
    detail: 'Raise the ceiling.',
    kind: 'prevent',
    quality: 'weak',
    rationale:
      'Raises the threshold without fixing the leak; the larger pool would fill the same way.',
  },
  {
    id: 'pr-freeze',
    label: 'Freeze deployments on Fridays',
    detail: 'Avoid risky releases near the weekend.',
    kind: 'process',
    quality: 'weak',
    rationale: 'Moves the risk to a different day; it does not make a release safer.',
  },
  {
    id: 'pr-autoscale',
    label: 'Autoscale payment-api more aggressively',
    detail: 'Add pods when latency rises.',
    kind: 'prevent',
    quality: 'counterproductive',
    rationale: 'More pods open more connections, which makes this failure worse.',
  },
  {
    id: 'pr-nightly-restart',
    label: 'Restart payment-api nightly to clear connections',
    detail: 'Scheduled recycling.',
    kind: 'prevent',
    quality: 'counterproductive',
    rationale: 'Masks leaks instead of fixing them and drops in-flight payments.',
  },
]

export const communication: CommunicationSpec = {
  requiredAudiences: ['engineering', 'leadership', 'customers'],
  firstUpdateWithinSeconds: 300,
  cadenceSeconds: 900,
  internalTerms: [
    'pool',
    'hikari',
    'postgres',
    'pg_stat',
    'idle in transaction',
    'max_connections',
    'kafka',
    'pod',
    'kubectl',
    'replica',
    'deadlock',
    'transaction',
    'v2.14',
    'preauth',
  ],
}

export const prompts: InterviewerPrompt[] = [
  {
    id: 'p-start-1',
    when: 'start',
    text: 'Before you touch anything: what do you want to know first, and who else needs to know you are on this?',
  },
  {
    id: 'p-start-2',
    when: 'start',
    text: 'How would you size the customer impact right now, and does that change the severity you declared?',
  },
  {
    id: 'p-hyp-1',
    when: 'hypothesis',
    text: 'What would you expect to see if that were true? What single observation would disprove it?',
  },
  {
    id: 'p-hyp-2',
    when: 'hypothesis',
    text: 'Which other explanations are you keeping alive, and what is the cheapest way to eliminate each?',
  },
  {
    id: 'p-mit-1',
    when: 'mitigated',
    text: 'Is the system recovered or just quiet? How do you verify, and when do you tell customers?',
  },
  {
    id: 'p-mit-2',
    when: 'mitigated',
    text: 'Why that mitigation over the alternatives you considered? What did it cost?',
  },
  {
    id: 'p-rca-1',
    when: 'rca',
    text: 'Why did this reach production? Which control would have caught it earlier?',
  },
  {
    id: 'p-rca-2',
    when: 'rca',
    text: 'How would your response change if this had happened at peak traffic?',
  },
]
