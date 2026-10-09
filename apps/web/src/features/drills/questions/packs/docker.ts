import type { TechnologyPack } from './types'

export const DOCKER_PACK: TechnologyPack = {
  id: 'docker',
  label: 'Docker',
  serves: ['docker'],
  categories: {
    architecture: {
      prompt:
        'Describe how you containerised that workload: how images were built and layered, where they were stored, how they ran, and why it was structured that way.',
      concepts: [
        [
          'Image build and layering',
          [
            'multi-stage',
            'layer',
            'dockerfile',
            'build cache',
            'base image',
            'buildkit',
            'image size',
          ],
          'How was an image produced, and what kept it small and quick to build?',
          3,
        ],
        [
          'Registry and promotion',
          ['registry', 'ecr', 'tag', 'digest', 'immutable', 'promote', 'artifact', 'pull'],
          'How did an image move from build to production?',
          2,
        ],
        [
          'Runtime and orchestration',
          ['compose', 'kubernetes', 'ecs', 'swarm', 'runtime', 'containerd', 'orchestrat'],
          'What actually ran the containers?',
          2,
        ],
        [
          'Configuration and state',
          [
            'environment variable',
            'volume',
            'config',
            'stateless',
            'persistent',
            '12-factor',
            'twelve-factor',
            'bind mount',
          ],
          'Where did configuration and data live relative to the container?',
          3,
        ],
      ],
    },
    networking: {
      prompt:
        'Explain the container networking in that setup: how containers reached each other and the outside world, how ports were published, and how you debugged a connection that failed.',
      concepts: [
        [
          'Network drivers',
          ['bridge', 'host network', 'overlay', 'macvlan', 'user-defined network', 'network mode'],
          'Which network mode was used and why?',
          3,
        ],
        [
          'Port publishing and NAT',
          ['publish', 'port mapping', 'expose', 'nat', 'iptables', '-p', 'host port'],
          'How did a request on the host reach a container?',
          2,
        ],
        [
          'Name resolution between containers',
          ['dns', 'service name', 'embedded dns', 'link', 'compose network', 'hostname'],
          'How did one container find another?',
          2,
        ],
        [
          'Debugging connectivity',
          [
            'docker exec',
            'netshoot',
            'curl',
            'inspect',
            'tcpdump',
            'ping',
            'nslookup',
            'docker network',
          ],
          'How did you check a container could reach something?',
          2,
        ],
      ],
    },
    security: {
      prompt:
        'What did you do to make those containers safe to run: image contents, privileges, secrets and what an attacker who got into one container could reach?',
      concepts: [
        [
          'Minimal and trusted images',
          [
            'distroless',
            'minimal',
            'slim',
            'alpine',
            'trusted base',
            'pinned',
            'digest',
            'official image',
          ],
          'What went into the image, and what was deliberately left out?',
          2,
        ],
        [
          'Running as non-root with limited capabilities',
          [
            'non-root',
            'user',
            'capabilit',
            'read-only',
            'no-new-privileges',
            'seccomp',
            'apparmor',
            'rootless',
          ],
          'What could the process inside do on the host?',
          3,
        ],
        [
          'Secrets kept out of images',
          [
            'secret',
            'build arg',
            'vault',
            'environment',
            'docker secret',
            'not in the image',
            'layer history',
          ],
          'How did sensitive values reach the container without being baked in?',
          3,
        ],
        [
          'Scanning and provenance',
          ['scan', 'trivy', 'snyk', 'cve', 'sbom', 'signed', 'cosign', 'vulnerab'],
          'How did you know an image was safe to deploy?',
          2,
        ],
      ],
    },
    observability: {
      prompt:
        'How did you observe those containers in production: logs, health, resource usage and knowing when one was misbehaving?',
      concepts: [
        [
          'Logging to stdout and aggregation',
          ['stdout', 'log driver', 'json-file', 'fluentd', 'loki', 'aggregat', 'docker logs'],
          'Where did logs go and how did you search them?',
          3,
        ],
        [
          'Health checks',
          ['healthcheck', 'health check', 'readiness', 'liveness', 'unhealthy', 'restart policy'],
          'How did the platform tell a stuck container from a working one?',
          2,
        ],
        [
          'Resource metrics and limits',
          ['cadvisor', 'docker stats', 'memory limit', 'cpu limit', 'throttl', 'oom', 'prometheus'],
          'How did you see a container running out of memory?',
          3,
        ],
        [
          'Alerting',
          ['alert', 'restart count', 'crash loop', 'threshold', 'page', 'dashboard'],
          'What would page someone?',
          1,
        ],
      ],
    },
    troubleshooting: {
      prompt:
        'A container that worked locally keeps exiting in production. Walk me through finding out why, step by step.',
      concepts: [
        [
          'Exit code and logs first',
          ['exit code', 'docker logs', 'docker ps -a', 'status', 'crash', '137', 'stderr'],
          'What is the first thing you read?',
          3,
        ],
        [
          'Inspecting a live container',
          [
            'docker exec',
            'docker inspect',
            'shell into',
            'environment',
            'mounts',
            'entrypoint',
            'cmd',
          ],
          'How do you look inside while it is running?',
          2,
        ],
        [
          'Resource kills',
          ['oom', 'out of memory', 'memory limit', 'cgroup', 'killed', 'dmesg'],
          'What if the process was killed from outside?',
          2,
        ],
        [
          'Differences between local and production',
          [
            'environment difference',
            'config',
            'architecture',
            'arm',
            'amd64',
            'volume',
            'permission',
            'network',
            'image tag',
          ],
          'What commonly differs between your laptop and production?',
          3,
        ],
        [
          'Image and build issues',
          ['layer cache', 'stale', 'tag', 'latest', 'rebuild', 'pull', 'digest', 'entrypoint'],
          'How could the wrong image be running?',
          2,
        ],
      ],
    },
    'trade-offs': {
      prompt:
        'What trade-offs did you make with containers: base image choice, image size versus debuggability, Compose versus an orchestrator, running as root, or not containerising at all?',
      concepts: [
        [
          'Base image choice',
          ['alpine', 'distroless', 'debian', 'ubuntu', 'musl', 'glibc', 'slim', 'scratch'],
          'Which base did you pick and what did it cost you?',
          3,
        ],
        [
          'Small images versus debuggability',
          ['debug', 'shell', 'ephemeral container', 'troubleshoot', 'tools in image', 'size'],
          'How did you debug an image that had no shell?',
          2,
        ],
        [
          'Compose versus an orchestrator',
          ['compose', 'kubernetes', 'ecs', 'swarm', 'single host', 'complexity', 'orchestrat'],
          'When was a simple setup enough?',
          2,
        ],
        [
          'Containers versus other packaging',
          ['virtual machine', 'vm', 'serverless', 'binary', 'systemd', 'overhead', 'isolation'],
          'Was a container the right unit?',
          2,
        ],
        [
          'Rootless and security cost',
          ['rootless', 'root', 'compat', 'privileged', 'friction', 'build tooling'],
          'What did hardening cost in effort or compatibility?',
          1,
        ],
      ],
    },
    incidents: {
      prompt:
        'Describe an incident involving containers: a bad image, a registry outage, a disk filling up, or an out-of-memory kill. How was it found, fixed, communicated and prevented?',
      concepts: [
        [
          'Detection',
          ['alert', 'restart', 'health check', 'error rate', 'customers', 'monitor', 'paged'],
          'How did you find out?',
          2,
        ],
        [
          'Mitigation',
          ['rollback', 'previous tag', 'redeploy', 'pin', 'scale', 'restart', 'prune', 'mirror'],
          'What got service back first?',
          3,
        ],
        [
          'Cause',
          [
            'root cause',
            'disk full',
            'latest tag',
            'oom',
            'registry',
            'base image',
            'dependency',
            'layer',
          ],
          'What turned out to be the cause?',
          2,
        ],
        [
          'Communication',
          ['stakeholder', 'status', 'update', 'incident commander', 'escalat'],
          'Who was kept informed?',
          1,
        ],
        [
          'Prevention',
          [
            'immutable tag',
            'digest',
            'registry mirror',
            'cleanup',
            'limits',
            'scan',
            'postmortem',
            'runbook',
            'cache',
          ],
          'What did you change to stop it recurring?',
          3,
        ],
      ],
    },
  },
}
