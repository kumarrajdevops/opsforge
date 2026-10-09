import { useEffect, useState, type RefObject } from 'react'

/** Whether the element is on screen. Assumes visible where IntersectionObserver is unavailable. */
export function useInView(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1]
        if (last) setInView(last.isIntersecting)
      },
      { rootMargin: '80px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return inView
}
