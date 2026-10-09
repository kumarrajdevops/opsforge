import { Html, Line } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  Color,
  MathUtils,
  Quaternion,
  Vector3,
  type Group,
  type MeshStandardMaterial,
} from 'three'
import { CanvasShell } from './CanvasShell'
import type { GraphModel, VisualEdge, VisualNode, VisualPlane } from './graphTypes'
import type { ProgressSource } from './progress'
import type { SceneRuntime } from './runtime'

const UP = new Vector3(0, 1, 0)

function Label({
  text,
  runtime,
  muted = false,
  dy = 0,
}: {
  text: string
  runtime: SceneRuntime
  muted?: boolean
  dy?: number
}) {
  return (
    <Html
      center
      position={[0, dy, 0]}
      zIndexRange={[5, 0]}
      style={{ pointerEvents: 'none', opacity: muted ? 0.45 : 1 }}
    >
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.2,
          padding: '2px 6px',
          borderRadius: 4,
          color: runtime.palette.text,
          background: runtime.palette.surface,
          border: `1px solid ${runtime.palette.border}`,
        }}
      >
        {text}
      </span>
    </Html>
  )
}

function NodeMesh({
  node,
  runtime,
  progress,
}: {
  node: VisualNode
  runtime: SceneRuntime
  progress?: ProgressSource
}) {
  const group = useRef<Group>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const base = useMemo(() => new Color(node.color), [node.color])
  const changed = useMemo(
    () => (node.changedColor ? new Color(node.changedColor) : null),
    [node.changedColor],
  )
  const moves = Boolean(node.pulse) || node.changeAt !== undefined

  useFrame(({ clock }) => {
    if (!moves) return
    const p = progress?.value ?? 1
    const hasChanged = node.changeAt !== undefined && changed !== null && p >= node.changeAt
    material.current?.color.copy(hasChanged ? changed : base)
    const pulsing = hasChanged ? node.changedPulse : node.pulse
    const scale = pulsing && runtime.animate ? 1 + 0.14 * Math.sin(clock.elapsedTime * 4) : 1
    group.current?.scale.setScalar(scale)
  })

  const opacity = node.muted ? 0.35 : 1
  return (
    <group ref={group} position={[...node.position]}>
      <mesh>
        {node.shape === 'box' ? (
          <boxGeometry args={[node.size * 1.5, node.size * 1.5, node.size * 1.5]} />
        ) : node.shape === 'octahedron' ? (
          <octahedronGeometry args={[node.size * 1.2, 0]} />
        ) : (
          <sphereGeometry args={[node.size, 24, 16]} />
        )}
        <meshStandardMaterial
          ref={material}
          color={node.color}
          roughness={0.55}
          metalness={0.05}
          transparent={node.muted}
          opacity={opacity}
        />
      </mesh>
      <Label text={node.label} runtime={runtime} muted={node.muted} dy={node.size + 0.38} />
    </group>
  )
}

function EdgeLine({
  edge,
  from,
  to,
  progress,
}: {
  edge: VisualEdge
  from: VisualNode
  to: VisualNode
  progress?: ProgressSource
}) {
  const marker = useRef<Group>(null)
  const a = useMemo(() => new Vector3(...from.position), [from.position])
  const b = useMemo(() => new Vector3(...to.position), [to.position])
  const arrow = useMemo(() => {
    const direction = b.clone().sub(a)
    const length = direction.length()
    if (length === 0) return null
    direction.normalize()
    const position = b.clone().sub(direction.clone().multiplyScalar(to.size + 0.28))
    const quaternion = new Quaternion().setFromUnitVectors(UP, direction)
    return { position, quaternion }
  }, [a, b, to.size])

  useFrame(() => {
    const flow = edge.flow
    const group = marker.current
    if (!flow || !group) return
    const p = progress?.value ?? 0
    const t = (p - flow.start) / Math.max(flow.end - flow.start, 1e-6)
    group.visible = t > 0 && t < 1
    if (group.visible)
      group.position.lerpVectors(
        flow.reverse ? b : a,
        flow.reverse ? a : b,
        MathUtils.clamp(t, 0, 1),
      )
  })

  const opacity = edge.muted ? 0.3 : 0.9
  return (
    <>
      <Line
        points={[a, b]}
        color={edge.color}
        lineWidth={1.4}
        dashed={edge.dashed}
        dashSize={0.18}
        gapSize={0.12}
        transparent
        opacity={opacity}
      />
      {arrow && (
        <mesh position={arrow.position} quaternion={arrow.quaternion}>
          <coneGeometry args={[0.07, 0.2, 10]} />
          <meshStandardMaterial color={edge.color} transparent opacity={opacity} />
        </mesh>
      )}
      {edge.flow && (
        <group ref={marker} visible={false}>
          <mesh>
            <sphereGeometry args={[0.1, 12, 8]} />
            <meshBasicMaterial color={edge.flow.color} />
          </mesh>
        </group>
      )}
    </>
  )
}

function PlaneSlab({ plane, runtime }: { plane: VisualPlane; runtime: SceneRuntime }) {
  const outline = useMemo(
    () => new BoxGeometry(plane.width, 0.03, plane.depth),
    [plane.width, plane.depth],
  )
  useEffect(() => () => outline.dispose(), [outline])
  return (
    <group position={[...plane.position]}>
      <mesh>
        <boxGeometry args={[plane.width, 0.03, plane.depth]} />
        <meshStandardMaterial color={plane.color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[outline]} />
        <lineBasicMaterial color={plane.color} transparent opacity={0.45} />
      </lineSegments>
      <group position={[-plane.width / 2, 0, plane.depth / 2]}>
        <Label text={plane.label} runtime={runtime} dy={0.18} />
      </group>
    </group>
  )
}

function Wake({ progress }: { progress?: ProgressSource }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => progress?.subscribe(invalidate), [progress, invalidate])
  return null
}

export interface GraphSceneProps {
  model: GraphModel
  runtime: SceneRuntime
  progress?: ProgressSource
}

/**
 * Shared scene for every graph-shaped visual: topology, dependency depth, service health and
 * incident propagation. The model arrives fully computed (positions, colours, change times);
 * this component only draws it.
 */
export default function GraphScene({ model, runtime, progress }: GraphSceneProps) {
  const byId = useMemo(() => new Map(model.nodes.map((n) => [n.id, n])), [model.nodes])
  const continuous = model.nodes.some((n) => n.pulse || n.changedPulse)
  return (
    <CanvasShell
      runtime={runtime}
      cameraPosition={model.cameraPosition}
      target={model.target}
      continuous={continuous}
    >
      <Wake progress={progress} />
      {model.planes.map((plane) => (
        <PlaneSlab key={plane.id} plane={plane} runtime={runtime} />
      ))}
      {model.edges.map((edge) => {
        const from = byId.get(edge.from)
        const to = byId.get(edge.to)
        return from && to ? (
          <EdgeLine key={edge.id} edge={edge} from={from} to={to} progress={progress} />
        ) : null
      })}
      {model.nodes.map((node) => (
        <NodeMesh key={node.id} node={node} runtime={runtime} progress={progress} />
      ))}
    </CanvasShell>
  )
}
