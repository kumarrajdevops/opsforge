import type { InterrogationCategory } from '@opsforge/types'
import type { ConceptRow } from '../generic'

export interface PackCategory {
  prompt: string
  concepts: ConceptRow[]
}

/**
 * Technology-specific question content. A pack may omit categories; those fall back to the
 * technology-neutral rubric. Rubrics are authored data: reviewed, versioned and testable.
 */
export interface TechnologyPack {
  id: string
  label: string
  /** Catalog technology ids this pack applies to. */
  serves: string[]
  categories: Partial<Record<InterrogationCategory, PackCategory>>
}
