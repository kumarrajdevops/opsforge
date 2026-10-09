import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export interface RevealProps {
  children: ReactNode
  /** Seconds. */
  delay?: number
}

/** Subtle entrance (fade + 6px rise). Renders instantly when the user prefers reduced motion. */
export function Reveal({ children, delay = 0 }: RevealProps) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  )
}
