import { useSyncExternalStore } from 'react'

let cached: boolean | undefined

/** True when the browser can create a WebGL context. Cached: probing allocates a context. */
export function detectWebGL(): boolean {
  if (cached !== undefined) return cached
  if (typeof window === 'undefined' || !('WebGLRenderingContext' in window)) {
    cached = false
    return cached
  }
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    cached = context !== null
    context?.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {
    cached = false
  }
  return cached
}

const subscribe = () => () => undefined

export function useWebGLSupport(): boolean {
  return useSyncExternalStore(subscribe, detectWebGL, () => false)
}

/** Coarse pointers (touch) keep native scrolling instead of orbiting the scene. */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const query = window.matchMedia('(pointer: coarse)')
      query.addEventListener('change', notify)
      return () => query.removeEventListener('change', notify)
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches,
    () => false,
  )
}
