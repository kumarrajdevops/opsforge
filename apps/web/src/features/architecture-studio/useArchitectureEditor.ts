import type {
  ArchitectureDocument,
  ArchitectureEdge,
  ArchitectureEvaluation,
  ArchitectureEvaluator,
  ArchitectureRepository,
  ArchitectureVersion,
  ComponentConfig,
  FailureScenario,
  Scenario,
  SaveVersionResult,
  SimulationResult,
} from '@opsforge/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addNode,
  connect,
  moveNode,
  removeEdges,
  removeNodes,
  renameNode,
  reverseEdge,
  semanticKey,
  updateEdge,
  updateNodeConfig,
} from './documentOps'
import { deterministicEvaluator } from './evaluator'
import { architectureRepository } from './repository'
import { starterDocument } from './scenarios'
import { simulateFailure } from './simulation'
import { contentHash, summarize } from './versioning'

export type Selection = { kind: 'node'; id: string } | { kind: 'edge'; id: string } | null
export type SaveState = 'unsaved' | 'dirty' | 'saved'

const AUTOSAVE_MS = 400

export interface ArchitectureEditor {
  ready: boolean
  scenario: Scenario
  document: ArchitectureDocument
  evaluation: ArchitectureEvaluation
  selection: Selection
  select: (selection: Selection) => void
  /** Increments whenever the whole document is replaced (load, restore, reset); canvases refit on it. */
  loadToken: number

  addComponent: (componentId: string, position: { x: number; y: number }) => string | null
  moveNode: (nodeId: string, position: { x: number; y: number }) => void
  connectNodes: (source: string, target: string) => void
  deleteNodes: (ids: string[]) => void
  deleteEdges: (ids: string[]) => void
  renameNode: (nodeId: string, label: string) => void
  updateConfig: (nodeId: string, patch: Partial<ComponentConfig>) => void
  updateEdge: (
    edgeId: string,
    patch: Partial<Pick<ArchitectureEdge, 'kind' | 'encrypted' | 'label'>>,
  ) => void
  reverseEdge: (edgeId: string) => void
  resetToStarter: () => void

  versions: ArchitectureVersion[]
  saveState: SaveState
  latestVersion: ArchitectureVersion | null
  saveVersion: (note: string) => Promise<SaveVersionResult>
  restoreVersion: (version: ArchitectureVersion) => void

  simulation: SimulationResult | null
  simulate: (failure: FailureScenario) => void
  clearSimulation: () => void
}

export function useArchitectureEditor(
  scenario: Scenario,
  repository: ArchitectureRepository = architectureRepository,
  evaluator: ArchitectureEvaluator = deterministicEvaluator,
): ArchitectureEditor {
  const [document, setDocument] = useState<ArchitectureDocument | null>(null)
  const [versions, setVersions] = useState<ArchitectureVersion[]>([])
  const [selection, setSelection] = useState<Selection>(null)
  const [loadToken, setLoadToken] = useState(0)
  const [simState, setSimState] = useState<{ key: string; result: SimulationResult } | null>(null)

  // Initial load. The page remounts this hook per scenario (key={scenario.id}).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [draft, stored] = await Promise.all([
        repository.loadDraft(scenario.id),
        repository.listVersions(scenario.id),
      ])
      if (cancelled) return
      setDocument(draft ?? starterDocument(scenario.id))
      setVersions(stored)
      setLoadToken((t) => t + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [repository, scenario.id])

  // Debounced draft autosave, flushed on unmount.
  const pending = useRef<ArchitectureDocument | null>(null)
  useEffect(() => {
    if (!document) return
    pending.current = document
    const timer = window.setTimeout(() => {
      if (pending.current) void repository.saveDraft(scenario.id, pending.current)
      pending.current = null
    }, AUTOSAVE_MS)
    return () => window.clearTimeout(timer)
  }, [document, repository, scenario.id])
  useEffect(
    () => () => {
      if (pending.current) void repository.saveDraft(scenario.id, pending.current)
    },
    [repository, scenario.id],
  )

  const fallback = useMemo(() => starterDocument(scenario.id), [scenario.id])
  const current = document ?? fallback
  const key = useMemo(() => semanticKey(current), [current])

  // Evaluation only depends on semantic content, so dragging a node never re-runs the checks.
  const evaluation = useMemo(
    () => evaluator.evaluate({ scenario, document: current }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands in for `current`
    [evaluator, scenario, key],
  )

  const edit = useCallback((fn: (doc: ArchitectureDocument) => ArchitectureDocument) => {
    setDocument((doc) => (doc ? fn(doc) : doc))
  }, [])

  const addComponent = useCallback(
    (componentId: string, position: { x: number; y: number }) => {
      if (!document) return null
      const { document: next, nodeId } = addNode(document, componentId, position)
      if (nodeId) {
        setDocument(next)
        setSelection({ kind: 'node', id: nodeId })
      }
      return nodeId
    },
    [document],
  )

  const connectNodes = useCallback(
    (source: string, target: string) => {
      if (!document) return
      const { document: next, edgeId } = connect(document, source, target)
      if (edgeId) {
        setDocument(next)
        setSelection({ kind: 'edge', id: edgeId })
      }
    },
    [document],
  )

  const deleteNodes = useCallback(
    (ids: string[]) => {
      edit((doc) => removeNodes(doc, ids))
      setSelection((s) => (s?.kind === 'node' && ids.includes(s.id) ? null : s))
    },
    [edit],
  )

  const deleteEdges = useCallback(
    (ids: string[]) => {
      edit((doc) => removeEdges(doc, ids))
      setSelection((s) => (s?.kind === 'edge' && ids.includes(s.id) ? null : s))
    },
    [edit],
  )

  const replaceDocument = useCallback((next: ArchitectureDocument) => {
    setDocument(next)
    setSelection(null)
    setLoadToken((t) => t + 1)
  }, [])

  const latestVersion = versions[0] ?? null
  const hash = useMemo(() => contentHash(current), [current])
  const saveState: SaveState = !latestVersion
    ? 'unsaved'
    : latestVersion.contentHash === hash
      ? 'saved'
      : 'dirty'

  const saveVersion = useCallback(
    async (note: string) => {
      const result = await repository.saveVersion(scenario.id, {
        document: current,
        note,
        summary: summarize(evaluation),
      })
      setVersions(await repository.listVersions(scenario.id))
      return result
    },
    [repository, scenario.id, current, evaluation],
  )

  const simulate = useCallback(
    (failure: FailureScenario) => {
      setSimState({ key, result: simulateFailure(scenario, current, failure) })
    },
    [scenario, current, key],
  )

  return {
    ready: document !== null,
    scenario,
    document: current,
    evaluation,
    selection,
    select: setSelection,
    loadToken,
    addComponent,
    moveNode: useCallback((id, position) => edit((doc) => moveNode(doc, id, position)), [edit]),
    connectNodes,
    deleteNodes,
    deleteEdges,
    renameNode: useCallback((id, label) => edit((doc) => renameNode(doc, id, label)), [edit]),
    updateConfig: useCallback(
      (id, patch) => edit((doc) => updateNodeConfig(doc, id, patch)),
      [edit],
    ),
    updateEdge: useCallback((id, patch) => edit((doc) => updateEdge(doc, id, patch)), [edit]),
    reverseEdge: useCallback((id) => edit((doc) => reverseEdge(doc, id)), [edit]),
    resetToStarter: useCallback(
      () => replaceDocument(starterDocument(scenario.id)),
      [replaceDocument, scenario.id],
    ),
    versions,
    saveState,
    latestVersion,
    saveVersion,
    restoreVersion: useCallback(
      (version: ArchitectureVersion) => replaceDocument(version.document),
      [replaceDocument],
    ),
    simulation: simState && simState.key === key ? simState.result : null,
    simulate,
    clearSimulation: useCallback(() => setSimState(null), []),
  }
}
