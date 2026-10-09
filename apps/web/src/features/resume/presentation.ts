import type { TechnologyCategory } from '../technologies/catalog'
import type { ClaimFlag, ClaimKind, DefensibilityLevel, ResumeSectionKind } from '@opsforge/types'
import type { Tone } from '@opsforge/ui'

export const FLAG_LABEL: Record<ClaimFlag, string> = {
  'no-metric': 'No numbers',
  'team-language': 'Team wording',
  'vague-scope': 'Vague scope',
  'listed-only': 'Skill list only',
}

export const FLAG_HINT: Record<ClaimFlag, string> = {
  'no-metric': 'No measurable result. Expect “how much, how many, compared with what?”',
  'team-language': 'Says “we” or “helped”. Expect “what did you personally do?”',
  'vague-scope': 'Does not say how big it was. Expect “how many services, users, regions?”',
  'listed-only':
    'Appears only in a skills list, with no work attached. Expect to be asked for an example.',
}

export const KIND_LABEL: Record<ClaimKind, string> = {
  implementation: 'Built',
  design: 'Designed',
  operations: 'Operated',
  improvement: 'Improved',
  leadership: 'Led',
}

export const SECTION_LABEL: Record<ResumeSectionKind, string> = {
  summary: 'Summary',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  education: 'Education',
  other: 'Other',
}

export function defensibilityTone(level: DefensibilityLevel): Tone {
  switch (level) {
    case 'strong':
      return 'success'
    case 'defensible':
      return 'primary'
    case 'shaky':
      return 'warning'
    case 'exposed':
      return 'error'
    default:
      return 'neutral'
  }
}

export const CATEGORY_LABEL: Record<TechnologyCategory, string> = {
  cloud: 'Cloud platform',
  iac: 'Infrastructure as Code',
  containers: 'Containerization',
  orchestration: 'Container orchestration',
  delivery: 'CI/CD',
  'source-control': 'Version control',
  artifacts: 'Artifact repository',
  observability: 'Monitoring and observability',
  security: 'Security tooling',
  platform: 'Networking and infrastructure',
  data: 'Data and messaging',
  language: 'Programming and scripting',
  practice: 'Practice',
  identity: 'Identity and access',
  testing: 'Testing and quality',
  itsm: 'ITSM and reliability',
  finops: 'FinOps and cost',
  collaboration: 'Documentation and governance',
  automation: 'AIOps and automation',
  ai: 'AI, ML and LLM tooling',
}
