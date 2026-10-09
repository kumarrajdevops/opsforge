import { useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProgressSource } from './progress'

export interface Cue {
  id: string
  label: string
  /** Normalised position, 0..1. */
  at: number
}

export interface PlaybackOptions {
  source: ProgressSource
  /** Real seconds the full replay takes. The timing is illustrative, not measured. */
  durationSeconds: number
  /** Start at the end state (true) or at the beginning (false). Ignored when motion is allowed and autoplay is on. */
  startAtEnd?: boolean
}

export interface Playback {
  playing: boolean
  /** Whether the timeline can run. False under reduced motion: only stepping and scrubbing remain. */
  canPlay: boolean
  play: () => void
  pause: () => void
  restart: () => void
  seek: (position: number) => void
}

type Timeline = {
  play: () => void
  pause: () => void
  progress: (p?: number, suppress?: boolean) => unknown
  restart: () => void
  kill: () => void
}

/**
 * Drives a ProgressSource with a GSAP timeline. GSAP is imported on first use, so it stays out
 * of the main bundle, and it is only ever created when motion is allowed. Scrubbing, stepping
 * and the end state work without it, which is what reduced-motion users get.
 */
export function usePlayback({
  source,
  durationSeconds,
  startAtEnd = false,
}: PlaybackOptions): Playback {
  const reduced = Boolean(useReducedMotion())
  const timeline = useRef<Timeline | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    source.set(reduced || startAtEnd ? 1 : 0)
    if (reduced) return
    let cancelled = false
    let revert: (() => void) | undefined
    void import('gsap').then(({ gsap }) => {
      if (cancelled) return
      const ctx = gsap.context(() => {
        const proxy = { p: source.value }
        const tl = gsap.timeline({ paused: true, onComplete: () => setPlaying(false) })
        tl.to(proxy, {
          p: 1,
          duration: durationSeconds,
          ease: 'none',
          onUpdate: () => source.set(proxy.p),
        })
        timeline.current = {
          play: () => tl.play(),
          pause: () => tl.pause(),
          restart: () => tl.restart(),
          progress: (p, suppress) => {
            proxy.p = p ?? proxy.p
            return tl.progress(p ?? tl.progress(), suppress)
          },
          kill: () => tl.kill(),
        }
      })
      revert = () => ctx.revert()
    })
    return () => {
      cancelled = true
      revert?.()
      timeline.current = null
    }
  }, [source, durationSeconds, reduced, startAtEnd])

  const play = useCallback(() => {
    const tl = timeline.current
    if (!tl) return
    if (source.value >= 1) tl.restart()
    else tl.play()
    setPlaying(true)
  }, [source])

  const pause = useCallback(() => {
    timeline.current?.pause()
    setPlaying(false)
  }, [])

  const restart = useCallback(() => {
    const tl = timeline.current
    if (!tl) {
      source.set(0)
      return
    }
    tl.restart()
    setPlaying(true)
  }, [source])

  const seek = useCallback(
    (position: number) => {
      const clamped = Math.min(Math.max(position, 0), 1)
      timeline.current?.pause()
      timeline.current?.progress(clamped, true)
      source.set(clamped)
      setPlaying(false)
    },
    [source],
  )

  return { playing, canPlay: !reduced, play, pause, restart, seek }
}

/** The cue the playhead is currently at or past. */
export function currentCue(cues: readonly Cue[], position: number): Cue | undefined {
  let found: Cue | undefined
  for (const cue of cues) if (cue.at <= position + 1e-6) found = cue
  return found
}
