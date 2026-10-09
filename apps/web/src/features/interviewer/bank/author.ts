import type { ConceptSpec, QuestionSpec, RedFlagSpec } from '@opsforge/types'

export interface ConceptOptions {
  /** 1 to 3. Defaults to 2. */
  w?: 1 | 2 | 3
  /** Defaults to true for weight 3. */
  required?: boolean
  kind?: ConceptSpec['kind']
  depth?: string
}

/**
 * Authoring shorthand. `terms` are lower-case phrases matched on word starts; `probe` is what a
 * real interviewer would ask when the idea is missing, and must not give the idea away.
 */
export function concept(
  id: string,
  label: string,
  summary: string,
  terms: string[],
  probe: string,
  options: ConceptOptions = {},
): ConceptSpec {
  const weight = options.w ?? 2
  return {
    id,
    label,
    summary,
    weight,
    required: options.required ?? weight === 3,
    kind: options.kind ?? 'core',
    terms,
    probe,
    ...(options.depth ? { depthProbe: options.depth } : {}),
  }
}

export function redFlag(
  id: string,
  label: string,
  patterns: string[],
  challenge: string,
  note: string,
): RedFlagSpec {
  return { id, label, patterns, challenge, note }
}

type QuestionInput = Omit<QuestionSpec, 'wordRange'> & { wordRange?: [number, number] }

export function question(input: QuestionInput): QuestionSpec {
  return { wordRange: [60, 240], ...input }
}
