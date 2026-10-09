import type { Technology, TechnologyCategory } from './catalog'

/** One row of the tools inventory workbook, as converted by scripts/inventory-to-json.mjs. */
export interface InventoryRow {
  id: number
  discipline: string
  name: string
  category: string
  website: string
  docs: string
}

/** Names that are ordinary English words: matching them would invent tools, so they are never matched. */
const SKIP = new Set(
  [
    'Aim',
    'Boundary',
    'C',
    'Changesets',
    'Comet',
    'Compass',
    'Continue',
    'Cortex',
    'Cursor',
    'Dagger',
    'Elementary',
    'Guidance',
    'Instructor',
    'Just',
    'kind',
    'Make',
    'Marker',
    'Outlines',
    'PIT',
    'Poetry',
    'Port',
    'R',
    'Salt',
    'Singer',
    'Singularity',
    'Soda',
    'Task',
    'Vector',
  ].map((n) => n.toLowerCase()),
)

/** Names that are also words but read as a tool when capitalised exactly as written. */
const CASE_SENSITIVE = new Set([
  'Atlantis',
  'Blameless',
  'Calico',
  'Cargo',
  'Chroma',
  'Consul',
  'Dask',
  'Dex',
  'Discord',
  'Falco',
  'Flannel',
  'Gremlin',
  'Harbor',
  'Harness',
  'Kong',
  'Mermaid',
  'Mocha',
  'Neon',
  'Notion',
  'Pact',
  'Prefect',
  'Presto',
  'Ralph',
  'Ray',
  'Rebuff',
  'Rust',
  'Slack',
  'Sphinx',
  'Teleport',
  'Temporal',
  'Tilt',
  'Volcano',
  'Windmill',
  'Wiz',
  'Yarn',
])

const AI_DISCIPLINES = new Set([
  'MLOps',
  'Generative AI and Model Development',
  'LLMOps and AI Applications',
  'RAG and Retrieval',
  'AI Infrastructure',
  'AI Governance',
])

const SOURCE_CONTROL =
  /^(git|github|gitlab|bitbucket|gitea|gerrit|mercurial|subversion|svn|perforce|azure devops)\b/i
const RUNTIME = /\b(docker|podman|containerd|cri-o|buildah|buildkit|kaniko|lxc|lxd)\b/i

const BY_DISCIPLINE: Record<string, TechnologyCategory> = {
  'Cloud Platforms': 'cloud',
  'IaC and Configuration': 'iac',
  'Containers and Platform Engineering': 'orchestration',
  'DevOps and Delivery': 'delivery',
  'Artifact and Package Management': 'artifacts',
  'Observability and Monitoring': 'observability',
  'DevSecOps and Security': 'security',
  'Identity and Access': 'identity',
  'Networking and Edge': 'platform',
  'Programming and Scripting': 'language',
  'Databases and Vector Stores': 'data',
  'Data Engineering': 'data',
  'Testing and Quality': 'testing',
  'ITSM and Reliability': 'itsm',
  'FinOps and Cost Management': 'finops',
  'Documentation and Collaboration': 'collaboration',
  'Asset Management and Governance': 'collaboration',
  'AIOps and Automation': 'automation',
}

export function categoryOf(row: Pick<InventoryRow, 'discipline' | 'name'>): TechnologyCategory {
  if (AI_DISCIPLINES.has(row.discipline)) return 'ai'
  if (row.discipline === 'Containers and Platform Engineering' && RUNTIME.test(row.name)) {
    return 'containers'
  }
  if (row.discipline === 'DevOps and Delivery' && SOURCE_CONTROL.test(row.name)) {
    return 'source-control'
  }
  return BY_DISCIPLINE[row.discipline] ?? 'platform'
}

/** Cloud-vendor services belong to their platform and are never listed on their own. */
const PLATFORM_OF: [RegExp, string][] = [
  [/^(amazon|aws)\b/i, 'aws'],
  [/^(azure|microsoft (azure|entra|defender|purview))\b/i, 'azure'],
  [/^(google (cloud|kubernetes|artifact|vertex)|vertex ai)\b/i, 'gcp'],
]

export function platformOf(name: string): string | undefined {
  return PLATFORM_OF.find(([pattern]) => pattern.test(name))?.[1]
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\+/g, 'p')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Spellings that identify a tool: the name, its abbreviation, each side of "A / B", and without "Apache". */
export function aliasesOf(name: string): string[] {
  const aliases = new Set<string>()
  const add = (spelling: string, exact = false) => {
    const clean = spelling.trim()
    if (clean.length < 2 || SKIP.has(clean.toLowerCase())) return
    const sensitive = exact || clean.length <= 3 || CASE_SENSITIVE.has(clean)
    aliases.add(sensitive ? `=${clean}` : `${clean}!`)
  }
  for (const part of name.split(' / ')) {
    const abbreviation = part.match(/^(.*?)\s*\(([^)]+)\)$/)
    add(abbreviation?.[1] ?? part)
    if (abbreviation?.[2]) add(abbreviation[2], abbreviation[2].length <= 3)
    const bare = part.match(/^apache\s+(\S{4,})$/i)?.[1]
    if (bare) add(bare, true)
  }
  return [...aliases]
}

export interface InventoryCatalog {
  entries: Technology[]
  /** Extra spellings that belong to a cloud platform already in the catalog. */
  folded: Record<string, string[]>
}

/**
 * Turns the inventory into catalog entries. A name the curated catalog already recognises, or a
 * duplicate of an earlier row, adds nothing; a cloud-vendor service folds into its platform.
 */
export function buildInventoryCatalog(
  rows: InventoryRow[],
  options: {
    isCovered: (name: string) => boolean
    /** Ids already taken by curated entries. */
    knownIds: Iterable<string>
    topicFor: (category: TechnologyCategory) => string
  },
): InventoryCatalog {
  const entries: Technology[] = []
  const folded: Record<string, string[]> = {}
  const seen = new Set<string>()
  const ids = new Set(options.knownIds)
  const ordered = [...rows].sort(
    (a, b) =>
      Number(AI_DISCIPLINES.has(a.discipline)) - Number(AI_DISCIPLINES.has(b.discipline)) ||
      a.id - b.id,
  )

  for (const row of ordered) {
    const key = row.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (options.isCovered(row.name) || SKIP.has(key)) continue

    const platform = platformOf(row.name)
    if (platform) {
      folded[platform] = [...(folded[platform] ?? []), ...aliasesOf(row.name)]
      continue
    }

    const aliases = aliasesOf(row.name)
    if (aliases.length === 0) continue
    const category = categoryOf(row)
    const id = slug(row.name)
    if (!id || ids.has(id)) continue
    ids.add(id)
    entries.push({
      id,
      label: row.name,
      category,
      aliases,
      topic: options.topicFor(category),
      ...(row.docs || row.website ? { links: { website: row.website, docs: row.docs } } : {}),
    })
  }
  return { entries, folded }
}
