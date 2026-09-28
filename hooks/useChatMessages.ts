import { useCallback, useRef, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import type { ChatMessage } from "@/types/chat"
import { messagesResponseSchema } from "@/types/schemas"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { mergeMessages } from "@/helpers/client/message"
import { getAndParse, postAndParse } from "@/helpers/client/request"
import { getTimezone } from "@/helpers/client/timezone"

const MESSAGES_URL = "/api/messages"
const POLL_INTERVAL_MS = 3000

type SendOptions = { callId?: string }

const fetchMessages = async () => (await getAndParse(MESSAGES_URL, messagesResponseSchema)).messages

export const useChatMessages = (initialMessages: ChatMessage[], onServerStateChanged: () => void) => {
  const [isAwaitingReply, setIsAwaitingReply] = useState(false)
  const [hasFailedReply, setHasFailedReply] = useState(false)
  const [unsentText, setUnsentText] = useState<string>()
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const messageCountRef = useRef(initialMessages.length)

  const { data: messages = initialMessages, mutate } = useSWR(MESSAGES_URL, fetchMessages, {
    fallbackData: initialMessages,
    refreshInterval: POLL_INTERVAL_MS,
    onSuccess: (latest) => {
      if (latest.length > messageCountRef.current) onServerStateChanged()
      messageCountRef.current = latest.length
    },
  })

  const addMessages = useCallback(
    (incoming: ChatMessage[]) => mutate((current = []) => mergeMessages(current, incoming), { revalidate: false }),
    [mutate],
  )

  const postMessage = useCallback(async (content: string | undefined, { callId }: SendOptions) => {
    setIsAwaitingReply(!callId)
    setHasFailedReply(false)
    try {
      const { messages: incoming } = await postAndParse(
        MESSAGES_URL,
        { timezone: getTimezone(), ...(content ? { content } : {}), ...(callId ? { callId } : {}) },
        messagesResponseSchema,
      )
      return incoming
    } finally {
      setIsAwaitingReply(false)
    }
  }, [])

  const recoverFromFailedSend = useCallback(
    async (content: string | undefined) => {
      try {
        const latest = await mutate()
        const wasSaved = (latest ?? []).some(
          (message) => message.role === MessageRole.USER && message.content === content,
        )
        if (content && !wasSaved) {
          setUnsentText(content)
          toast.error("Your message didn't send. Check your connection and try again.")
          return
        }
      } catch (error) {
        console.warn("Could not check which messages were saved.", error)
      }
      setHasFailedReply(true)
    },
    [mutate],
  )

  const enqueue = useCallback(
    (content: string | undefined, options: SendOptions, pendingMessage: ChatMessage | undefined) => {
      const previous = queueRef.current
      const run = async () => {
        try {
          await mutate(
            async () => {
              await previous
              return postMessage(content, options)
            },
            {
              ...(pendingMessage
                ? { optimisticData: (_current, displayed = []) => [...displayed, pendingMessage] }
                : {}),
              populateCache: (incoming, current = []) =>
                mergeMessages(
                  current.filter((message) => message.id !== pendingMessage?.id),
                  incoming,
                ),
              rollbackOnError: true,
              revalidate: false,
            },
          )
          onServerStateChanged()
        } catch (error) {
          console.warn("Sending a message failed.", error)
          await recoverFromFailedSend(content)
        }
      }
      queueRef.current = run()
    },
    [mutate, onServerStateChanged, postMessage, recoverFromFailedSend],
  )

  const send = useCallback(
    (content: string, options: SendOptions = {}) => {
      setUnsentText(undefined)
      enqueue(content, options, {
        id: `pending-${crypto.randomUUID()}`,
        role: MessageRole.USER,
        content,
        createdAt: new Date().toISOString(),
      })
    },
    [enqueue],
  )

  const retryReply = useCallback(() => enqueue(undefined, {}, undefined), [enqueue])

  return { messages, isAwaitingReply, hasFailedReply, unsentText, send, retryReply, addMessages }
}
