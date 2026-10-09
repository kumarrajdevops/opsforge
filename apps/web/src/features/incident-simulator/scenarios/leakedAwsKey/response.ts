import type {
  CommunicationSpec,
  HypothesisSpec,
  InterviewerPrompt,
  PreventionOption,
  RemediationAction,
  RootCauseSpec,
} from '@opsforge/types'

export const hypotheses: HypothesisSpec[] = [
  {
    id: 'h-leaked-key',
    label: 'A long-lived access key leaked from the repository and is being used by someone else',
    category: 'security',
    serviceId: 'github-repo',
    verdict: 'root-cause',
    explanation:
      'The key was committed two years ago, protected only by the repository being private. When mkhan made infra-scripts public at T+01, the credential was exposed; the first misuse followed two minutes later from a hosting-provider address.',
  },
  {
    id: 'h-persistence',
    label: 'The attacker created a second identity, so revoking the first key is not enough',
    category: 'security',
    serviceId: 'aws-iam',
    verdict: 'mechanism',
    explanation:
      'backup-svc was created at T+09 with AdministratorAccess and its own key. Any response that stops at the leaked key leaves the attacker in the account, which is exactly what happens in the first mitigation attempt.',
  },
  {
    id: 'h-overpriv',
    label: 'The deploy identity has far more privilege than it needs and no network conditions',
    category: 'configuration',
    serviceId: 'aws-iam',
    verdict: 'contributing',
    explanation:
      'PowerUserAccess plus IAM write on every resource, with no MFA, no source-IP condition and no regional restriction, turned a leaked deploy key into account takeover and made the 16 GPU launches possible.',
  },
  {
    id: 'h-exfil',
    label: 'Customer data was downloaded from the exports bucket',
    category: 'data-store',
    serviceId: 's3-customer-exports',
    verdict: 'symptom',
    explanation:
      'The key listed the bucket, but object reads were never logged, so exfiltration can be neither proven nor ruled out. The right move is to treat it as possible, escalate, and fix the logging gap, not to claim it did or did not happen.',
  },
  {
    id: 'h-asg',
    label: 'Autoscaling or a deploy caused the compute spike',
    category: 'capacity',
    serviceId: 'ec2-compute',
    verdict: 'ruled-out',
    explanation:
      'The instances are GPU types in an unused region launched with an unfamiliar user agent, while web-prod has not scaled for two days. Checking only the default region would have hidden this.',
  },
  {
    id: 'h-ci-creds',
    label: 'CI pipeline credentials were compromised',
    category: 'dependency',
    serviceId: 'ci-pipeline',
    verdict: 'ruled-out',
    explanation:
      'CI uses OIDC with 15-minute sessions and never held the leaked key. Deploy frequency and traces are normal.',
  },
  {
    id: 'h-phished',
    label: 'An employee was phished and their console session was used',
    category: 'security',
    serviceId: 'cloudtrail',
    verdict: 'ruled-out',
    explanation:
      'Every console sign-in is MFA-protected from a known range, and nothing happened as a console user. The activity is entirely API-key based.',
  },
]

export const remediation: RemediationAction[] = [
  {
    id: 'act-contain-all',
    label:
      'Contain the account: deny both identities, remove the attacker user, stop (do not delete) the instances',
    description:
      'Attach a deny-all policy to svc-deploy-legacy and backup-svc, delete the attacker key, deactivate the original key, and stop the rogue instances so their disks remain for forensics.',
    risk: 'low',
    outcome: 'resolves',
    unlockedBy: ['e-iam-new-user'],
    result:
      'Both identities now receive AccessDenied. The attacker key is inactive, the original key is deactivated and 16 instances are stopped with volumes preserved. Verify in telemetry before declaring recovery, then rotate and clean up.',
    evidenceBasis: ['e-cloudtrail-keyuse', 'e-iam-new-user', 'e-iam-new-admin', 'e-ec2-rogue'],
    rationale:
      'Contains every known attacker path at once. Stopping rather than terminating keeps disk and memory artefacts for the investigation, and the deny policy works even if more keys exist.',
  },
  {
    id: 'act-disable-key',
    label: 'Deactivate the leaked access key',
    description: 'Set AKIAJ4EXAMPLEKEY7Q2A to Inactive. Fast and reversible.',
    risk: 'low',
    outcome: 'relieves',
    result:
      'The key is inactive and its calls fail. Within a minute new RunInstances calls appear under another identity. This was necessary but not sufficient.',
    effects: [
      {
        serviceId: 'ec2-compute',
        metricId: 'spend',
        value: '$526/h (still launching)',
        state: 'warn',
      },
    ],
    evidenceBasis: ['e-cloudtrail-keyuse', 'e-iam-keys'],
    rationale:
      'The correct first move and a good one to do immediately, but only if you then check what the key did. Treating it as the end of the response misses the persistence.',
  },
  {
    id: 'act-terminate-instances',
    label: 'Terminate the 16 unauthorised instances',
    description: 'Terminate everything launched by svc-deploy-legacy in us-east-2.',
    risk: 'medium',
    outcome: 'relieves',
    unlockedBy: ['e-ec2-rogue'],
    result:
      'The instances are gone and spend falls briefly. New GPU instances appear in another region minutes later because the attacker still has working credentials. The disks are also gone, so there is nothing left to examine.',
    effects: [
      { serviceId: 'ec2-compute', metricId: 'gpu', value: '8 (relaunching)', state: 'warn' },
    ],
    evidenceBasis: ['e-ec2-rogue'],
    rationale:
      'Stops the bill without stopping the attacker, and destroys forensic evidence. Cleaning up the symptom before revoking access is a classic ordering mistake.',
  },
  {
    id: 'act-make-private',
    label: 'Make the repository private again',
    description: 'Revert infra-scripts to private and disable the three forks if possible.',
    risk: 'low',
    outcome: 'no-effect',
    result:
      'The repository is private, but the key is already copied into forks, caches and scrapers. Making it private again does not revoke anything. The attacker is still active.',
    evidenceBasis: ['e-gh-visibility'],
    rationale:
      'Good hygiene and worth doing, but it does nothing to the credential that is already public. Revocation is what matters.',
  },
  {
    id: 'act-delete-repo',
    label: 'Delete the repository and its forks',
    description: 'Remove infra-scripts entirely to get the key out of the open.',
    risk: 'high',
    outcome: 'worsens',
    result:
      'The repository, its history and the audit trail of the commit are gone. The key is still valid and still in the forks. The team has lost the evidence needed to understand exposure.',
    effects: [
      { serviceId: 'github-repo', metricId: 'alerts', value: 'Evidence lost', state: 'crit' },
    ],
    evidenceBasis: [],
    rationale:
      'Destroys the evidence and fixes nothing. Never delete the thing you need to investigate.',
  },
  {
    id: 'act-enable-data-events',
    label: 'Enable S3 data events on the exports bucket',
    description: 'Turn on object-level logging going forward.',
    risk: 'low',
    outcome: 'no-effect',
    unlockedBy: ['e-s3-no-data-events'],
    result:
      'Object reads are logged from now on. This is the right thing for the future, but it cannot tell you what was read earlier, so it does not change what you have to assume today.',
    evidenceBasis: ['e-s3-no-data-events'],
    rationale:
      'A valuable follow-up, not a mitigation. It belongs in prevention, not in the middle of containment.',
  },
]

export const rootCause: RootCauseSpec = {
  statement:
    'A long-lived access key for svc-deploy-legacy was committed to acme/infra-scripts two years ago and was safe only because the repository was private. At T+01 the repository was made public during a cleanup. GitHub secret scanning alerted a mailbox nobody watches, and an attacker used the key within two minutes to launch 16 GPU instances for mining, list a customer-exports bucket and create an admin user for persistence. Over-broad permissions, no network or region guardrails and a static credential turned an exposure into account compromise.',
  requiredEvidence: [
    ['e-gh-visibility', 'e-gh-secret', 'e-git-commit'],
    ['e-cloudtrail-keyuse', 'e-metric-apicalls', 'e-trace-runinstances'],
    ['e-iam-new-user', 'e-after-disable', 'e-iam-new-admin'],
  ],
  concepts: [
    {
      label: 'A committed credential in a repository that became public',
      anyOf: [
        'public',
        'repo',
        'repository',
        'github',
        'commit',
        'hard-coded',
        'hardcoded',
        'bootstrap',
        'visibility',
      ],
    },
    {
      label: 'A static, long-lived access key',
      anyOf: [
        'static',
        'long-lived',
        'long lived',
        'access key',
        'akia',
        'never rotated',
        'no rotation',
      ],
    },
    {
      label: 'Attacker persistence (a second identity)',
      anyOf: [
        'backup-svc',
        'persistence',
        'new user',
        'second user',
        'second identity',
        'created a user',
        'created user',
        'admin user',
      ],
    },
    {
      label: 'Excess privilege or missing guardrails',
      anyOf: [
        'over-privileg',
        'overprivileg',
        'least privilege',
        'poweruser',
        'too much',
        'no mfa',
        'guardrail',
        'scp',
        'permission boundary',
        'ip condition',
      ],
    },
    {
      label: 'Data exposure is unconfirmed',
      anyOf: [
        'cannot confirm',
        "can't confirm",
        'unknown',
        'not logged',
        'data events',
        'possible exfil',
        'unconfirmed',
        'assume',
      ],
    },
  ],
}

export const prevention: PreventionOption[] = [
  {
    id: 'pr-oidc',
    label: 'Replace static keys with short-lived roles (OIDC / SSO) and delete svc-deploy-legacy',
    detail:
      'CI already works this way; the legacy deploy identity should too. A credential that expires in minutes is worthless in a public repository.',
    kind: 'prevent',
    quality: 'strong',
    rationale: 'Removes the class of failure rather than the instance.',
  },
  {
    id: 'pr-push-protection',
    label: 'Enable secret push protection and route scanning alerts to a paged, owned channel',
    detail:
      'Block the commit before it lands and send leaks to an on-call rota instead of a shared mailbox.',
    kind: 'detect',
    quality: 'strong',
    rationale:
      'The alert fired at T+01 and was ignored. A responder could have rotated the key before it was ever used.',
  },
  {
    id: 'pr-visibility-guardrail',
    label: 'Require review and a secret scan before any repository can be made public',
    detail: 'Org policy that restricts visibility changes and runs a full-history scan first.',
    kind: 'prevent',
    quality: 'strong',
    rationale:
      'The trigger was a well-meant change with no safety check. This puts one in the path.',
  },
  {
    id: 'pr-scp-regions',
    label: 'Deny unused regions and GPU instance families with service control policies',
    detail:
      'Restrict compute to approved regions, and require an exception for large GPU families.',
    kind: 'prevent',
    quality: 'strong',
    rationale:
      'Caps the blast radius of any stolen credential and would have made the mining launch fail outright.',
  },
  {
    id: 'pr-least-privilege',
    label: 'Right-size permissions and add a permission boundary, MFA or source-IP condition',
    detail:
      'The deploy identity needs to deploy, not create users. Boundaries stop privilege escalation even if policies drift.',
    kind: 'prevent',
    quality: 'strong',
    rationale:
      'Without IAM write access there would have been no persistence, and a source-IP condition would have blocked the stolen key.',
  },
  {
    id: 'pr-auto-quarantine',
    label: 'Automatically quarantine an identity when GuardDuty reports credential misuse',
    detail: 'An event rule attaches a deny policy and pages the on-call engineer.',
    kind: 'respond',
    quality: 'acceptable',
    rationale:
      'Shortens exposure from minutes to seconds, but automatic containment needs care to avoid breaking production.',
  },
  {
    id: 'pr-data-events',
    label: 'Enable S3 data events (and access logging) for sensitive buckets',
    detail: 'Record object-level reads so exposure can be answered rather than assumed.',
    kind: 'detect',
    quality: 'acceptable',
    rationale:
      'Would have answered the customer-data question. It improves investigations but does not prevent anything.',
  },
  {
    id: 'pr-postmortem',
    label: 'Blameless postmortem, plus a disclosure assessment with security and legal',
    detail: 'Review the process gaps and decide whether customer notification is required.',
    kind: 'process',
    quality: 'acceptable',
    rationale:
      'Necessary, particularly because data access cannot be ruled out, but only effective if actions are delivered.',
  },
  {
    id: 'pr-rotate-90',
    label: 'Rotate access keys every 90 days',
    detail: 'A calendar-based rotation policy.',
    kind: 'prevent',
    quality: 'weak',
    rationale:
      'This key was exposed and used within minutes. Rotation windows measured in months do not help.',
  },
  {
    id: 'pr-training',
    label: 'Remind engineers not to commit secrets',
    detail: 'Security awareness training and a wiki page.',
    kind: 'process',
    quality: 'weak',
    rationale:
      'Relies on humans never making mistakes. Controls that fail safe are better than reminders.',
  },
  {
    id: 'pr-standing-admin',
    label: 'Give on-call engineers standing admin keys so they can respond faster',
    detail: 'Permanent high-privilege credentials for the response team.',
    kind: 'respond',
    quality: 'counterproductive',
    rationale: 'Creates more of the long-lived, high-value credentials that caused this incident.',
  },
  {
    id: 'pr-disable-guardduty',
    label: 'Turn off GuardDuty to stop the noisy findings',
    detail: 'Reduce alert fatigue.',
    kind: 'detect',
    quality: 'counterproductive',
    rationale:
      'GuardDuty is how this was detected at all. Fix routing and tuning, do not remove the sensor.',
  },
]

export const communication: CommunicationSpec = {
  requiredAudiences: ['engineering', 'leadership'],
  firstUpdateWithinSeconds: 300,
  cadenceSeconds: 900,
  internalTerms: [
    'akia',
    'iam',
    'access key',
    'cloudtrail',
    'guardduty',
    's3',
    'svc-deploy-legacy',
    'backup-svc',
    'p4d',
    'bootstrap.sh',
    'infra-scripts',
  ],
}

export const prompts: InterviewerPrompt[] = [
  {
    id: 'p-start-1',
    when: 'start',
    text: 'You have been paged for an unexpected cost spike. Before you touch anything, what is your first move and why?',
  },
  {
    id: 'p-start-2',
    when: 'start',
    text: 'The alert names a key. How do you decide whether this is a security incident or a runaway workload?',
  },
  {
    id: 'p-hyp-1',
    when: 'hypothesis',
    text: 'Which evidence supports that, and which alternatives have you ruled out?',
  },
  {
    id: 'p-hyp-2',
    when: 'hypothesis',
    text: 'If you revoke the credential and the activity continues, what does that tell you?',
  },
  {
    id: 'p-mit-1',
    when: 'mitigated',
    text: 'How do you know you have removed the attacker, not just one credential? What did you do to preserve evidence?',
  },
  {
    id: 'p-mit-2',
    when: 'mitigated',
    text: 'You cannot tell whether customer data was read. Who do you tell, and what do you say?',
  },
  {
    id: 'p-rca-1',
    when: 'rca',
    text: 'Name the two controls that would each have stopped this on their own, and which you would implement first.',
  },
  {
    id: 'p-rca-2',
    when: 'rca',
    text: 'The secret alert fired two minutes before first misuse. What should have happened with it?',
  },
]
