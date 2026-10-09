import Box from '@mui/material/Box'
import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

const EASE = [0.2, 0, 0, 1] as const

export interface PageTransitionProps {
  /** Changes when the route changes, e.g. the pathname. */
  routeKey: string
  children: ReactNode
}

/** Route-level entrance. Re-runs on every route change; static when reduced motion is preferred. */
export function PageTransition({ routeKey, children }: PageTransitionProps) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export interface StaggerProps {
  children: ReactNode
  /** Spacing units between items. */
  gap?: number
  /** Grid columns template; defaults to a single column. */
  columns?: Record<string, string> | string
  /** Seconds between items. */
  interval?: number
}

const container = (interval: number) => ({
  hidden: {},
  show: { transition: { staggerChildren: interval } },
})

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
}

/** Lays children out in a grid and reveals them one after another. */
export function Stagger({ children, gap = 2, columns = '1fr', interval = 0.05 }: StaggerProps) {
  const reduced = useReducedMotion()
  return (
    <Box sx={{ display: 'grid', gap, gridTemplateColumns: columns, minWidth: 0 }}>
      {reduced ? (
        children
      ) : (
        <motion.div
          style={{ display: 'contents' }}
          variants={container(interval)}
          initial="hidden"
          animate="show"
        >
          {children}
        </motion.div>
      )}
    </Box>
  )
}

/** A card inside `Stagger`. Renders a plain wrapper when reduced motion is preferred. */
export function StaggerItem({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  if (reduced) return <Box sx={{ minWidth: 0 }}>{children}</Box>
  return (
    <motion.div variants={item} style={{ minWidth: 0 }}>
      {children}
    </motion.div>
  )
}

export interface StateSwapProps {
  /** The current state. A change fades the new content in. */
  stateKey: string
  /** Wrap as an inline element (chips, badges) instead of a block. */
  inline?: boolean
  children: ReactNode
}

/** Fades the new state in when the key changes. Never delays content behind an exit animation; instant when reduced motion is preferred. */
export function StateSwap({ stateKey, inline = false, children }: StateSwapProps) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      key={stateKey}
      style={{ display: inline ? 'inline-flex' : 'block' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
