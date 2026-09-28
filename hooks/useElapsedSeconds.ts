import { useEffect, useState } from "react"

export const useElapsedSeconds = (startedAt: number | undefined) => {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === undefined) return
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [startedAt])

  return startedAt === undefined ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}
