import type { ElementType } from 'react'

/**
 * Router-agnostic link description. The UI package never imports a router: the app passes
 * its link component (e.g. react-router's NavLink) and a destination.
 */
export interface LinkTarget {
  /** Client-side route, rendered through `LinkComponent`. */
  to?: string
  /** Plain external or document link. */
  href?: string
  LinkComponent?: ElementType
}

export function linkProps({ to, href, LinkComponent }: LinkTarget): Record<string, unknown> {
  if (LinkComponent && to) return { component: LinkComponent, to }
  if (href) return { component: 'a', href }
  if (to) return { component: 'a', href: to }
  return {}
}
