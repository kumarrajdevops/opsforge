import { AWS_PACK } from './aws'
import { CICD_PACK } from './cicd'
import { DOCKER_PACK } from './docker'
import { KUBERNETES_PACK } from './kubernetes'
import { OBSERVABILITY_PACK } from './observability'
import { TERRAFORM_PACK } from './terraform'
import type { TechnologyPack } from './types'

export const TECHNOLOGY_PACKS: TechnologyPack[] = [
  KUBERNETES_PACK,
  DOCKER_PACK,
  TERRAFORM_PACK,
  AWS_PACK,
  CICD_PACK,
  OBSERVABILITY_PACK,
]

/** The first pack serving any of the given catalog technologies, in the order listed. */
export function packFor(technologies: string[]): TechnologyPack | undefined {
  for (const id of technologies) {
    const pack = TECHNOLOGY_PACKS.find((p) => p.serves.includes(id))
    if (pack) return pack
  }
  return undefined
}

export type { TechnologyPack } from './types'
