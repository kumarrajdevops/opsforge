import type { EvidenceNode } from '@opsforge/types'

type Draft = Omit<EvidenceNode, 'requires'> & { requires?: string[] }

function node(draft: Draft): EvidenceNode {
  return { requires: [], ...draft }
}

/*
 * Security incident graph (OPS-08). The phases map to the response lifecycle the candidate is judged on:
 * detect (start nodes) → contain → investigate → eradicate → recover (verification) → prevent.
 */
export const evidence: EvidenceNode[] = [
  /* ---- visible on arrival -------------------------------------------------- */
  node({
    id: 'e-alert-guardduty',
    title: 'GuardDuty: cryptocurrency mining behaviour on EC2 in us-east-2',
    detail:
      'Finding CryptoCurrency:EC2/BitcoinTool.B!DNS on i-0c4d7e91a2b3c4003 in us-east-2. The instance was launched with access key AKIAJ4EXAMPLEKEY7Q2A, which belongs to IAM user svc-deploy-legacy.',
    channel: 'alert',
    serviceId: 'ec2-compute',
    role: 'symptom',
    phase: 'triage',
    at: 10,
    trigger: { kind: 'start' },
    bearsOn: { supports: ['h-leaked-key'], refutes: ['h-asg'] },
    hint: 'Given on arrival.',
  }),
  node({
    id: 'e-alert-billing',
    title: 'Billing anomaly: compute spend is 13 times its baseline',
    detail:
      'Hourly compute spend rose from about $38 to $526. Forecast for the day is roughly $12,600 above normal.',
    channel: 'alert',
    serviceId: 'ec2-compute',
    role: 'symptom',
    phase: 'triage',
    at: 11,
    trigger: { kind: 'start' },
    hint: 'Given on arrival.',
  }),
  node({
    id: 'e-baseline-regions',
    title: 'No team runs workloads in us-east-2',
    detail:
      'Approved regions are us-east-1 and eu-west-1. Nothing in us-east-2 should be running at all, and nobody has requested GPU capacity.',
    channel: 'report',
    role: 'symptom',
    phase: 'triage',
    trigger: { kind: 'start' },
    hint: 'Given on arrival.',
  }),

  /* ---- metrics ------------------------------------------------------------ */
  node({
    id: 'e-metric-apicalls',
    title: 'The key went from silent to busy at T+03',
    detail:
      'svc-deploy-legacy made no API calls except its nightly deploy. Activity began at T+03, peaked near 60 calls a minute at T+07 and is still running. Someone is actively using it.',
    channel: 'metrics',
    serviceId: 'cloudtrail',
    role: 'mechanism',
    phase: 'triage',
    at: 3,
    trigger: { kind: 'view', channel: 'metrics', target: 'm-iam-calls' },
    bearsOn: { supports: ['h-leaked-key'], refutes: ['h-asg'] },
    hint: 'Open the API-call series for svc-deploy-legacy and read the onset.',
  }),
  node({
    id: 'e-metric-gpu',
    title: 'GPU instances appeared at T+05 and reached 16',
    detail:
      'Instances grew in steps from T+05 to 16 by T+10. This is a manual or scripted launch pattern, not autoscaling.',
    channel: 'metrics',
    serviceId: 'ec2-compute',
    role: 'symptom',
    phase: 'triage',
    at: 5,
    trigger: { kind: 'view', channel: 'metrics', target: 'm-gpu' },
    bearsOn: { refutes: ['h-asg'] },
    hint: 'Open the GPU instance count series.',
  }),
  node({
    id: 'e-metric-spend',
    title: 'Spend is still climbing',
    detail:
      "The rate is flat at about $526 an hour now, but it rises with each launch. Every minute of delay costs money and extends the attacker's window.",
    channel: 'metrics',
    serviceId: 'ec2-compute',
    role: 'symptom',
    phase: 'triage',
    at: 7,
    trigger: { kind: 'view', channel: 'metrics', target: 'm-spend' },
    hint: 'Open the compute spend series.',
  }),
  node({
    id: 'e-metric-ci',
    title: 'CI deploys are steady',
    detail: 'Two to three deploys an hour, as usual. Nothing in CI changed around T+03.',
    channel: 'metrics',
    serviceId: 'ci-pipeline',
    role: 'ruled-out',
    phase: 'isolation',
    trigger: { kind: 'view', channel: 'metrics', target: 'm-ci-deploys' },
    bearsOn: { refutes: ['h-ci-creds'] },
    hint: 'Open the CI deploy series.',
  }),

  /* ---- commands: identity and credentials -------------------------------- */
  node({
    id: 'e-cmd-whoami',
    title: 'This terminal runs as the oncall-security role',
    detail:
      'Account 123456789012. You are acting through your own role, not the compromised identity.',
    channel: 'command',
    role: 'noise',
    phase: 'triage',
    trigger: { kind: 'command', commandIds: ['cmd-whoami'] },
    hint: 'aws sts get-caller-identity.',
  }),
  node({
    id: 'e-iam-keys',
    title: 'svc-deploy-legacy has one two-year-old static key',
    detail:
      'A single long-lived access key created in February 2024, never rotated, last used 14:11 from us-east-2. This identity should only deploy at night.',
    channel: 'command',
    serviceId: 'aws-iam',
    role: 'contributing',
    phase: 'triage',
    at: 11,
    requires: ['e-alert-guardduty'],
    trigger: { kind: 'command', commandIds: ['cmd-list-keys', 'cmd-key-last-used'] },
    bearsOn: { supports: ['h-overpriv'] },
    hint: 'List the keys for the identity named in the alert.',
  }),
  node({
    id: 'e-cloudtrail-keyuse',
    title: 'The key was first used from an unknown address at T+03',
    detail:
      'From 203.0.113.77 (a hosting provider), with a python-requests user agent: GetCallerIdentity at T+03, region discovery at T+04, then RunInstances in us-east-2 at T+05. This is someone testing a stolen credential, not a deploy.',
    channel: 'command',
    serviceId: 'cloudtrail',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 3,
    requires: ['e-alert-guardduty'],
    trigger: { kind: 'command', commandIds: ['cmd-ct-key'] },
    bearsOn: { supports: ['h-leaked-key'], refutes: ['h-phished', 'h-ci-creds'] },
    hint: 'Look up CloudTrail events by access key id.',
  }),
  node({
    id: 'e-iam-key-policy',
    title: 'The key can create users and launch anything',
    detail:
      'PowerUserAccess plus a custom policy allowing iam:CreateUser, AttachUserPolicy and CreateAccessKey on every resource, with no MFA or source-IP condition. A leaked key here is effectively an account takeover.',
    channel: 'command',
    serviceId: 'aws-iam',
    role: 'contributing',
    phase: 'diagnosis',
    requires: ['e-iam-keys'],
    trigger: { kind: 'command', commandIds: ['cmd-iam-policy'] },
    bearsOn: { supports: ['h-overpriv'] },
    hint: 'Read the policies attached to the compromised user.',
  }),
  node({
    id: 'e-iam-new-user',
    title: 'The attacker created an admin user, backup-svc, at T+09',
    detail:
      'Using the stolen key, the attacker created IAM user backup-svc, attached AdministratorAccess and minted a new access key. Disabling the original key will not remove their access.',
    channel: 'command',
    serviceId: 'aws-iam',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 9,
    requires: ['e-cloudtrail-keyuse'],
    trigger: { kind: 'command', commandIds: ['cmd-iam-users'] },
    bearsOn: { supports: ['h-persistence'] },
    hint: 'List IAM users and look for anything created during the incident.',
  }),
  node({
    id: 'e-iam-new-admin',
    title: 'backup-svc holds AdministratorAccess and a live key',
    detail:
      'One access key created at 14:09:11. It has full control of the account and has not been seen from any known address.',
    channel: 'command',
    serviceId: 'aws-iam',
    role: 'mechanism',
    phase: 'diagnosis',
    requires: ['e-iam-new-user'],
    trigger: { kind: 'command', commandIds: ['cmd-iam-backup'] },
    bearsOn: { supports: ['h-persistence'] },
    hint: 'Check which policies the new user has.',
  }),
  node({
    id: 'e-console-clean',
    title: 'Console sign-ins are all MFA-protected and from known ranges',
    detail:
      'No failed attempts, no unfamiliar addresses, nobody signing in as svc-deploy-legacy. A phished employee login does not fit.',
    channel: 'command',
    serviceId: 'cloudtrail',
    role: 'ruled-out',
    phase: 'isolation',
    trigger: { kind: 'command', commandIds: ['cmd-ct-console'] },
    bearsOn: { refutes: ['h-phished'] },
    hint: 'Look up ConsoleLogin events.',
  }),

  /* ---- commands: compute and cost ---------------------------------------- */
  node({
    id: 'e-ec2-rogue',
    title: '16 p4d.24xlarge instances in us-east-2, all launched by the key',
    detail:
      'Every instance is tagged launched-by=svc-deploy-legacy and sits in a region nobody uses. These are the mining workers GuardDuty flagged.',
    channel: 'command',
    serviceId: 'ec2-compute',
    role: 'symptom',
    phase: 'isolation',
    at: 5,
    trigger: { kind: 'command', commandIds: ['cmd-ec2-rogue'] },
    bearsOn: { supports: ['h-leaked-key'], refutes: ['h-asg'] },
    hint: 'List running instances in the unfamiliar region.',
  }),
  node({
    id: 'e-ec2-home-clean',
    title: 'The main region looks normal',
    detail:
      'Six m6i instances, all from the web-prod autoscaling group. Checking only the default region would have shown nothing wrong.',
    channel: 'command',
    serviceId: 'ec2-compute',
    role: 'noise',
    phase: 'isolation',
    trigger: { kind: 'command', commandIds: ['cmd-ec2-home'] },
    hint: 'Describe instances in us-east-1.',
  }),
  node({
    id: 'e-asg-quiet',
    title: 'Autoscaling did not scale; desired capacity is unchanged',
    detail:
      'web-prod is at its desired 6, with no scaling activity for two days. The cost spike is not a runaway autoscaler.',
    channel: 'command',
    serviceId: 'ec2-compute',
    role: 'ruled-out',
    phase: 'isolation',
    trigger: { kind: 'command', commandIds: ['cmd-asg'] },
    bearsOn: { refutes: ['h-asg'] },
    hint: 'Check the autoscaling group.',
  }),

  /* ---- commands: source control ------------------------------------------ */
  node({
    id: 'e-gh-secret',
    title: 'The key id is in scripts/bootstrap.sh in acme/infra-scripts',
    detail:
      'A code search for the key id finds it hard-coded in a deploy script in the infra-scripts repository.',
    channel: 'command',
    serviceId: 'github-repo',
    role: 'root-cause',
    phase: 'diagnosis',
    at: 1,
    requires: ['e-alert-guardduty'],
    trigger: { kind: 'command', commandIds: ['cmd-gh-search'] },
    bearsOn: { supports: ['h-leaked-key'] },
    hint: 'Search the organisation for the key id from the alert.',
  }),
  node({
    id: 'e-gh-visibility',
    title: 'The repository was made public at T+01',
    detail:
      'infra-scripts was private for years. mkhan switched it to public at T+01 during an open-source cleanup, and three forks were created within two minutes.',
    channel: 'change',
    serviceId: 'github-repo',
    role: 'root-cause',
    phase: 'diagnosis',
    at: 1,
    requires: ['e-gh-secret'],
    trigger: { kind: 'command', commandIds: ['cmd-gh-repo'] },
    bearsOn: { supports: ['h-leaked-key'] },
    hint: 'Check the repository visibility and when it changed.',
  }),
  node({
    id: 'e-git-commit',
    title: 'A contractor committed the key two years ago',
    detail:
      'The credential was in the first version of bootstrap.sh and has lived in history since February 2024, safe only because the repository was private.',
    channel: 'command',
    serviceId: 'github-repo',
    role: 'root-cause',
    phase: 'diagnosis',
    at: 0,
    requires: ['e-gh-secret'],
    trigger: { kind: 'command', commandIds: ['cmd-git-log'] },
    bearsOn: { supports: ['h-leaked-key', 'h-overpriv'] },
    hint: 'Look at the history of the file containing the key.',
  }),
  node({
    id: 'e-gh-alert-ignored',
    title: 'Secret scanning fired at T+01; nobody read it',
    detail:
      'GitHub raised an alert within seconds of the repository going public and emailed a shared mailbox with no owner. A responder could have rotated the key two minutes before first misuse.',
    channel: 'alert',
    serviceId: 'github-repo',
    role: 'contributing',
    phase: 'diagnosis',
    at: 1,
    requires: ['e-gh-secret'],
    trigger: { kind: 'command', commandIds: ['cmd-gh-alerts'] },
    bearsOn: { supports: ['h-leaked-key'] },
    hint: 'Check secret-scanning alerts on the repository, or search its logs for "secret".',
  }),
  node({
    id: 'e-gh-log-alert',
    title: 'The alert is in the repository audit log',
    detail:
      'secret_scanning_alert.create at T+01, notification sent to security-alerts@acme.example.',
    channel: 'logs',
    serviceId: 'github-repo',
    role: 'contributing',
    phase: 'diagnosis',
    at: 1,
    requires: ['e-gh-secret'],
    trigger: { kind: 'search', serviceId: 'github-repo', terms: ['secret', 'alert', 'akia'] },
    bearsOn: { supports: ['h-leaked-key'] },
    hint: 'Search the repository logs for "secret".',
  }),

  /* ---- audit coverage and CI --------------------------------------------- */
  node({
    id: 'e-ct-s3',
    title: 'The key listed the customer exports bucket at T+07',
    detail:
      'ListBuckets and ListObjectsV2 on acme-customer-exports from the unknown address. The attacker knows what is in there.',
    channel: 'command',
    serviceId: 's3-customer-exports',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 7,
    requires: ['e-cloudtrail-keyuse'],
    trigger: { kind: 'command', commandIds: ['cmd-ct-s3'] },
    bearsOn: { supports: ['h-exfil'] },
    hint: 'Search CloudTrail for events touching the bucket.',
  }),
  node({
    id: 'e-s3-no-data-events',
    title: 'Object reads are not logged, so exfiltration cannot be ruled out',
    detail:
      'The trail records management events only. There is no GetObject history for the bucket, so whether customer data was downloaded is unknown. This needs escalating to security leadership and legal, not closing out.',
    channel: 'command',
    serviceId: 's3-customer-exports',
    role: 'contributing',
    phase: 'diagnosis',
    requires: ['e-ct-s3'],
    trigger: { kind: 'command', commandIds: ['cmd-ct-selectors'] },
    bearsOn: { supports: ['h-exfil'] },
    hint: 'Check what event types the trail records.',
  }),
  node({
    id: 'e-ci-oidc',
    title: 'CI authenticates with short-lived OIDC sessions',
    detail:
      'The ci-deployer role is assumed through GitHub OIDC with a 15-minute session. CI never held the leaked key.',
    channel: 'command',
    serviceId: 'ci-pipeline',
    role: 'ruled-out',
    phase: 'isolation',
    trigger: { kind: 'command', commandIds: ['cmd-ci-role'] },
    bearsOn: { refutes: ['h-ci-creds'] },
    hint: 'Check how the CI role authenticates.',
  }),

  /* ---- traces ------------------------------------------------------------- */
  node({
    id: 'e-trace-runinstances',
    title: 'The launch was authorised by a static key with no IP condition',
    detail:
      'The RunInstances call came from 203.0.113.77 with a long-term key, no MFA, allowed by PowerUserAccess. Nothing in the policy limits where the key can be used from.',
    channel: 'traces',
    serviceId: 'ec2-compute',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 5,
    trigger: { kind: 'view', channel: 'traces', target: 'tr-runinstances' },
    bearsOn: { supports: ['h-leaked-key', 'h-overpriv'] },
    hint: 'Open the RunInstances trace.',
  }),
  node({
    id: 'e-trace-ci',
    title: 'The CI deploy path uses OIDC, not the leaked key',
    detail:
      'The deploy trace shows AssumeRoleWithWebIdentity and a 15-minute session. It does not involve svc-deploy-legacy.',
    channel: 'traces',
    serviceId: 'ci-pipeline',
    role: 'ruled-out',
    phase: 'isolation',
    trigger: { kind: 'view', channel: 'traces', target: 'tr-ci-deploy' },
    bearsOn: { refutes: ['h-ci-creds'] },
    hint: 'Open the CI deploy trace.',
  }),

  /* ---- logs --------------------------------------------------------------- */
  node({
    id: 'e-log-create-user',
    title: 'IAM logs show CreateUser, AdministratorAccess and CreateAccessKey',
    detail:
      'Three events within seven seconds at T+09, all from the unknown address using the stolen key.',
    channel: 'logs',
    serviceId: 'aws-iam',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 9,
    requires: ['e-cloudtrail-keyuse'],
    trigger: {
      kind: 'search',
      serviceId: 'aws-iam',
      terms: ['createuser', 'backup-svc', 'attachuserpolicy', 'administrator'],
    },
    bearsOn: { supports: ['h-persistence'] },
    hint: 'Search the IAM logs for "CreateUser".',
  }),

  /* ---- observed from remediation attempts -------------------------------- */
  node({
    id: 'e-after-disable',
    title: 'After the key was disabled, calls continued under backup-svc',
    detail:
      'Within a minute of deactivating svc-deploy-legacy, CloudTrail shows new RunInstances calls from backup-svc. The attacker has a second credential, so the first revocation contained nothing.',
    channel: 'change',
    serviceId: 'aws-iam',
    role: 'mechanism',
    phase: 'diagnosis',
    at: 13,
    trigger: { kind: 'action', actionId: 'act-disable-key' },
    bearsOn: { supports: ['h-persistence'] },
    hint: 'Deactivate the leaked key and watch what happens next.',
  }),
  node({
    id: 'e-after-terminate',
    title: 'Terminated instances were replaced within minutes',
    detail:
      'New GPU instances appeared in ap-south-1 four minutes after the us-east-2 fleet was terminated. Cleaning up the symptom while credentials are live is whack-a-mole.',
    channel: 'change',
    serviceId: 'ec2-compute',
    role: 'contributing',
    phase: 'diagnosis',
    at: 14,
    trigger: { kind: 'action', actionId: 'act-terminate-instances' },
    hint: 'Terminate the instances before revoking the credentials.',
  }),

  /* ---- verification (only once recovered) -------------------------------- */
  node({
    id: 'e-verify-calls',
    title: 'Both identities now return AccessDenied; no new activity',
    detail:
      'Calls from svc-deploy-legacy and backup-svc fall to zero and every retry is denied. No new users, keys or instances have appeared since containment.',
    channel: 'metrics',
    serviceId: 'cloudtrail',
    role: 'noise',
    phase: 'verification',
    trigger: { kind: 'view', channel: 'metrics', target: 'm-iam-calls' },
    hint: 'After containing, open the API-call series again.',
  }),
  node({
    id: 'e-verify-spend',
    title: 'Spend is back to baseline and no instances are running',
    detail:
      'The 16 instances are stopped with their disks preserved for forensics. Spend returns to about $38 an hour.',
    channel: 'metrics',
    serviceId: 'ec2-compute',
    role: 'noise',
    phase: 'verification',
    trigger: { kind: 'view', channel: 'metrics', target: 'm-spend' },
    hint: 'After containing, open the spend series again.',
  }),
]
