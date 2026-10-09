import { Html, Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import { CanvasShell } from '../../../visuals/CanvasShell'
import type { SceneRuntime } from '../../../visuals/runtime'
import type { NeuralCoreModel } from './model'

function FactorNode({
  node,
  runtime,
}: {
  node: NeuralCoreModel['nodes'][number]
  runtime: SceneRuntime
}) {
  const color = runtime.palette.tones[node.tone]
  return (
    <group position={[...node.position]}>
      <mesh>
        <sphereGeometry args={[node.targetRadius, 20, 14]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.28} />
      </mesh>
      <mesh>
        <sphereGeometry args={[node.radius, 24, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          metalness={0.05}
          transparent={!node.hasEvidence}
          opacity={node.hasEvidence ? 1 : 0.4}
        />
      </mesh>
      <Html center position={[0, node.targetRadius + 0.3, 0]} zIndexRange={[5, 0]}>
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
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
          {node.label}
          {node.score === null ? '' : ` ${Math.round(node.score)}`}
        </span>
      </Html>
    </group>
  )
}

function Core({ model, runtime }: { model: NeuralCoreModel; runtime: SceneRuntime }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!runtime.animate) return
    group.current?.scale.setScalar(1 + 0.025 * Math.sin(clock.elapsedTime * 1.6))
  })
  const color = runtime.palette.tones[model.core.tone]
  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[model.core.radius, 2]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} flatShading />
      </mesh>
      <Html center zIndexRange={[5, 0]}>
        <span
          aria-hidden
          style={{
            pointerEvents: 'none',
            fontSize: 18,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,.45)',
          }}
        >
          {model.core.score === null ? '—' : Math.round(model.core.score)}
        </span>
      </Html>
    </group>
  )
}

export default function NeuralCoreScene({
  model,
  runtime,
}: {
  model: NeuralCoreModel
  runtime: SceneRuntime
}) {
  return (
    <CanvasShell runtime={runtime} cameraPosition={[0, 1.4, 8.8]} continuous autoRotate>
      {model.nodes.map((node) => (
        <Line
          key={`spoke-${node.id}`}
          points={[[0, 0, 0], [...node.position]]}
          color={runtime.palette.muted}
          lineWidth={1}
          transparent
          opacity={0.15 + 0.5 * node.confidence}
        />
      ))}
      <Core model={model} runtime={runtime} />
      {model.nodes.map((node) => (
        <FactorNode key={node.id} node={node} runtime={runtime} />
      ))}
    </CanvasShell>
  )
}
