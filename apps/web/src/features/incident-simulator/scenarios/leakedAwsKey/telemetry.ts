import type { LogEntry, LogLevel, MetricSeries, TraceRecord } from '@opsforge/types'

/* One sample per minute, T+00 … T+12 (the candidate is paged at T+12). */

export const metrics: MetricSeries[] = [
  {
    id: 'm-iam-calls',
    serviceId: 'cloudtrail',
    label: 'API calls by svc-deploy-legacy',
    unit: 'calls/min',
    points: [0, 0, 0, 6, 14, 38, 52, 61, 47, 34, 22, 18, 15],
    recoveredTail: [4, 1, 0, 0, 0],
    warnAt: 5,
    critAt: 20,
    description: 'This identity normally makes no calls outside the nightly deploy.',
  },
  {
    id: 'm-gpu',
    serviceId: 'ec2-compute',
    label: 'GPU instances running (all regions)',
    unit: 'count',
    points: [0, 0, 0, 0, 0, 2, 6, 10, 13, 15, 16, 16, 16],
    recoveredTail: [16, 16, 8, 0, 0],
    warnAt: 1,
    critAt: 4,
  },
  {
    id: 'm-spend',
    serviceId: 'ec2-compute',
    label: 'Compute spend rate',
    unit: '$/h',
    points: [38, 38, 38, 38, 38, 38, 40, 190, 340, 430, 490, 520, 526],
    recoveredTail: [526, 480, 260, 90, 38],
    warnAt: 100,
    critAt: 300,
  },
  {
    id: 'm-ci-deploys',
    serviceId: 'ci-pipeline',
    label: 'CI deploys',
    unit: 'per hour',
    points: [2, 2, 2, 3, 2, 2, 2, 3, 2, 2, 2, 2, 3],
    warnAt: 10,
    critAt: 20,
  },
]

function t(minute: number, second = 0): number {
  return minute * 60 + second
}

let counter = 0
function log(
  serviceId: string,
  at: number,
  level: LogLevel,
  message: string,
  gatedBy?: string,
): LogEntry {
  counter += 1
  return { id: `log-${counter}`, serviceId, atSeconds: at, level, message, gatedBy }
}

export const logs: LogEntry[] = [
  log('github-repo', t(0, 20), 'info', 'push main by dev-bot: update dependabot config (1 file)'),
  log('github-repo', t(0, 48), 'info', 'pull_request #418 merged: bump terraform-docs'),
  log(
    'github-repo',
    t(1, 10),
    'info',
    'repo.access: visibility changed private -> public by mkhan (org settings)',
    'e-gh-visibility',
  ),
  log(
    'github-repo',
    t(1, 12),
    'warn',
    'secret_scanning_alert.create: AWS Access Key ID in scripts/bootstrap.sh (commit 9c1e7ab); notification sent to security-alerts@acme.example',
    'e-gh-alert-ignored',
  ),
  log(
    'github-repo',
    t(2, 40),
    'info',
    'repo.fork: 3 forks created from unrecognised accounts',
    'e-gh-visibility',
  ),

  log(
    'aws-iam',
    t(2, 5),
    'info',
    'ConsoleLogin success user=alice mfa=true sourceIP=198.51.100.12',
  ),
  log(
    'aws-iam',
    t(6, 31),
    'info',
    'ConsoleLogin success user=bpatel mfa=true sourceIP=198.51.100.40',
  ),
  log(
    'aws-iam',
    t(9, 4),
    'warn',
    'CreateUser userName=backup-svc by svc-deploy-legacy sourceIP=203.0.113.77',
    'e-iam-new-user',
  ),
  log(
    'aws-iam',
    t(9, 7),
    'warn',
    'AttachUserPolicy userName=backup-svc policy=AdministratorAccess',
    'e-iam-new-user',
  ),
  log('aws-iam', t(9, 11), 'warn', 'CreateAccessKey userName=backup-svc', 'e-iam-new-user'),

  log(
    'cloudtrail',
    t(3, 41),
    'warn',
    'GetCallerIdentity accessKeyId=AKIAJ4EXAMPLEKEY7Q2A sourceIP=203.0.113.77 userAgent=python-requests/2.31',
    'e-cloudtrail-keyuse',
  ),
  log(
    'cloudtrail',
    t(4, 12),
    'warn',
    'DescribeRegions, DescribeInstanceTypeOfferings accessKeyId=AKIAJ4EXAMPLEKEY7Q2A',
    'e-cloudtrail-keyuse',
  ),
  log(
    'cloudtrail',
    t(5, 2),
    'warn',
    'RunInstances region=us-east-2 instanceType=p4d.24xlarge count=2 accessKeyId=AKIAJ4EXAMPLEKEY7Q2A',
    'e-cloudtrail-keyuse',
  ),
  log(
    'cloudtrail',
    t(7, 9),
    'warn',
    'ListBuckets, ListObjectsV2 bucket=acme-customer-exports accessKeyId=AKIAJ4EXAMPLEKEY7Q2A',
    'e-ct-s3',
  ),
  log(
    'cloudtrail',
    t(8, 30),
    'info',
    'ConsoleLogin success user=alice mfa=true sourceIP=198.51.100.12',
  ),
  log('cloudtrail', t(11, 20), 'info', 'Trail "main": delivery to s3://acme-audit-logs ok'),

  log(
    'ec2-compute',
    t(5, 40),
    'info',
    'i-0c4d7e91a2b3c4001 pending -> running region=us-east-2 tag launched-by=svc-deploy-legacy',
    'e-ec2-rogue',
  ),
  log(
    'ec2-compute',
    t(8, 15),
    'info',
    'i-0c4d7e91a2b3c4009 pending -> running region=us-east-2 tag launched-by=svc-deploy-legacy',
    'e-ec2-rogue',
  ),
  log(
    'ec2-compute',
    t(10, 40),
    'warn',
    'GuardDuty: CryptoCurrency:EC2/BitcoinTool.B!DNS i-0c4d7e91a2b3c4003 resolved pool.example-mining.net',
  ),
  log('ec2-compute', t(11, 5), 'info', 'ASG web-prod desired=6 running=6 (no scaling activity)'),

  log('s3-customer-exports', t(7, 12), 'info', 'Bucket policy unchanged since 2025-11-03'),
  log(
    's3-customer-exports',
    t(11, 30),
    'warn',
    'Server access logging: not enabled for bucket acme-customer-exports',
    'e-s3-no-data-events',
  ),

  log(
    'ci-pipeline',
    t(3, 20),
    'info',
    'deploy infra-scripts@main succeeded (role ci-deployer via OIDC, session 14m)',
  ),
  log(
    'ci-pipeline',
    t(9, 50),
    'info',
    'deploy web-prod succeeded (role ci-deployer via OIDC, session 14m)',
  ),
]

export const traces: TraceRecord[] = [
  {
    id: 'tr-runinstances',
    serviceId: 'ec2-compute',
    operation: 'RunInstances (us-east-2)',
    atSeconds: t(5, 2),
    durationMs: 1290,
    status: 'ok',
    spans: [
      {
        id: 's1',
        serviceId: 'ec2-compute',
        operation: 'ec2:RunInstances',
        startMs: 0,
        durationMs: 1290,
        status: 'ok',
        tags: { region: 'us-east-2', instanceType: 'p4d.24xlarge' },
      },
      {
        id: 's2',
        parentId: 's1',
        serviceId: 'aws-iam',
        operation: 'sts:GetCallerIdentity',
        startMs: 6,
        durationMs: 41,
        status: 'ok',
        tags: {
          principal: 'user/svc-deploy-legacy',
          credential: 'long-term access key',
          mfa: 'false',
        },
      },
      {
        id: 's3',
        parentId: 's1',
        serviceId: 'aws-iam',
        operation: 'iam policy evaluation',
        startMs: 50,
        durationMs: 18,
        status: 'ok',
        tags: { allowedBy: 'PowerUserAccess', sourceIP: '203.0.113.77', 'ip.condition': 'none' },
      },
      {
        id: 's4',
        parentId: 's1',
        serviceId: 'ec2-compute',
        operation: 'ec2:AllocateCapacity',
        startMs: 72,
        durationMs: 1190,
        status: 'ok',
        tags: { 'service.quota': 'p4d.24xlarge not restricted' },
      },
    ],
  },
  {
    id: 'tr-ci-deploy',
    serviceId: 'ci-pipeline',
    operation: 'CI deploy (infra-scripts)',
    atSeconds: t(3, 20),
    durationMs: 960,
    status: 'ok',
    spans: [
      {
        id: 's1',
        serviceId: 'ci-pipeline',
        operation: 'deploy infra-scripts',
        startMs: 0,
        durationMs: 960,
        status: 'ok',
      },
      {
        id: 's2',
        parentId: 's1',
        serviceId: 'aws-iam',
        operation: 'sts:AssumeRoleWithWebIdentity',
        startMs: 12,
        durationMs: 88,
        status: 'ok',
        tags: {
          principal: 'role/ci-deployer',
          credential: 'OIDC, 15 min session',
          sourceIP: 'GitHub Actions runner',
        },
      },
      {
        id: 's3',
        parentId: 's1',
        serviceId: 'ec2-compute',
        operation: 'ec2:DescribeInstances',
        startMs: 110,
        durationMs: 94,
        status: 'ok',
        tags: { region: 'us-east-1' },
      },
    ],
  },
]
