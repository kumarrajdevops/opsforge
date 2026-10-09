import { useEffect, useState } from 'react'

/** False for the first paint, then true, so CSS transitions can animate from the empty state. */
export function useMountedFlag(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  return mounted
}
