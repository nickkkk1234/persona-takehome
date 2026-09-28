import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

export const useSendInitialDraft = (
  draft: string | undefined,
  send: (text: string, options: { quoteHighlight: boolean }) => void,
) => {
  const router = useRouter()
  const hasSentRef = useRef(false)

  useEffect(() => {
    if (!draft || hasSentRef.current) return
    hasSentRef.current = true
    send(draft, { quoteHighlight: true })
    router.replace("/chat")
  }, [draft, router, send])
}
