import type { ScenePalette } from './palette'

/** What a scene may do right now. Scenes render this; they never decide it. */
export interface SceneRuntime {
  /** Continuous motion allowed: not reduced-motion, not paused by the user, on screen. */
  animate: boolean
  /** The scene is on screen. When false the render loop is stopped. */
  visible: boolean
  /** Pointer orbit is enabled (off on touch devices so the page keeps scrolling). */
  interactive: boolean
  palette: ScenePalette
}
