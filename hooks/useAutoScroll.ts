import { useEffect, useRef } from "react"

const NEAR_BOTTOM_PX = 120

export const useAutoScroll = (contentKey: unknown, shouldForceScroll: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateNearBottom = () => {
      isNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < NEAR_BOTTOM_PX
    }
    container.addEventListener("scroll", updateNearBottom, { passive: true })
    return () => container.removeEventListener("scroll", updateNearBottom)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !(isNearBottomRef.current || shouldForceScroll)) return
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
  }, [contentKey, shouldForceScroll])

  return containerRef
}
