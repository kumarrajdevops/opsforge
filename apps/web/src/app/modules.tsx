import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined'
import AltRouteOutlined from '@mui/icons-material/AltRouteOutlined'
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined'
import FactCheckOutlined from '@mui/icons-material/FactCheckOutlined'
import ForumOutlined from '@mui/icons-material/ForumOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined'
import LayersOutlined from '@mui/icons-material/LayersOutlined'
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined'
import RecordVoiceOverOutlined from '@mui/icons-material/RecordVoiceOverOutlined'
import ReportProblemOutlined from '@mui/icons-material/ReportProblemOutlined'
import StyleOutlined from '@mui/icons-material/StyleOutlined'
import TerminalOutlined from '@mui/icons-material/TerminalOutlined'
import WorkOutlineOutlined from '@mui/icons-material/WorkOutlineOutlined'
import type { NavGroup } from '@opsforge/ui'
import type { ReactNode } from 'react'

export interface ModuleDefinition {
  id: string
  path: string
  label: string
  /** Brand module name (OPSFORGE Forge* naming); undefined where the product has not named one yet. */
  forge?: string
  group: 'command' | 'learn' | 'practice' | 'design' | 'interview' | 'analytics'
  icon: ReactNode
  summary: string
  /** Roadmap facts shown on the placeholder page; absent once the module is built. */
  planned?: { phase: string; feeds?: string; needs?: string }
}

/** Single source of truth for routes, navigation and module placeholders (spec navigation IA). */
export const MODULES: ModuleDefinition[] = [
  {
    id: 'command-center',
    path: '/',
    label: 'Command Center',
    group: 'command',
    icon: <DashboardOutlined fontSize="small" />,
    summary: 'Readiness at a glance: today’s focus, skill matrix, recent evidence.',
  },
  {
    id: 'knowledge',
    path: '/knowledge',
    label: 'Knowledge',
    forge: 'ForgeLearn',
    group: 'learn',
    icon: <MenuBookOutlined fontSize="small" />,
    summary: 'Per-technology knowledge hubs with documentation, mind maps and commands.',
    planned: { phase: 'Phase 06', feeds: 'Knowledge and Confidence', needs: 'None' },
  },
  {
    id: 'documents',
    path: '/documents',
    label: 'Documents',
    group: 'learn',
    icon: <DescriptionOutlined fontSize="small" />,
    summary: 'Ingest official and personal material with preserved provenance.',
    planned: { phase: 'Phase 07', feeds: 'Knowledge', needs: 'Knowledge' },
  },
  {
    id: 'flashcards',
    path: '/flashcards',
    label: 'Flashcards',
    forge: 'ForgeCards',
    group: 'learn',
    icon: <StyleOutlined fontSize="small" />,
    summary: 'Spaced-repetition recall for concepts, commands and troubleshooting facts.',
    planned: { phase: 'Phase 10', feeds: 'Flashcards', needs: 'Knowledge' },
  },
  {
    id: 'questions',
    path: '/questions',
    label: 'Questions',
    group: 'practice',
    icon: <HelpOutlineOutlined fontSize="small" />,
    summary: 'Adaptive question and scenario engine across four difficulty levels.',
    planned: {
      phase: 'Phase 12',
      feeds: 'Questions',
      needs: 'Knowledge, and Reading Mode (phase 08)',
    },
  },
  {
    id: 'scenarios',
    path: '/scenarios',
    label: 'Scenarios',
    group: 'practice',
    icon: <AltRouteOutlined fontSize="small" />,
    summary:
      'Branching scenarios where each decision changes what happens next, from outage triage to migration planning.',
    planned: { phase: 'Phase 13', needs: 'Questions. Shares its engine with Incidents' },
  },
  {
    id: 'incidents',
    path: '/incidents',
    label: 'Incidents',
    forge: 'ForgeOps',
    group: 'practice',
    icon: <ReportProblemOutlined fontSize="small" />,
    summary: 'Production incident simulator: investigate, mitigate, RCA, prevent.',
  },
  {
    id: 'labs',
    path: '/labs',
    label: 'Hands-on Labs',
    forge: 'ForgeLab',
    group: 'practice',
    icon: <TerminalOutlined fontSize="small" />,
    summary: 'Sandboxed Linux, Docker, Kubernetes, Terraform and CI/CD labs.',
    planned: {
      phase: 'Phases 28 and 29',
      feeds: 'Hands-on labs',
      needs: 'Terminal foundation (browser emulation, ADR-0007)',
    },
  },
  {
    id: 'architecture',
    path: '/architecture',
    label: 'Architecture Studio',
    forge: 'ForgeArchitect',
    group: 'design',
    icon: <AccountTreeOutlined fontSize="small" />,
    summary: 'Design against requirements, then review with rules plus AI.',
  },
  {
    id: 'patterns',
    path: '/patterns',
    label: 'Patterns',
    group: 'design',
    icon: <LayersOutlined fontSize="small" />,
    summary: 'Architecture patterns: when to use them, and when not to.',
    planned: { phase: 'Phase 20', needs: 'Questions and Architecture Studio' },
  },
  {
    id: 'interviewer',
    path: '/interviewer',
    label: 'AI Interviewer',
    forge: 'ForgeInterview',
    group: 'interview',
    icon: <RecordVoiceOverOutlined fontSize="small" />,
    summary: 'Dynamic technical, architecture and behavioral interviews with hidden scores.',
  },
  {
    id: 'resume',
    path: '/resume',
    label: 'Resume Interrogation',
    forge: 'ForgeResume',
    group: 'interview',
    icon: <FactCheckOutlined fontSize="small" />,
    summary: 'Make every resume claim technically defensible.',
  },
  {
    id: 'jd',
    path: '/jd',
    label: 'JD Analyzer',
    forge: 'ForgeJD',
    group: 'interview',
    icon: <WorkOutlineOutlined fontSize="small" />,
    summary: 'Turn a job description into a weighted preparation plan.',
  },
  {
    id: 'behavioral',
    path: '/behavioral',
    label: 'Behavioral',
    group: 'interview',
    icon: <ForumOutlined fontSize="small" />,
    summary:
      'Behavioral questions, STAR answers built from your own experience, and communication coaching.',
    planned: {
      phase: 'Phases 36 and 37',
      feeds: 'Communication',
      needs: 'Questions and Reading Mode',
    },
  },
  {
    id: 'readiness',
    path: '/readiness',
    label: 'Readiness',
    forge: 'ForgeReady',
    group: 'analytics',
    icon: <AssessmentOutlined fontSize="small" />,
    summary: 'Evidence-based readiness score, weaknesses and the next best actions.',
  },
  {
    id: 'replay',
    path: '/replay',
    label: 'Interview Replay',
    group: 'analytics',
    icon: <HistoryOutlined fontSize="small" />,
    summary:
      'Replay any past interview question by question: your answer, what was missed and how the score was reached.',
    planned: {
      phase: 'Phase 40',
      needs:
        'Full interview simulation. Per-interview replay already exists in the AI Interviewer debrief',
    },
  },
]

const GROUP_LABELS: Record<ModuleDefinition['group'], string> = {
  command: 'Command',
  learn: 'Learn',
  practice: 'Practice',
  design: 'Design',
  interview: 'Interview',
  analytics: 'Analytics',
}

export function buildNavGroups(extra: NavGroup[] = []): NavGroup[] {
  const order = Object.keys(GROUP_LABELS) as ModuleDefinition['group'][]
  const groups = order.map((group) => ({
    id: group,
    label: GROUP_LABELS[group],
    items: MODULES.filter((m) => m.group === group).map((m) => ({
      id: m.id,
      label: m.label,
      to: m.path,
      icon: m.icon,
    })),
  }))
  return [...groups, ...extra]
}

/** Longest-prefix match so nested routes keep their parent highlighted. */
export function findActiveId(
  pathname: string,
  extraPaths: Record<string, string> = {},
): string | undefined {
  const candidates = [
    ...MODULES.map((m) => ({ id: m.id, path: m.path })),
    ...Object.entries(extraPaths).map(([id, path]) => ({ id, path })),
  ]
  return candidates
    .filter((c) =>
      c.path === '/' ? pathname === '/' : pathname === c.path || pathname.startsWith(`${c.path}/`),
    )
    .sort((a, b) => b.path.length - a.path.length)[0]?.id
}
