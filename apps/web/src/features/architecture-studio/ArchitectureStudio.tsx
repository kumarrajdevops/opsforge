import Box from '@mui/material/Box'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import type { FailureScenario } from '@opsforge/types'
import { ConfirmDialog, SectionTabs, SideDrawer } from '@opsforge/ui'
import { useReactFlow } from '@xyflow/react'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArchitectureCanvas } from './components/ArchitectureCanvas'
import { ArchitectureViewsDrawer } from './components/ArchitectureViewsDrawer'
import { ComponentPalette } from './components/ComponentPalette'
import { EvaluationPanel } from './components/EvaluationPanel'
import { EdgeInspector, NodeInspector } from './components/Inspector'
import { RequirementsDrawer } from './components/RequirementsDrawer'
import { ReviewPanel } from './components/ReviewPanel'
import { SaveVersionDialog } from './components/SaveVersionDialog'
import { SimulationPanel } from './components/SimulationPanel'
import { StudioToolbar } from './components/StudioToolbar'
import { VersionHistoryDrawer } from './components/VersionHistoryDrawer'
import { getComponent } from './catalog'
import { SCENARIOS } from './scenarios'
import { useArchitectureEditor, type Selection } from './useArchitectureEditor'
import { useArchitectureReview } from './useArchitectureReview'
import type { Scenario } from '@opsforge/types'

type PanelTab = 'inspector' | 'evaluation' | 'review' | 'failure'

const PALETTE_WIDTH = 256
const PANEL_WIDTH = 372

export interface ArchitectureStudioProps {
  scenario: Scenario
  onScenarioChange: (id: string) => void
}

/** Container for the studio. Wires the editor and review hooks to presentational parts. Needs a ReactFlowProvider. */
export function ArchitectureStudio({ scenario, onScenarioChange }: ArchitectureStudioProps) {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('xl'))
  const editor = useArchitectureEditor(scenario)
  const review = useArchitectureReview(scenario, editor.document, editor.evaluation)
  const { screenToFlowPosition } = useReactFlow()

  const canvasRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<PanelTab>('evaluation')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [requirementsOpen, setRequirementsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const { document, evaluation, selection } = editor
  const selectedNode =
    selection?.kind === 'node' ? document.nodes.find((n) => n.id === selection.id) : undefined
  const selectedEdge =
    selection?.kind === 'edge' ? document.edges.find((e) => e.id === selection.id) : undefined
  const failingCount = evaluation.checks.filter((c) => c.status === 'fail').length

  const selectFromCanvas = useCallback(
    (next: Selection) => {
      editor.select(next)
      if (next) {
        setTab('inspector')
        if (!wide) setPanelOpen(true)
      }
    },
    [editor, wide],
  )

  const selectNodes = useCallback(
    (ids: string[]) => {
      const first = ids.find((id) => document.nodes.some((n) => n.id === id))
      if (first) editor.select({ kind: 'node', id: first })
    },
    [document.nodes, editor],
  )

  const addFromPalette = useCallback(
    (componentId: string) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      const center = rect
        ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        : { x: 0, y: 0 }
      const step = (document.nodes.length % 6) * 24
      editor.addComponent(componentId, { x: center.x - 98 + step, y: center.y - 38 + step })
      setTab('inspector')
      setPaletteOpen(false)
    },
    [document.nodes.length, editor, screenToFlowPosition],
  )

  function simulate(kind: FailureScenario['kind']) {
    if (kind === 'node-loss' || kind === 'dependency-slow') {
      if (!selectedNode) return
      editor.simulate({ kind, nodeId: selectedNode.id })
    } else {
      editor.simulate({ kind })
    }
    setTab('failure')
    if (!wide) setPanelOpen(true)
  }

  function openReview() {
    setTab('review')
    if (!wide) setPanelOpen(true)
  }

  async function save(note: string) {
    const result = await editor.saveVersion(note)
    setNotice(
      result.created
        ? `Saved version ${result.version.number}.`
        : `No changes since version ${result.version.number}; nothing new was saved.`,
    )
  }

  const inspector = useMemo<ReactNode>(() => {
    if (selectedNode) {
      const def = getComponent(selectedNode.componentId)
      if (!def) return null
      const checks = evaluation.checks.filter(
        (c) => c.status === 'fail' && c.nodeIds.includes(selectedNode.id),
      )
      return (
        <NodeInspector
          node={selectedNode}
          definition={def}
          checks={checks}
          monthlyUsd={evaluation.cost.byNode[selectedNode.id] ?? 0}
          onRename={(label) => editor.renameNode(selectedNode.id, label)}
          onChange={(patch) => editor.updateConfig(selectedNode.id, patch)}
          onDelete={() => editor.deleteNodes([selectedNode.id])}
        />
      )
    }
    if (selectedEdge) {
      const labelOf = (id: string) => document.nodes.find((n) => n.id === id)?.label ?? id
      const checks = evaluation.checks.filter(
        (c) =>
          c.status === 'fail' &&
          c.nodeIds.includes(selectedEdge.source) &&
          c.nodeIds.includes(selectedEdge.target),
      )
      return (
        <EdgeInspector
          edge={selectedEdge}
          sourceLabel={labelOf(selectedEdge.source)}
          targetLabel={labelOf(selectedEdge.target)}
          checks={checks}
          onChange={(patch) => editor.updateEdge(selectedEdge.id, patch)}
          onReverse={() => editor.reverseEdge(selectedEdge.id)}
          onDelete={() => editor.deleteEdges([selectedEdge.id])}
        />
      )
    }
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2">Nothing selected</Typography>
        <Typography variant="body2" color="text.secondary">
          Select a component or a connection on the canvas to edit it. Connect components by
          dragging from the right handle of one to the left handle of another.
        </Typography>
      </Box>
    )
  }, [selectedNode, selectedEdge, evaluation, document.nodes, editor])

  const sidePanel = (
    <SectionTabs
      label="Studio panels"
      value={tab}
      onChange={(id) => setTab(id as PanelTab)}
      items={[
        { id: 'inspector', label: 'Inspector', content: inspector },
        {
          id: 'evaluation',
          label: 'Evaluation',
          count: failingCount,
          content: (
            <EvaluationPanel
              evaluation={evaluation}
              monthlyBudgetUsd={scenario.workload.monthlyBudgetUsd}
              onSelectNodes={selectNodes}
            />
          ),
        },
        {
          id: 'review',
          label: 'Review',
          content: (
            <ReviewPanel
              review={review}
              nodeCount={document.nodes.length}
              onSelectNodes={selectNodes}
            />
          ),
        },
        {
          id: 'failure',
          label: 'Failure',
          content: (
            <SimulationPanel
              simulation={editor.simulation}
              scenario={scenario}
              document={document}
              onClear={editor.clearSimulation}
            />
          ),
        },
      ]}
    />
  )

  const palette = <ComponentPalette onAdd={addFromPalette} />

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: `calc(100dvh - ${theme.opsforge.layout.topBarHeight + 1}px)`,
        minHeight: 480,
      }}
    >
      <StudioToolbar
        scenarios={SCENARIOS}
        scenario={scenario}
        onScenarioChange={onScenarioChange}
        evaluation={evaluation}
        saveState={editor.saveState}
        versionNumber={editor.latestVersion?.number ?? null}
        selectedNodeLabel={selectedNode?.label ?? null}
        hasSimulation={editor.simulation !== null}
        hasComponents={document.nodes.length > 0}
        compact={!wide}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenPanel={() => setPanelOpen(true)}
        onRequirements={() => setRequirementsOpen(true)}
        onViews={() => setViewsOpen(true)}
        onSave={() => setSaveOpen(true)}
        onHistory={() => setHistoryOpen(true)}
        onReview={openReview}
        onReset={() => setResetOpen(true)}
        onSimulate={simulate}
        onClearSimulation={editor.clearSimulation}
      />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {wide && (
          <Box
            component="aside"
            aria-label="Component palette"
            sx={{
              width: PALETTE_WIDTH,
              flexShrink: 0,
              borderRight: `1px solid ${theme.palette.border.default}`,
              backgroundColor: theme.palette.background.paper,
              minHeight: 0,
            }}
          >
            {palette}
          </Box>
        )}

        <Box ref={canvasRef} sx={{ position: 'relative', flex: 1, minWidth: 0 }}>
          {editor.ready && (
            <ArchitectureCanvas
              document={document}
              evaluation={evaluation}
              simulation={editor.simulation}
              selection={selection}
              loadToken={editor.loadToken}
              onSelect={selectFromCanvas}
              onMoveNodes={(positions) => {
                for (const [id, position] of Object.entries(positions))
                  editor.moveNode(id, position)
              }}
              onConnect={editor.connectNodes}
              onDeleteNodes={editor.deleteNodes}
              onDeleteEdges={editor.deleteEdges}
              onDropComponent={editor.addComponent}
            />
          )}
          {editor.ready && document.nodes.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                pointerEvents: 'none',
                textAlign: 'center',
                px: 3,
              }}
            >
              <Box>
                <Typography variant="subtitle1">Start your design</Typography>
                <Typography variant="body2" color="text.secondary">
                  Drag a component from the palette, or click one to add it.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {wide && (
          <Box
            component="aside"
            aria-label="Inspector and evaluation"
            sx={{
              width: PANEL_WIDTH,
              flexShrink: 0,
              overflowY: 'auto',
              borderLeft: `1px solid ${theme.palette.border.default}`,
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {sidePanel}
          </Box>
        )}
      </Box>

      {!wide && (
        <>
          <SideDrawer
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            title="Components"
            anchor="left"
            width={320}
          >
            <Box sx={{ mx: -2.5, my: -2.5, height: '100dvh' }}>{palette}</Box>
          </SideDrawer>
          <SideDrawer
            open={panelOpen}
            onClose={() => setPanelOpen(false)}
            title="Studio"
            width={PANEL_WIDTH}
          >
            <Box sx={{ mx: -2.5, my: -2.5 }}>{sidePanel}</Box>
          </SideDrawer>
        </>
      )}

      <RequirementsDrawer
        open={requirementsOpen}
        onClose={() => setRequirementsOpen(false)}
        scenario={scenario}
        evaluation={evaluation}
      />
      <ArchitectureViewsDrawer
        open={viewsOpen}
        onClose={() => setViewsOpen(false)}
        document={document}
        simulation={editor.simulation}
      />
      <VersionHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        versions={editor.versions}
        currentHash={editor.saveState === 'saved' ? (editor.latestVersion?.contentHash ?? '') : ''}
        onRestore={(v) => {
          editor.restoreVersion(v)
          setNotice(`Restored version ${v.number}.`)
        }}
      />
      {saveOpen && <SaveVersionDialog open onClose={() => setSaveOpen(false)} onSave={save} />}
      <ConfirmDialog
        open={resetOpen}
        title="Reset design?"
        description="Replaces the canvas with the scenario's starter design. Saved versions are kept."
        confirmLabel="Reset"
        destructive
        onConfirm={() => {
          editor.resetToStarter()
          setResetOpen(false)
        }}
        onClose={() => setResetOpen(false)}
      />
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
