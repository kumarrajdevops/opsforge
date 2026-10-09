import type { CommandSpec } from '@opsforge/types'

const KEY = 'AKIAJ4EXAMPLEKEY7Q2A'

const rogueInstances = Array.from(
  { length: 16 },
  (_, i) => `i-0c4d7e91a2b3c40${String(i + 1).padStart(2, '0')}`,
)

function instanceTable(): string {
  const header = 'InstanceId             Type            State     LaunchTime (UTC)   LaunchedBy'
  const rows = rogueInstances.map((id, i) => {
    const minute = 5 + Math.floor(i / 2) * 0.5
    const mm = String(Math.floor(minute)).padStart(2, '0')
    const ss = minute % 1 === 0 ? '10' : '40'
    return `${id}  p4d.24xlarge    running   14:${mm}:${ss}          svc-deploy-legacy`
  })
  return [header, ...rows].join('\n')
}

export const commands: CommandSpec[] = [
  /* ---- identity and credentials ----------------------------------------- */
  {
    id: 'cmd-whoami',
    command: 'aws sts get-caller-identity',
    category: 'cloud',
    description: 'Confirm which identity this terminal is using.',
    starter: true,
    output: [
      '{',
      '  "UserId": "AROAEXAMPLEONCALL:you",',
      '  "Account": "123456789012",',
      '  "Arn": "arn:aws:sts::123456789012:assumed-role/oncall-security/you"',
      '}',
    ].join('\n'),
  },
  {
    id: 'cmd-list-keys',
    command: 'aws iam list-access-keys --user-name svc-deploy-legacy',
    category: 'cloud',
    description: 'List the access keys that belong to the identity named in the alert.',
    starter: true,
    output: [
      '{',
      '  "AccessKeyMetadata": [',
      '    {',
      '      "UserName": "svc-deploy-legacy",',
      `      "AccessKeyId": "${KEY}",`,
      '      "Status": "Active",',
      '      "CreateDate": "2024-02-09T10:12:44+00:00"',
      '    }',
      '  ]',
      '}',
    ].join('\n'),
  },
  {
    id: 'cmd-key-last-used',
    command: `aws iam get-access-key-last-used --access-key-id ${KEY}`,
    category: 'cloud',
    description: 'See when and where a key was last used.',
    output: [
      '{',
      '  "UserName": "svc-deploy-legacy",',
      '  "AccessKeyLastUsed": {',
      '    "LastUsedDate": "2026-03-14T14:11:52+00:00",',
      '    "ServiceName": "ec2",',
      '    "Region": "us-east-2"',
      '  }',
      '}',
    ].join('\n'),
  },
  {
    id: 'cmd-ct-key',
    command: `aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=${KEY} --max-results 20`,
    aliases: [
      `aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=${KEY}`,
      `aws cloudtrail lookup-events --max-results 20 --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=${KEY}`,
    ],
    category: 'cloud',
    description: 'Everything this access key has done, from the audit trail.',
    starter: true,
    output: [
      'Time (UTC)  EventName                       SourceIP        Region      UserAgent',
      '14:11:52    RunInstances                    203.0.113.77    us-east-2   python-requests/2.31',
      '14:09:11    CreateAccessKey (backup-svc)    203.0.113.77    us-east-1   python-requests/2.31',
      '14:09:07    AttachUserPolicy (backup-svc)   203.0.113.77    us-east-1   python-requests/2.31',
      '14:09:04    CreateUser (backup-svc)         203.0.113.77    us-east-1   python-requests/2.31',
      '14:07:09    ListObjectsV2 (acme-customer-exports) 203.0.113.77 us-east-1 python-requests/2.31',
      '14:07:02    ListBuckets                     203.0.113.77    us-east-1   python-requests/2.31',
      '14:05:02    RunInstances                    203.0.113.77    us-east-2   python-requests/2.31',
      '14:04:12    DescribeInstanceTypeOfferings   203.0.113.77    us-east-2   python-requests/2.31',
      '14:03:41    GetCallerIdentity               203.0.113.77    us-east-1   python-requests/2.31',
      '',
      'First event for this key outside the nightly deploy window: 14:03:41. Source address 203.0.113.77 is not in any known range.',
    ].join('\n'),
  },
  {
    id: 'cmd-iam-policy',
    command: 'aws iam list-attached-user-policies --user-name svc-deploy-legacy',
    category: 'cloud',
    description: 'See what the leaked identity is allowed to do.',
    output: [
      '{',
      '  "AttachedPolicies": [',
      '    { "PolicyName": "PowerUserAccess", "PolicyArn": "arn:aws:iam::aws:policy/PowerUserAccess" },',
      '    { "PolicyName": "LegacyDeployIam", "PolicyArn": "arn:aws:iam::123456789012:policy/LegacyDeployIam" }',
      '  ]',
      '}',
      '',
      'LegacyDeployIam allows iam:CreateUser, iam:AttachUserPolicy and iam:CreateAccessKey on *.',
      'No MFA or source-IP condition on either policy.',
    ].join('\n'),
  },
  {
    id: 'cmd-iam-users',
    command: 'aws iam list-users --query "Users[].[UserName,CreateDate]" --output text',
    aliases: [
      'aws iam list-users',
      'aws iam list-users --output text',
      'aws iam list-users --query Users[].[UserName,CreateDate] --output text',
    ],
    category: 'cloud',
    description: 'List IAM users and when they were created.',
    output: [
      'alice               2023-05-11T09:02:10+00:00',
      'bpatel              2024-08-27T13:40:02+00:00',
      'svc-deploy-legacy   2024-02-09T10:12:12+00:00',
      'svc-reporting       2025-01-20T16:45:31+00:00',
      'backup-svc          2026-03-14T14:09:04+00:00',
    ].join('\n'),
  },
  {
    id: 'cmd-iam-backup',
    command: 'aws iam list-attached-user-policies --user-name backup-svc',
    category: 'cloud',
    description: 'See what the unfamiliar user is allowed to do.',
    unlockedBy: ['e-iam-new-user'],
    output: [
      '{',
      '  "AttachedPolicies": [',
      '    { "PolicyName": "AdministratorAccess", "PolicyArn": "arn:aws:iam::aws:policy/AdministratorAccess" }',
      '  ]',
      '}',
      '',
      'backup-svc has one access key, created 14:09:11, never used from a known address.',
    ].join('\n'),
  },
  {
    id: 'cmd-ct-console',
    command:
      'aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin --max-results 10',
    aliases: [
      'aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin',
    ],
    category: 'cloud',
    description: 'Recent console sign-ins.',
    output: [
      'Time (UTC)  User     MFA    SourceIP        Result',
      '14:08:30    alice    true   198.51.100.12   Success',
      '14:06:31    bpatel   true   198.51.100.40   Success',
      '14:02:05    alice    true   198.51.100.12   Success',
      '13:41:18    carol    true   198.51.100.77   Success',
      '',
      'All sign-ins use MFA from the office or VPN ranges. No failures, no unfamiliar addresses.',
    ].join('\n'),
  },

  /* ---- compute and cost ------------------------------------------------- */
  {
    id: 'cmd-ec2-rogue',
    command:
      'aws ec2 describe-instances --region us-east-2 --filters Name=instance-state-name,Values=running',
    aliases: [
      'aws ec2 describe-instances --region us-east-2',
      'aws ec2 describe-instances --filters Name=instance-state-name,Values=running --region us-east-2',
    ],
    category: 'cloud',
    description: 'Running instances in us-east-2, a region no team uses.',
    starter: true,
    output: instanceTable(),
  },
  {
    id: 'cmd-ec2-home',
    command:
      'aws ec2 describe-instances --region us-east-1 --filters Name=instance-state-name,Values=running',
    aliases: ['aws ec2 describe-instances --region us-east-1', 'aws ec2 describe-instances'],
    category: 'cloud',
    description: 'Running instances in the main region.',
    output: [
      'InstanceId             Type         State     LaunchedBy',
      'i-0a11b22c33d44e501   m6i.large    running   asg:web-prod',
      'i-0a11b22c33d44e502   m6i.large    running   asg:web-prod',
      'i-0a11b22c33d44e503   m6i.large    running   asg:web-prod',
      'i-0a11b22c33d44e504   m6i.large    running   asg:web-prod',
      'i-0a11b22c33d44e505   m6i.large    running   asg:web-prod',
      'i-0a11b22c33d44e506   m6i.large    running   asg:web-prod',
      '',
      '6 instances, all launched by the web-prod autoscaling group. Nothing unfamiliar in this region.',
    ].join('\n'),
  },
  {
    id: 'cmd-asg',
    command: 'aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names web-prod',
    aliases: [
      'aws autoscaling describe-auto-scaling-groups',
      'aws autoscaling describe-scaling-activities --auto-scaling-group-name web-prod',
    ],
    category: 'cloud',
    description: 'Check whether autoscaling explains the extra capacity.',
    output: [
      'AutoScalingGroupName  DesiredCapacity  MinSize  MaxSize  Instances',
      'web-prod              6                4        12       6',
      '',
      'Last scaling activity: 2 days ago. Autoscaling is not responsible for the new instances.',
    ].join('\n'),
  },

  /* ---- source control ---------------------------------------------------- */
  {
    id: 'cmd-gh-search',
    command: `gh search code ${KEY} --owner acme`,
    aliases: [`gh search code "${KEY}" --owner acme`, `gh search code ${KEY}`],
    category: 'source-control',
    description: 'Find where the key id appears in the organisation.',
    starter: true,
    output: [
      'acme/infra-scripts   scripts/bootstrap.sh',
      `  export AWS_ACCESS_KEY_ID=${KEY}`,
      '  export AWS_SECRET_ACCESS_KEY=****************************************',
      '',
      '1 match in 1 repository.',
    ].join('\n'),
  },
  {
    id: 'cmd-gh-repo',
    command: 'gh repo view acme/infra-scripts --json visibility,pushedAt,forkCount',
    aliases: [
      'gh repo view acme/infra-scripts',
      'gh repo view acme/infra-scripts --json visibility',
    ],
    category: 'source-control',
    description: 'Check the repository settings.',
    output: [
      '{',
      '  "visibility": "PUBLIC",',
      '  "pushedAt": "2026-03-14T14:00:48Z",',
      '  "forkCount": 3',
      '}',
      '',
      'Visibility changed from PRIVATE to PUBLIC at 14:01:10 by mkhan (organisation settings).',
    ].join('\n'),
  },
  {
    id: 'cmd-git-log',
    command: 'git log --format="%h %an %ad %s" --date=short -- scripts/bootstrap.sh',
    aliases: [
      'git log -- scripts/bootstrap.sh',
      'git log --oneline -- scripts/bootstrap.sh',
      'git log --follow -- scripts/bootstrap.sh',
    ],
    category: 'source-control',
    description: 'Who added the credential and when.',
    output: [
      '9c1e7ab contractor-jlee 2024-02-09 add bootstrap script for legacy deploy',
      '4b02d1f dev-bot 2025-06-02 bump terraform to 1.8',
      '',
      'The key was committed with the first version of the file, two years ago.',
    ].join('\n'),
  },
  {
    id: 'cmd-gh-alerts',
    command: 'gh api repos/acme/infra-scripts/secret-scanning/alerts',
    aliases: [
      'gh api /repos/acme/infra-scripts/secret-scanning/alerts',
      'gh secret-scanning alerts',
    ],
    category: 'source-control',
    description: 'Secret-scanning alerts on the repository.',
    output: [
      '[',
      '  {',
      '    "number": 1,',
      '    "state": "open",',
      '    "secret_type": "aws_access_key_id",',
      '    "created_at": "2026-03-14T14:01:12Z",',
      '    "notified": ["security-alerts@acme.example"],',
      '    "resolution": null',
      '  }',
      ']',
      '',
      'security-alerts@acme.example is a shared mailbox with no owner on call.',
    ].join('\n'),
  },

  /* ---- audit coverage and CI -------------------------------------------- */
  {
    id: 'cmd-ct-s3',
    command:
      'aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=acme-customer-exports',
    aliases: [
      'aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=acme-customer-exports --max-results 20',
    ],
    category: 'cloud',
    description: 'Audit events that touched the customer exports bucket.',
    output: [
      'Time (UTC)  EventName         Principal            SourceIP',
      '14:07:09    ListObjectsV2     svc-deploy-legacy    203.0.113.77',
      '14:07:02    ListBuckets       svc-deploy-legacy    203.0.113.77',
      '10:15:40    PutObject         svc-reporting        10.0.4.18',
      '',
      'No GetObject events appear. That could mean nothing was read, or that reads are not being recorded.',
    ].join('\n'),
  },
  {
    id: 'cmd-ct-selectors',
    command: 'aws cloudtrail get-event-selectors --trail-name main',
    category: 'cloud',
    description: 'Which event types the trail records.',
    output: [
      '{',
      '  "TrailARN": "arn:aws:cloudtrail:us-east-1:123456789012:trail/main",',
      '  "EventSelectors": [',
      '    { "ReadWriteType": "All", "IncludeManagementEvents": true, "DataResources": [] }',
      '  ]',
      '}',
      '',
      'DataResources is empty: object-level S3 reads and writes are not recorded.',
    ].join('\n'),
  },
  {
    id: 'cmd-ci-role',
    command: 'aws iam get-role --role-name ci-deployer',
    category: 'cloud',
    description: 'How the CI pipeline authenticates.',
    output: [
      '{',
      '  "Role": {',
      '    "RoleName": "ci-deployer",',
      '    "AssumeRolePolicyDocument": {',
      '      "Statement": [{',
      '        "Effect": "Allow",',
      '        "Principal": { "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" },',
      '        "Action": "sts:AssumeRoleWithWebIdentity"',
      '      }]',
      '    },',
      '    "MaxSessionDuration": 3600',
      '  }',
      '}',
      '',
      'CI uses short-lived OIDC sessions. It holds no static access key that could have leaked.',
    ].join('\n'),
  },

  /* ---- mutating ---------------------------------------------------------- */
  {
    id: 'cmd-disable-key',
    command: `aws iam update-access-key --user-name svc-deploy-legacy --access-key-id ${KEY} --status Inactive`,
    aliases: [
      `aws iam update-access-key --access-key-id ${KEY} --status Inactive --user-name svc-deploy-legacy`,
    ],
    category: 'cloud',
    description: 'Deactivate the leaked access key.',
    mutating: true,
    remediationId: 'act-disable-key',
    output: '(no output)',
  },
  {
    id: 'cmd-terminate',
    command:
      './ir/quarantine-instances.sh --region us-east-2 --tag launched-by=svc-deploy-legacy --terminate',
    aliases: [
      './ir/quarantine-instances.sh --region us-east-2 --tag launched-by=svc-deploy-legacy --terminate',
    ],
    category: 'cloud',
    description: 'Runbook helper: terminate every instance launched by the leaked identity.',
    mutating: true,
    remediationId: 'act-terminate-instances',
    output: 'Terminating 16 instances in us-east-2 ...',
  },
  {
    id: 'cmd-contain',
    command:
      './ir/contain-credentials.sh --user svc-deploy-legacy --user backup-svc --stop-instances us-east-2',
    aliases: [
      './ir/contain-credentials.sh --user backup-svc --user svc-deploy-legacy --stop-instances us-east-2',
    ],
    category: 'cloud',
    description:
      'Runbook helper: deny-all both users, delete their keys, revoke sessions, stop (not terminate) instances.',
    mutating: true,
    remediationId: 'act-contain-all',
    unlockedBy: ['e-iam-new-user'],
    output: 'Containing credentials ...',
  },
  {
    id: 'cmd-make-private',
    command:
      'gh repo edit acme/infra-scripts --visibility private --accept-visibility-change-consequences',
    category: 'source-control',
    description: 'Make the repository private again.',
    mutating: true,
    remediationId: 'act-make-private',
    output: 'Repository acme/infra-scripts is now private.',
  },
  {
    id: 'cmd-delete-repo',
    command: 'gh repo delete acme/infra-scripts --yes',
    category: 'source-control',
    description: 'Delete the repository.',
    mutating: true,
    remediationId: 'act-delete-repo',
    output: 'Deleted repository acme/infra-scripts.',
  },
]
