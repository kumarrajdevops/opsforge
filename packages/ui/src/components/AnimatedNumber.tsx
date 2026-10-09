import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect } from 'react'

export interface AnimatedNumberProps {
  value: number
  /** Formats the in-flight value. Defaults to a rounded integer. */
  format?: (value: number) => string
  /** Seconds. */
  duration?: number
}

const roundFormat = (value: number) => String(Math.round(value))

/**
 * Counts from the previous value to the new one. Renders the final value immediately when the
 * user prefers reduced motion. The rendered text is a real text node, so it is selectable and
 * readable by assistive technology once it settles.
 */
export function AnimatedNumber({
  value,
  format = roundFormat,
  duration = 0.6,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion()
  const motionValue = useMotionValue(reduced ? value : 0)
  const text = useTransform(motionValue, format)

  useEffect(() => {
    if (reduced) {
      motionValue.set(value)
      return undefined
    }
    const controls = animate(motionValue, value, { duration, ease: [0.2, 0, 0, 1] })
    return () => controls.stop()
  }, [value, reduced, duration, motionValue])

  return <motion.span>{text}</motion.span>
}
