import { AdaptiveDpr, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, type ReactNode } from 'react'
import type { Vec3 } from './graphTypes'
import type { SceneRuntime } from './runtime'

export interface CanvasShellProps {
  runtime: SceneRuntime
  cameraPosition: Vec3
  target?: Vec3
  /** The scene has its own continuous motion (pulses, orbit). Otherwise frames render on demand. */
  continuous?: boolean
  autoRotate?: boolean
  children: ReactNode
}

function Wake({ runtime }: { runtime: SceneRuntime }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    invalidate()
  }, [invalidate, runtime.visible, runtime.animate, runtime.interactive, runtime.palette])
  return null
}

/**
 * The one place that configures a Canvas for OPSFORGE: transparent background, capped pixel
 * ratio, no scroll hijacking (zoom and pan are off), and a render loop that only runs when
 * something is visible and moving. Everything else renders on demand.
 */
export function CanvasShell({
  runtime,
  cameraPosition,
  target = [0, 0, 0],
  continuous = false,
  autoRotate = false,
  children,
}: CanvasShellProps) {
  const frameloop = !runtime.visible ? 'never' : runtime.animate && continuous ? 'always' : 'demand'
  return (
    <Canvas
      frameloop={frameloop}
      dpr={[1, 1.5]}
      camera={{ position: [...cameraPosition], fov: 38, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[5, 7, 6]} intensity={1.5} />
      <directionalLight position={[-5, -3, -4]} intensity={0.35} />
      {children}
      <OrbitControls
        makeDefault
        enabled={runtime.interactive}
        enableZoom={false}
        enablePan={false}
        enableDamping={runtime.animate}
        dampingFactor={0.08}
        autoRotate={runtime.animate && autoRotate}
        autoRotateSpeed={0.7}
        target={[...target]}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI - 0.55}
      />
      <AdaptiveDpr />
      <Wake runtime={runtime} />
    </Canvas>
  )
}
