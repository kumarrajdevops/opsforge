import { useEffect, useState } from 'react'
import { connectionFromReadiness, fetchReadiness, type ApiConnection } from './apiHealth'

const POLL_MS = 30_000

export function useApiConnection(): ApiConnection {
  const [connection, setConnection] = useState<ApiConnection>('checking')

  useEffect(() => {
    const controller = new AbortController()
    async function check() {
      try {
        setConnection(connectionFromReadiness(await fetchReadiness(controller.signal)))
      } catch {
        if (!controller.signal.aborted) setConnection('offline')
      }
    }
    void check()
    const timer = setInterval(() => void check(), POLL_MS)
    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  return connection
}
