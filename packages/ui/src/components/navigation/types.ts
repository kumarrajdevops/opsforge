import type { ReactNode } from 'react'

export interface NavItem {
  id: string
  label: string
  /** Route path. */
  to: string
  icon?: ReactNode
  /** Short trailing marker, e.g. a count or "Soon". */
  badge?: string | number
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}
