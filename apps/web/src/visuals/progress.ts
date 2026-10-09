import { useSyncExternalStore } from 'react'

/** Playback position (0..1) that scenes read every frame and subscribe to for wake-ups. */
export class ProgressSource {
  value = 0
  private listeners = new Set<() => void>()

  set(value: number) {
    this.value = value
    for (const listener of this.listeners) listener()
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

/** React-facing view of a ProgressSource, rounded to 1% so a playing tween re-renders at most 100 times. */
export function useProgressValue(source: ProgressSource): number {
  return useSyncExternalStore(
    source.subscribe,
    () => Math.round(source.value * 100) / 100,
    () => 0,
  )
}
