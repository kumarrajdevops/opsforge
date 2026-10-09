export type Vec3 = readonly [number, number, number]

export type NodeShape = 'sphere' | 'box' | 'octahedron'

export interface VisualNode {
  id: string
  label: string
  position: Vec3
  color: string
  /** World-space radius. */
  size: number
  shape?: NodeShape
  /** Pulses while motion is allowed (an unhealthy node). Static scale otherwise. */
  pulse?: boolean
  /** Faded: not part of what is being explained right now. */
  muted?: boolean
  /** Normalised playback time (0..1) at which the node changes to `changedColor`. */
  changeAt?: number
  changedColor?: string
  changedPulse?: boolean
}

export interface VisualEdge {
  id: string
  from: string
  to: string
  color: string
  dashed?: boolean
  muted?: boolean
  /** Playback window (0..1) in which a marker travels from `from` to `to`. */
  flow?: { start: number; end: number; color: string; reverse?: boolean }
}

/** A flat slab that groups nodes (a region, a dependency layer). */
export interface VisualPlane {
  id: string
  label: string
  position: Vec3
  width: number
  depth: number
  color: string
}

export interface GraphModel {
  nodes: VisualNode[]
  edges: VisualEdge[]
  planes: VisualPlane[]
  cameraPosition: Vec3
  target: Vec3
}
