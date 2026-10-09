import type {
  ArchitectureRepository,
  EvidenceOrigin,
  EvidenceSourceStatus,
  IncidentRepository,
  InterviewRepository,
  ReadinessEvidence,
  ResumeRepository,
} from '@opsforge/types'
import { SCENARIOS } from '../architecture-studio/scenarios'
import { architectureRepository } from '../architecture-studio/repository'
import { scenarios as incidentScenarios } from '../incident-simulator/scenarios'
import { incidentRepository } from '../incident-simulator/repository'
import { interviewRepository } from '../interviewer/repository'
import { resumeRepository } from '../resume/repository'
import { architectureEvidence, type ArchitectureDesign } from './adapters/architecture'
import { drillEvidence } from './adapters/drills'
import { incidentEvidence, type IncidentRun } from './adapters/incidents'
import { interviewEvidence } from './adapters/interviews'
import { ORIGINS } from './config'

export interface EvidenceSource {
  origin: EvidenceOrigin
  /** Resolves to the module's evidence. Throwing marks the source unavailable, not the whole report. */
  load(): Promise<ReadinessEvidence[]>
}

export interface EvidenceRepositories {
  interviews: InterviewRepository
  resume: ResumeRepository
  incidents: IncidentRepository
  architecture: ArchitectureRepository
}

export function defaultRepositories(): EvidenceRepositories {
  return {
    interviews: interviewRepository,
    resume: resumeRepository,
    incidents: incidentRepository,
    architecture: architectureRepository,
  }
}

/** Modules that are not built yet. They return nothing; their evidence is never invented. */
const PENDING_ORIGINS: EvidenceOrigin[] = ['knowledge', 'question', 'flashcard', 'lab']

export function createSources(
  repos: EvidenceRepositories = defaultRepositories(),
): EvidenceSource[] {
  const live: EvidenceSource[] = [
    {
      origin: 'interview',
      load: async () => interviewEvidence(await repos.interviews.list()),
    },
    {
      origin: 'resume-drill',
      load: async () => drillEvidence(await repos.resume.load()),
    },
    {
      origin: 'incident',
      load: async () => {
        const runs: IncidentRun[] = []
        for (const scenario of incidentScenarios) {
          const session = await repos.incidents.load(scenario.id)
          if (session) runs.push({ scenario, session })
        }
        return incidentEvidence(runs)
      },
    },
    {
      origin: 'architecture',
      load: async () => {
        const designs: ArchitectureDesign[] = []
        for (const scenario of SCENARIOS) {
          const versions = await repos.architecture.listVersions(scenario.id)
          const latest = versions[0]
          if (latest) designs.push({ scenario, version: latest })
        }
        return architectureEvidence(designs)
      },
    },
  ]
  const pending: EvidenceSource[] = PENDING_ORIGINS.map((origin) => ({
    origin,
    load: async () => [],
  }))
  return [...live, ...pending]
}

export interface LoadedEvidence {
  evidence: ReadinessEvidence[]
  statuses: EvidenceSourceStatus[]
}

function noteFor(connected: boolean, count: number, failed: boolean): string {
  if (failed) return 'Could not read saved results. Nothing from this module is counted.'
  if (!connected) return 'Module not built yet. No evidence is counted or assumed.'
  if (count === 0) return 'Connected, no scored attempts yet.'
  return `${count} scored ${count === 1 ? 'observation' : 'observations'} counted.`
}

/** Loads every source independently so one failing module never blanks the report. */
export async function loadEvidence(
  sources: EvidenceSource[] = createSources(),
): Promise<LoadedEvidence> {
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        return { source, items: await source.load(), failed: false }
      } catch {
        return { source, items: [] as ReadinessEvidence[], failed: true }
      }
    }),
  )
  const statuses: EvidenceSourceStatus[] = results.map(({ source, items, failed }) => {
    const meta = ORIGINS[source.origin]
    return {
      origin: source.origin,
      label: meta.label,
      connected: meta.live && !failed,
      evidenceCount: items.length,
      note: noteFor(meta.live, items.length, failed),
    }
  })
  return { evidence: results.flatMap((r) => r.items), statuses }
}
