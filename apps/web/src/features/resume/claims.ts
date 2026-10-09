import type {
  ClaimFlag,
  ClaimKind,
  ResumeClaimItem,
  ResumeRecord,
  ResumeSection,
  ResumeSectionKind,
  ResumeSourceFormat,
} from '@opsforge/types'
import { collapse, countWords, excerpt, splitSentences } from '../interviewer/analysis/text'
import { technologiesIn, technologyLabel } from '../technologies/catalog'
import { splitSections } from './sections'

const MAX_CLAIMS = 30
const MAX_LISTED_SKILLS = 10

export const METRIC =
  /(?:\d+\s?%|\b\d[\d,.]*\s?(?:x|ms|s|min|minutes|hours|users|requests|rps|tb|gb|services|clusters|engineers|teams|nodes|environments|pipelines|releases|deployments)\b|\$\s?\d|\b\d[\d,]{2,}\b)/i

const VERB_GROUPS: { kind: ClaimKind; verbs: string[] }[] = [
  {
    kind: 'design',
    verbs: ['designed', 'architected', 'engineered', 'planned', 'modelled', 'modeled', 'defined'],
  },
  {
    kind: 'leadership',
    verbs: [
      'led',
      'mentored',
      'coached',
      'owned',
      'drove',
      'spearheaded',
      'established',
      'championed',
      'hired',
      'onboarded',
      'managed a team',
      'headed',
    ],
  },
  {
    kind: 'improvement',
    verbs: [
      'reduced',
      'improved',
      'optimized',
      'optimised',
      'increased',
      'decreased',
      'cut',
      'accelerated',
      'streamlined',
      'enhanced',
      'saved',
      'scaled',
      'hardened',
      'shortened',
      'eliminated',
    ],
  },
  {
    kind: 'operations',
    verbs: [
      'managed',
      'maintained',
      'operated',
      'monitored',
      'supported',
      'administered',
      'troubleshot',
      'resolved',
      'handled',
      'responded',
      'ran',
      'upgraded',
      'patched',
    ],
  },
  {
    kind: 'implementation',
    verbs: [
      'implemented',
      'deployed',
      'built',
      'configured',
      'installed',
      'set up',
      'migrated',
      'automated',
      'developed',
      'created',
      'provisioned',
      'containerized',
      'containerised',
      'integrated',
      'wrote',
      'introduced',
      'launched',
      'rolled out',
      'delivered',
      'authored',
      'adopted',
    ],
  },
]

const TEAM_LANGUAGE =
  /^(?:assisted|helped|participated|involved|contributed|exposure|familiar|worked (?:on|with|in)|part of|member of)\b|\b(?:team of|alongside|together with)\b/i
const VAGUE =
  /\b(?:various|several|multiple|numerous|many|different|a number of|etc\.?|and more)\b/i

function leadingVerb(line: string): { verb: string; kind: ClaimKind } | null {
  const lower = line.toLowerCase()
  for (const group of VERB_GROUPS) {
    for (const verb of group.verbs) {
      if (lower === verb || lower.startsWith(`${verb} `)) return { verb, kind: group.kind }
    }
  }
  return null
}

function flagsFor(text: string, hasMetric: boolean, technologies: string[]): ClaimFlag[] {
  const flags: ClaimFlag[] = []
  if (!hasMetric) flags.push('no-metric')
  if (TEAM_LANGUAGE.test(text)) flags.push('team-language')
  if (VAGUE.test(text) || (technologies.length > 0 && countWords(text) <= 7)) {
    flags.push('vague-scope')
  }
  return flags
}

const BULLET = /^[\s]*(?:[-*•·▪●◦►‣]|\d+[.)])\s+/

/** Hard-wrapped text (PDF and Word exports) continues a line in lower case or mid-bracket. */
const CONTINUATION = /^\s*[a-z(),;\])]/

function joinWrappedLines(sectionText: string): string[] {
  const lines: string[] = []
  for (const raw of sectionText.split(/\r?\n/)) {
    const previous = lines[lines.length - 1]
    if (raw.trim() && previous?.trim() && !BULLET.test(raw) && CONTINUATION.test(raw)) {
      lines[lines.length - 1] = `${previous} ${raw.trim()}`
    } else {
      lines.push(raw)
    }
  }
  return lines
}

function sentenceUnits(sectionText: string): { text: string; bulleted: boolean }[] {
  const units: { text: string; bulleted: boolean }[] = []
  for (const raw of joinWrappedLines(sectionText)) {
    if (!raw.trim()) continue
    const bulleted = BULLET.test(raw)
    const body = raw.replace(BULLET, '')
    const parts = body.length > 220 ? splitSentences(body) : [body]
    for (const part of parts) units.push({ text: collapse(part), bulleted })
  }
  return units
}

const CLAIM_SECTIONS: ResumeSectionKind[] = ['experience', 'projects', 'summary', 'other']

function claimsFromSection(section: ResumeSection): Omit<ResumeClaimItem, 'id'>[] {
  const claims: Omit<ResumeClaimItem, 'id'>[] = []
  let context: string | undefined
  for (const { text, bulleted } of sentenceUnits(section.text)) {
    const words = countWords(text)
    const verb = leadingVerb(text)
    const technologies = technologiesIn(text)
    const hasMetric = METRIC.test(text)
    const looksLikeHeading = !bulleted && words < 12 && !verb && !/[.!?]$/.test(text)
    if (looksLikeHeading) {
      if (text.length <= 100) context = text
      continue
    }
    if (words < 5 && !(verb && technologies.length > 0)) continue
    if (technologies.length === 0 && !hasMetric && !verb) continue
    claims.push({
      text: excerpt(text, 240),
      technologies,
      hasMetric,
      kind: verb?.kind ?? (hasMetric ? 'improvement' : 'implementation'),
      section: section.kind,
      ...(context ? { context } : {}),
      ...(verb ? { verb: verb.verb } : {}),
      flags: flagsFor(text, hasMetric, technologies),
    })
  }
  return claims
}

/** One weak claim per technology that appears only in a skills list: the first thing an interviewer probes. */
function listedSkillClaims(
  sections: ResumeSection[],
  claimed: Set<string>,
): Omit<ResumeClaimItem, 'id'>[] {
  const out: Omit<ResumeClaimItem, 'id'>[] = []
  const seen = new Set(claimed)
  for (const section of sections.filter((s) => s.kind === 'skills')) {
    for (const id of technologiesIn(section.text)) {
      if (seen.has(id) || out.length >= MAX_LISTED_SKILLS) continue
      seen.add(id)
      out.push({
        text: `${technologyLabel(id)} (listed under skills)`,
        technologies: [id],
        hasMetric: false,
        kind: 'implementation',
        section: 'skills',
        flags: ['listed-only', 'no-metric'],
      })
    }
  }
  return out
}

/**
 * Re-reads the technologies on a saved resume against the current catalog, in memory. Claim ids are
 * untouched because drill attempts refer to them.
 */
export function refreshTechnologies(record: ResumeRecord): ResumeRecord {
  return {
    ...record,
    claims: record.claims.map((claim) => ({ ...claim, technologies: technologiesIn(claim.text) })),
  }
}

export interface ExtractedResume {
  sections: ResumeSection[]
  claims: ResumeClaimItem[]
}

/**
 * Splits a resume into sections and extracts the statements an interviewer would probe. Pure and
 * deterministic: the same text always yields the same claims with the same ids.
 */
export function extractResume(text: string): ExtractedResume {
  const sections = splitSections(text)
  const body = sections.filter((s) => CLAIM_SECTIONS.includes(s.kind))
  const raw: Omit<ResumeClaimItem, 'id'>[] = []
  const seen = new Set<string>()
  for (const section of body) {
    for (const claim of claimsFromSection(section)) {
      const key = claim.text.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      raw.push(claim)
    }
  }
  const claimed = new Set(raw.flatMap((c) => c.technologies))
  const all = [...raw.slice(0, MAX_CLAIMS), ...listedSkillClaims(sections, claimed)]
  return {
    sections,
    claims: all.map((claim, index) => ({ ...claim, id: `claim-${index + 1}` })),
  }
}

export function buildResumeRecord(input: {
  id: string
  text: string
  format: ResumeSourceFormat
  fileName?: string
  now: string
}): ResumeRecord {
  const { sections, claims } = extractResume(input.text)
  return {
    id: input.id,
    schemaVersion: 1,
    format: input.format,
    importedAt: input.now,
    rawText: input.text,
    sections,
    claims,
    attempts: [],
    ...(input.fileName ? { fileName: input.fileName } : {}),
  }
}
