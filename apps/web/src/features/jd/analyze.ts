import type {
  JdAlternativeGroup,
  JdAnalysis,
  JdPriority,
  JdResponsibility,
  JdSkill,
  JdTechnology,
  ResponsibilityTheme,
  SeniorityLevel,
  SenioritySignal,
  SenioritySignalKind,
  SkillArea,
} from '@opsforge/types'
import { collapse, excerpt } from '../interviewer/analysis/text'
import {
  countMentions,
  findTechnology,
  technologiesIn,
  technologyLabel,
} from '../technologies/catalog'

type SectionKind = 'required' | 'preferred' | 'responsibilities' | 'ignore' | 'other'

interface Line {
  text: string
  section: SectionKind
  bullet: boolean
}

const HEADINGS: [SectionKind, RegExp][] = [
  [
    'preferred',
    /^(nice[- ]to[- ]haves?|preferred( qualifications| skills| experience)?|bonus( points)?|desirable|good to have|pluses|extra credit)\b/,
  ],
  [
    'required',
    /^(requirements?|required( qualifications| skills| experience)?|must[- ]haves?|(minimum |basic )?qualifications|what you(?:'|’)?ll bring|what we(?:'|’)?re looking for|who you are|you have|skills( and experience)?|about you|experience|your (skills|experience|profile|background|qualifications)\b.*)\b/,
  ],
  [
    'responsibilities',
    /^(responsibilities|key responsibilities|what you(?:'|’)?ll do|the role|your role|day[- ]to[- ]day|duties|in this role|what you will do|your (impact|responsibilities)\b.*)\b/,
  ],
  [
    'ignore',
    /^(benefits|perks|what we offer|compensation|salary|about (us|the company|the team)|equal opportunity|why join|our (values|culture|mission)|how to apply)\b/,
  ],
]

const ROLE_WORD =
  /\b(engineer|sre|devops|platform|reliability|architect|manager|lead|developer|administrator|specialist)\b/i
const PREFERRED_CUE =
  /\b(nice[- ]to[- ]have|preferred|bonus|a plus|is a plus|are a plus|ideally|desirable|familiarity|exposure to|good to have|an advantage|would be great|beneficial)\b/i
const REQUIRED_CUE =
  /\b(required|requires?|must|essential|minimum|proficien\w*|strong|solid|extensive|proven|hands-on|expert\w*|deep|\d+\+? years)\b/i

function headingKind(raw: string): SectionKind | null {
  const line = raw
    .replace(/^[#>*\s_-]+/, '')
    .replace(/[*_:]+$/g, '')
    .trim()
    .toLowerCase()
  if (!line || line.length > 60 || /[.!?]$/.test(line)) return null
  for (const [kind, pattern] of HEADINGS) if (pattern.test(line)) return kind
  return null
}

/** Bullets, numbers and the "o" sub-bullet that Word leaves behind when text is pasted. */
const LIST_MARKER = /^(?:[-*•–◦▪●]|o(?=\s)|\d+[.)])\s+/

function splitLines(text: string): Line[] {
  const lines: Line[] = []
  let section: SectionKind = 'other'
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const isBullet = LIST_MARKER.test(trimmed)
    const heading = isBullet ? null : headingKind(trimmed)
    if (heading) {
      section = heading
      continue
    }
    const bullet = isBullet
    const body = collapse(trimmed.replace(LIST_MARKER, ''))
    if (!body) continue
    for (const part of body.split(/(?<=[.!?;])\s+/)) {
      const sentence = collapse(part)
      if (sentence.length >= 3) lines.push({ text: sentence, section, bullet })
    }
  }
  return lines
}

export function priorityOf(sentence: string, section: SectionKind): JdPriority {
  if (PREFERRED_CUE.test(sentence)) return 'preferred'
  if (REQUIRED_CUE.test(sentence)) return 'required'
  return section === 'preferred' ? 'preferred' : 'required'
}

function titleOf(text: string): string | undefined {
  const labelled = /^(?:job title|title|role|position)\s*[:-]\s*(.+)$/im.exec(text)
  if (labelled?.[1]) return collapse(labelled[1]).slice(0, 90)
  const first = text.split(/\r?\n/).find((l) => l.trim())
  if (first) {
    const clean = collapse(first.replace(/^[#*\s]+/, '').replace(/[*]+$/, ''))
    if (
      clean.length <= 90 &&
      !headingKind(clean) &&
      !/[.!?]$/.test(clean) &&
      ROLE_WORD.test(clean)
    ) {
      return clean
    }
  }
  const prose =
    /\b(?:looking for|seeking|hiring)\s+(?:an?\s+|the\s+)?([A-Z][\w&/+ -]{2,60}?)\s+(?:to|who|with|for)\b/.exec(
      text,
    )
  return prose?.[1] && ROLE_WORD.test(prose[1]) ? collapse(prose[1]) : undefined
}

// ───────────── Alternatives ─────────────

const CHOICE_CUE =
  /\b(?:at[- ]?least one(?: of)?|any (?:one )?of|one of|one or more of|either|one or the other)\b/i
/** A tool named only as an example ("e.g. AWS ECS") does not make it a separate requirement. */
const EXAMPLE_CUE = /\b(?:e\.g\.?|for example|such as|including)\b/i
const OR_LIST = /\bor\b|\//i
const LIST_ITEMS_MAX = 8

/** The largest set of two or more catalog technologies in one category, or null. */
function dominantCategory(ids: string[]): string[] | null {
  const byCategory = new Map<string, string[]>()
  for (const id of ids) {
    const category = findTechnology(id)?.category
    if (category) byCategory.set(category, [...(byCategory.get(category) ?? []), id])
  }
  const best = [...byCategory.values()].sort((a, b) => b.length - a.length)[0]
  return best && best.length >= 2 ? best : null
}

interface FoundGroups {
  groups: JdAlternativeGroup[]
  /** Lines that only express a choice; their tools are not separate requirements. */
  lines: Set<Line>
}

/**
 * Finds "at least one of AWS, Azure or GCP" style choices: a sentence with a choice cue and two or
 * more tools of one kind, a cue line followed by a bullet list of tools, or tools of one kind joined
 * by "or" or "/". Meeting any one option satisfies the requirement.
 */
function findAlternatives(lines: Line[]): FoundGroups {
  const groups: JdAlternativeGroup[] = []
  const grouped = new Set<Line>()
  const taken = new Set<string>()

  const add = (options: string[], from: Line[]) => {
    const unique = options.filter((id) => !taken.has(id))
    if (unique.length < 2) return
    const first = from[0]
    if (!first) return
    const category = findTechnology(unique[0] ?? '')?.category ?? 'tools'
    for (const id of unique) taken.add(id)
    for (const line of from) grouped.add(line)
    groups.push({
      id: `alt-${category}-${groups.length + 1}`,
      label: `One of ${unique.map(technologyLabel).join(' / ')}`,
      options: unique,
      priority: priorityOf(first.text, first.section),
      quote: excerpt(first.text),
    })
  }

  lines.forEach((line, index) => {
    if (line.section === 'ignore' || grouped.has(line)) return
    const ids = technologiesIn(line.text)
    const sameKind = dominantCategory(ids)
    if (CHOICE_CUE.test(line.text)) {
      if (sameKind) return add(sameKind, [line])
      const items: Line[] = []
      for (const next of lines.slice(index + 1, index + 1 + LIST_ITEMS_MAX)) {
        if (!next.bullet || next.section !== line.section) break
        items.push(next)
      }
      const listed = dominantCategory([...new Set(items.flatMap((l) => technologiesIn(l.text)))])
      if (listed) add(listed, [line, ...items])
      return
    }
    if (sameKind && OR_LIST.test(line.text) && !/\band\b/i.test(line.text)) add(sameKind, [line])
  })
  return { groups, lines: grouped }
}

// ───────────── Technologies ─────────────

function extractTechnologies(
  lines: Line[],
  text: string,
  { groups, lines: groupLines }: FoundGroups,
): JdTechnology[] {
  const found = new Map<string, JdTechnology>()
  const named = new Set<string>()
  for (const line of lines) {
    if (line.section === 'ignore') continue
    const priority = priorityOf(line.text, line.section)
    const inGroup = groupLines.has(line)
    for (const id of technologiesIn(line.text)) {
      if (!inGroup && !EXAMPLE_CUE.test(line.text)) named.add(id)
      const existing = found.get(id)
      if (existing && !(existing.priority === 'preferred' && priority === 'required')) continue
      found.set(id, {
        id,
        label: technologyLabel(id),
        priority,
        mentions: countMentions(text, id),
        quote: excerpt(line.text),
      })
    }
  }
  for (const group of groups) {
    for (const id of group.options) {
      const tech = found.get(id)
      if (tech && !named.has(id)) tech.group = group.id
    }
  }
  return [...found.values()].sort(
    (a, b) =>
      Number(a.priority === 'preferred') - Number(b.priority === 'preferred') ||
      b.mentions - a.mentions ||
      a.label.localeCompare(b.label),
  )
}

// ───────────── Responsibilities ─────────────

const RESPONSIBILITY_VERB =
  /^(design|build|own|lead|maintain|manage|develop|automate|mentor|improve|drive|collaborate|define|implement|ensure|participate|support|partner|monitor|operate|deploy|create|run|architect|provide|work|plan|troubleshoot|respond|establish|champion|contribute|review|optimi[sz]e|migrate|scale)\b/i

const THEMES: [ResponsibilityTheme, RegExp][] = [
  ['security', /\b(secur\w*|compliance|vulnerab\w*|iam|secrets?|audit\w*|hardening)\b/i],
  [
    'observability',
    /\b(monitor\w*|observab\w*|alert\w*|dashboards?|slos?|logging|metrics|tracing)\b/i,
  ],
  [
    'leadership',
    /\b(mentor\w*|coach\w*|hir(e|ing)|lead(ing)? (a |the )?(team|engineers)|technical (leadership|direction)|set direction)\b/i,
  ],
  [
    'reliability',
    /\b(reliab\w*|incidents?|on-call|availab\w*|resilien\w*|post-?mortems?|capacity|disaster|uptime|slas?|troubleshoot\w*)\b/i,
  ],
  ['cost', /\b(cost\w*|finops|budget\w*|spend)\b/i],
  ['delivery', /\b(ci\/cd|pipelines?|deploy\w*|release\w*|automat\w*|build\w*|delivery)\b/i],
  [
    'collaboration',
    /\b(collaborat\w*|partner\w*|stakeholders?|cross-functional|communicat\w*|document\w*)\b/i,
  ],
  [
    'platform',
    /\b(platform|infrastructure|clusters?|cloud|architect\w*|self-service|tooling|design\w*)\b/i,
  ],
]

function themeOf(text: string): ResponsibilityTheme {
  return THEMES.find(([, pattern]) => pattern.test(text))?.[0] ?? 'platform'
}

function extractResponsibilities(lines: Line[]): JdResponsibility[] {
  const seen = new Set<string>()
  const out: JdResponsibility[] = []
  for (const line of lines) {
    if (out.length >= 20) break
    const candidate =
      line.section === 'responsibilities' ||
      (line.bullet && line.section === 'other' && RESPONSIBILITY_VERB.test(line.text))
    if (!candidate || line.text.length < 15 || line.text.length > 240) continue
    const key = line.text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: `resp-${out.length + 1}`,
      text: line.text,
      theme: themeOf(line.text),
      technologies: technologiesIn(line.text),
    })
  }
  return out
}

// ───────────── Seniority ─────────────

const LEVEL_RANK: Record<SeniorityLevel, number> = { mid: 1, senior: 2, staff: 3 }
const RANK_LEVEL: SeniorityLevel[] = ['mid', 'senior', 'staff']

function titleLevel(text: string): SeniorityLevel | null {
  if (/\b(principal|staff|distinguished|architect)\b/i.test(text)) return 'staff'
  if (/\b(senior|sr\.?|lead)\b/i.test(text)) return 'senior'
  if (/\b(junior|jr\.?|associate|entry[- ]level|mid[- ]?level|intermediate)\b/i.test(text))
    return 'mid'
  return null
}

function yearsLevel(years: number): SeniorityLevel {
  if (years >= 8) return 'staff'
  if (years >= 4) return 'senior'
  return 'mid'
}

interface SignalRule {
  kind: SenioritySignalKind
  pattern: RegExp
  level: (match: string) => SeniorityLevel
}

const SIGNAL_RULES: SignalRule[] = [
  {
    kind: 'ownership',
    pattern: /\b(own(s|ing)?|ownership|end-to-end|accountab\w+|owner)\b/i,
    level: () => 'senior',
  },
  {
    kind: 'leadership',
    pattern:
      /\b(mentor\w*|coach\w*|tech(nical)? lead\w*|technical leadership|lead (a |the )?(team|engineers|initiatives?)|set(ting)? (the )?(technical )?direction)\b/i,
    level: (m) => (/direction|leadership/i.test(m) ? 'staff' : 'senior'),
  },
  {
    kind: 'architecture',
    pattern:
      /\b(architect\w*|system design|reference architecture|technical strategy|design reviews?)\b/i,
    level: (m) => (/strategy/i.test(m) ? 'staff' : 'senior'),
  },
  {
    kind: 'scope',
    pattern:
      /\b(at scale|large[- ]scale|multi-?region|global|enterprise|cross-team|org-?wide|hundreds of|thousands of|millions of)\b/i,
    level: (m) => (/org-?wide|global|millions|multi-?region/i.test(m) ? 'staff' : 'senior'),
  },
  {
    kind: 'on-call',
    pattern: /\b(on-call|pager|incident command\w*|rotation)\b/i,
    level: () => 'senior',
  },
]

function extractSeniority(
  lines: Line[],
  title: string | undefined,
): {
  signals: SenioritySignal[]
  level: SeniorityLevel | null
} {
  const signals: SenioritySignal[] = []
  const add = (kind: SenioritySignalKind, level: SeniorityLevel, quote: string) =>
    signals.push({ id: `sen-${signals.length + 1}`, kind, level, quote: excerpt(quote) })

  const fromTitle = title ? titleLevel(title) : null
  if (title && fromTitle) add('title', fromTitle, title)

  let years: { value: number; line: string } | null = null
  for (const line of lines) {
    // A range ("5 to 9 years") asks for its lower bound; the upper bound is not a requirement.
    for (const match of line.text.matchAll(
      /(\d{1,2})\s*(?:\+|(?:-|–|to)\s*\d{1,2}\s*\+?)?\s*(?:or more\s+)?years?/gi,
    )) {
      const value = Number(match[1])
      if (value > 0 && value < 40 && (!years || value > years.value))
        years = { value, line: line.text }
    }
  }
  if (years) add('years', yearsLevel(years.value), years.line)

  for (const rule of SIGNAL_RULES) {
    for (const line of lines) {
      if (line.section === 'ignore') continue
      const match = rule.pattern.exec(line.text)
      if (match) {
        add(rule.kind, rule.level(match[0]), line.text)
        break
      }
    }
  }

  if (signals.length === 0) return { signals, level: null }
  if (fromTitle) return { signals, level: fromTitle }
  const mean = signals.reduce((sum, s) => sum + LEVEL_RANK[s.level], 0) / signals.length
  return { signals, level: RANK_LEVEL[Math.min(2, Math.max(0, Math.round(mean) - 1))] ?? 'senior' }
}

// ───────────── Skills ─────────────

interface SkillRule {
  label: string
  area: SkillArea
  pattern: RegExp
  evidenceTechnology?: string
}

const SKILL_RULES: SkillRule[] = [
  {
    label: 'Incident response',
    area: 'practice',
    pattern: /\b(incident (response|management|command)|post-?mortems?|blameless)\b/i,
    evidenceTechnology: 'sre',
  },
  {
    label: 'Infrastructure as code',
    area: 'practice',
    pattern: /\b(infrastructure[- ]as[- ]code|iac)\b/i,
    evidenceTechnology: 'terraform',
  },
  {
    label: 'Monitoring and alerting',
    area: 'practice',
    pattern: /\b(monitoring|alerting|slos?|slis?|error budgets?)\b/i,
    evidenceTechnology: 'observability',
  },
  {
    label: 'CI/CD and release engineering',
    area: 'practice',
    pattern: /\b(ci\/cd|release engineering|continuous (delivery|deployment|integration))\b/i,
    evidenceTechnology: 'ci-cd',
  },
  {
    label: 'Capacity and performance',
    area: 'practice',
    pattern: /\b(capacity planning|performance tuning|load testing)\b/i,
    evidenceTechnology: 'sre',
  },
  {
    label: 'Disaster recovery',
    area: 'practice',
    pattern: /\b(disaster recovery|business continuity)\b/i,
    evidenceTechnology: 'sre',
  },
  {
    label: 'Security practices',
    area: 'practice',
    pattern: /\b(security (best practices|compliance|hardening)|devsecops|soc ?2|iso ?27001)\b/i,
    evidenceTechnology: 'devsecops',
  },
  {
    label: 'Troubleshooting',
    area: 'practice',
    pattern: /\b(troubleshoot\w*|root cause|debugging)\b/i,
    evidenceTechnology: 'sre',
  },
  {
    label: 'Cost optimisation',
    area: 'practice',
    pattern: /\b(cost (optimi[sz]ation|management|control|reduction)|finops)\b/i,
  },
  {
    label: 'Documentation and runbooks',
    area: 'communication',
    pattern: /\b(documentation|runbooks?|technical writing|written communication)\b/i,
  },
  {
    label: 'Stakeholder communication',
    area: 'communication',
    pattern:
      /\b(stakeholders?|cross-functional|communication skills|communicate (clearly|effectively))\b/i,
  },
  { label: 'Mentoring', area: 'leadership', pattern: /\b(mentor\w*|coach\w*)\b/i },
  {
    label: 'Technical leadership',
    area: 'leadership',
    pattern:
      /\b(technical leadership|tech lead|lead (a |the )?(team|engineers|initiatives?)|set(ting)? (the )?(technical )?direction)\b/i,
  },
  {
    label: 'Hiring and team building',
    area: 'leadership',
    pattern: /\b(hiring|recruit\w*|interviewing candidates|team building)\b/i,
  },
]

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function extractSkills(lines: Line[]): JdSkill[] {
  const found = new Map<string, JdSkill>()
  for (const line of lines) {
    if (line.section === 'ignore') continue
    const priority = priorityOf(line.text, line.section)
    for (const rule of SKILL_RULES) {
      if (!rule.pattern.test(line.text)) continue
      const existing = found.get(rule.label)
      if (existing && !(existing.priority === 'preferred' && priority === 'required')) continue
      found.set(rule.label, {
        id: `skill-${slug(rule.label)}`,
        label: rule.label,
        area: rule.area,
        priority,
        quote: excerpt(line.text),
        ...(rule.evidenceTechnology ? { evidenceTechnology: rule.evidenceTechnology } : {}),
      })
    }
  }
  return [...found.values()]
}

// ───────────── Entry point ─────────────

export function analyzeJd({
  id,
  text,
  now,
}: {
  id: string
  text: string
  now: string
}): JdAnalysis {
  const lines = splitLines(text)
  const title = titleOf(text)
  const { signals, level } = extractSeniority(lines, title)
  const alternatives = findAlternatives(lines)
  return {
    id,
    schemaVersion: 1,
    ...(title ? { title } : {}),
    rawText: text,
    analyzedAt: now,
    technologies: extractTechnologies(lines, text, alternatives),
    alternatives: alternatives.groups,
    responsibilities: extractResponsibilities(lines),
    seniority: signals,
    seniorityLevel: level,
    skills: extractSkills(lines),
  }
}
