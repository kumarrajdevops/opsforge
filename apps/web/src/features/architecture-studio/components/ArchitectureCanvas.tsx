import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import type {
  ArchitectureDocument,
  ArchitectureEvaluation,
  ConnectionKind,
  SimulationResult,
} from '@opsforge/types'
import { toneColors, useColorMode, type Tone } from '@opsforge/ui'
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useRef, useState, type DragEvent } from 'react'
import {
  toFlowEdges,
  toFlowNodes,
  type ComponentFlowNode,
  type ConnectionFlowEdge,
} from '../canvasModel'
import { edgeDash, providerTone } from '../presentation'
import type { Selection } from '../useArchitectureEditor'
import { ComponentNode } from './ComponentNode'

export const PALETTE_DRAG_TYPE = 'application/opsforge-component'

const nodeTypes = { component: ComponentNode }

const kindTone: Record<ConnectionKind, Tone> = {
  traffic: 'primary',
  data: 'info',
  async: 'ai',
  telemetry: 'neutral',
  deploy: 'warning',
}

export interface ArchitectureCanvasProps {
  document: ArchitectureDocument
  evaluation: ArchitectureEvaluation
  simulation: SimulationResult | null
  selection: Selection
  /** Changes when the whole document is replaced, so the view refits. */
  loadToken: number
  onSelect: (selection: Selection) => void
  onMoveNodes: (positions: Record<string, { x: number; y: number }>) => void
  onConnect: (source: string, target: string) => void
  onDeleteNodes: (ids: string[]) => void
  onDeleteEdges: (ids: string[]) => void
  onDropComponent: (componentId: string, position: { x: number; y: number }) => void
}

/** React Flow adapter. All decisions live in the editor; this only translates events. */
export function ArchitectureCanvas({
  document,
  evaluation,
  simulation,
  selection,
  loadToken,
  onSelect,
  onMoveNodes,
  onConnect,
  onDeleteNodes,
  onDeleteEdges,
  onDropComponent,
}: ArchitectureCanvasProps) {
  const theme = useTheme()
  const { resolved } = useColorMode()
  const { screenToFlowPosition } = useReactFlow()

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({})
  const dragRef = useRef<Record<string, { x: number; y: number }>>({})

  const nodes = useMemo(
    () => toFlowNodes(document, evaluation, simulation, selection, { positions, measured }),
    [document, evaluation, simulation, selection, positions, measured],
  )

  const edges = useMemo<ConnectionFlowEdge[]>(
    () =>
      toFlowEdges(document, selection).map((edge) => {
        const kind = edge.data?.kind ?? 'traffic'
        const tone: Tone = edge.data?.plaintext ? 'error' : kindTone[kind]
        const color = toneColors(theme, tone).solid
        return {
          ...edge,
          style: {
            stroke: color,
            strokeWidth: edge.selected ? 2.75 : 1.75,
            strokeDasharray: edgeDash[kind],
          },
          markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
          labelStyle: { fill: toneColors(theme, tone).fg, fontSize: 11, fontWeight: 600 },
          labelBgStyle: { fill: theme.palette.background.paper },
          labelBgPadding: [4, 2] as [number, number],
        }
      }),
    [document, selection, theme],
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<ComponentFlowNode>[]) => {
      const commit: Record<string, { x: number; y: number }> = {}
      for (const change of changes) {
        if (change.type === 'dimensions' && change.dimensions) {
          const { width, height } = change.dimensions
          setMeasured((prev) => {
            const old = prev[change.id]
            return old && old.width === width && old.height === height
              ? prev
              : { ...prev, [change.id]: { width, height } }
          })
        } else if (change.type === 'position') {
          if (change.dragging) {
            if (change.position) dragRef.current[change.id] = change.position
          } else {
            const final = change.position ?? dragRef.current[change.id]
            if (final) commit[change.id] = final
            delete dragRef.current[change.id]
          }
        }
      }
      setPositions({ ...dragRef.current })
      if (Object.keys(commit).length > 0) onMoveNodes(commit)
    },
    [onMoveNodes],
  )

  const handleConnect = useCallback(
    (connection: Connection) => onConnect(connection.source, connection.target),
    [onConnect],
  )

  const handleDragOver = useCallback((event: DragEvent) => {
    if (event.dataTransfer.types.includes(PALETTE_DRAG_TYPE)) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent) => {
      const componentId = event.dataTransfer.getData(PALETTE_DRAG_TYPE)
      if (!componentId) return
      event.preventDefault()
      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      onDropComponent(componentId, { x: point.x - 98, y: point.y - 38 })
    },
    [onDropComponent, screenToFlowPosition],
  )

  const border = theme.palette.border
  return (
    <Box
      role="region"
      aria-label="Architecture canvas"
      sx={{
        position: 'absolute',
        inset: 0,
        '--xy-background-color': theme.palette.background.sunken,
        '--xy-controls-button-background-color': theme.palette.background.paper,
        '--xy-controls-button-background-color-hover': theme.palette.action.hover,
        '--xy-controls-button-color': theme.palette.text.primary,
        '--xy-controls-button-border-color': border.default,
        '--xy-minimap-background-color': theme.palette.background.paper,
        '--xy-minimap-mask-background-color': 'rgba(120, 130, 150, 0.14)',
        '--xy-edge-label-background-color': theme.palette.background.paper,
        '--xy-attribution-background-color': 'transparent',
        '& .react-flow__attribution': { opacity: 0.6, fontSize: 10 },
        '& .react-flow__controls': {
          boxShadow: theme.shadows[1],
          border: `1px solid ${border.default}`,
          borderRadius: `${theme.opsforge.radius.md}px`,
          overflow: 'hidden',
        },
        '& .react-flow__minimap': {
          border: `1px solid ${border.default}`,
          borderRadius: `${theme.opsforge.radius.md}px`,
          overflow: 'hidden',
        },
        '& .react-flow__edge.selected .react-flow__edge-path': { filter: 'none' },
      }}
    >
      <ReactFlow<ComponentFlowNode, ConnectionFlowEdge>
        key={loadToken}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolved}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onNodeClick={(_, node) => onSelect({ kind: 'node', id: node.id })}
        onEdgeClick={(_, edge) => onSelect({ kind: 'edge', id: edge.id })}
        onPaneClick={() => onSelect(null)}
        onNodesDelete={(deleted) => onDeleteNodes(deleted.map((n) => n.id))}
        onEdgesDelete={(deleted) => onDeleteEdges(deleted.map((e) => e.id))}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.75}
        snapToGrid
        snapGrid={[12, 12]}
        zoomOnDoubleClick={false}
        panOnScroll={false}
      >
        <Background
          variant={BackgroundVariant.Lines}
          gap={24}
          lineWidth={1}
          color={border.subtle}
        />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          ariaLabel="Architecture minimap"
          nodeStrokeWidth={2}
          nodeColor={(node) => {
            const data = node.data as ComponentFlowNode['data']
            if (data.impact === 'down') return toneColors(theme, 'error').solid
            if (data.impact === 'degraded') return toneColors(theme, 'warning').solid
            return toneColors(theme, providerTone[data.provider]).solid
          }}
        />
      </ReactFlow>
    </Box>
  )
}
