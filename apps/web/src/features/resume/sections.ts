import type { ResumeSection, ResumeSectionKind } from '@opsforge/types'

const HEADINGS: { kind: ResumeSectionKind; pattern: RegExp }[] = [
  {
    kind: 'summary',
    pattern: /^(?:professional\s+)?(?:summary|profile|objective|about(?:\s+me)?)$/i,
  },
  {
    kind: 'experience',
    pattern:
      /^(?:(?:professional|relevant|work|employment|career)\s+)?(?:experience|history)(?:\s+history)?$|^employment$/i,
  },
  {
    kind: 'skills',
    pattern:
      /^(?:(?:technical|core|key)\s+)?(?:skills|competencies|technologies|tech\s+stack|toolbox|tools(?:\s*(?:&|and)\s*technologies)?)$/i,
  },
  { kind: 'projects', pattern: /^(?:(?:selected|key|personal|notable)\s+)?projects$/i },
  {
    kind: 'certifications',
    pattern: /^(?:certifications?|certificates?|licen[cs]es?(?:\s+and\s+certifications?)?)$/i,
  },
  { kind: 'education', pattern: /^(?:education|academics?|qualifications)$/i },
]

/** Returns the section kind when the line is a heading, else null. Tolerates `#`, `:` and ALL CAPS. */
export function headingKind(line: string): { kind: ResumeSectionKind; heading: string } | null {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_]+/g, '')
    .replace(/[:\-–—\s]+$/, '')
    .trim()
  if (cleaned.length === 0 || cleaned.length > 40) return null
  for (const { kind, pattern } of HEADINGS) {
    if (pattern.test(cleaned)) return { kind, heading: cleaned }
  }
  return null
}

/** Splits resume text into sections. Text before the first heading is kept as an `other` header block. */
export function splitSections(text: string): ResumeSection[] {
  const sections: ResumeSection[] = []
  let current: { kind: ResumeSectionKind; heading: string; lines: string[] } = {
    kind: 'other',
    heading: 'Header',
    lines: [],
  }
  const flush = () => {
    const body = current.lines.join('\n').trim()
    if (body) sections.push({ kind: current.kind, heading: current.heading, text: body })
  }
  for (const line of text.split(/\r?\n/)) {
    const heading = headingKind(line)
    if (heading) {
      flush()
      current = { ...heading, lines: [] }
    } else {
      current.lines.push(line)
    }
  }
  flush()
  return sections
}
