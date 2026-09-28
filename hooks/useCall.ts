import { useCallback, useEffect, useRef, useState } from "react"
import { AgentSession, type ClientToolHandler, type SessionToken } from "@fishaudio/agent-client"
import { toast } from "sonner"
import type { CallStatus, ChatMessage } from "@/types/chat"
import {
  callNoticesResponseSchema,
  messagesResponseSchema,
  startCallResponseSchema,
  toolCallResponseSchema,
} from "@/types/schemas"
import { CALL_TOOL_NAMES } from "@/helpers/util/toolDefinitions"
import { getAndParse, postAndParse, postJson } from "@/helpers/client/request"
import { describeCallStartError, frameCallNotice } from "@/helpers/client/call"
import { getTimezone } from "@/helpers/client/timezone"

const NOTICE_POLL_INTERVAL_MS = 3000

type CallOptions = {
  onMessages: (messages: ChatMessage[]) => void
  onToolCompleted: () => void
}

const requestCall = async () => {
  try {
    return await postAndParse("/api/calls", { timezone: getTimezone() }, startCallResponseSchema)
  } catch (error) {
    console.warn("Could not create the call.", error)
    return
  }
}

export const useCall = ({ onMessages, onToolCompleted }: CallOptions) => {
  const [status, setStatus] = useState<CallStatus>("idle")
  const [isMuted, setIsMuted] = useState(false)
  const [callId, setCallId] = useState<string>()
  const [connectedAt, setConnectedAt] = useState<number>()
  const [isWrappingUp, setIsWrappingUp] = useState(false)
  const sessionRef = useRef<AgentSession>(undefined)
  const deliveredNoticesRef = useRef(new Set<string>())

  const resetCall = useCallback(() => {
    sessionRef.current = undefined
    setCallId(undefined)
    setStatus("idle")
    setIsMuted(false)
    setConnectedAt(undefined)
  }, [])

  const finalizeCall = useCallback(
    async (endedCallId: string) => {
      setIsWrappingUp(true)
      try {
        const { messages } = await postAndParse(
          `/api/calls/${endedCallId}/end`,
          { timezone: getTimezone() },
          messagesResponseSchema,
        )
        onMessages(messages)
      } catch (error) {
        console.warn("Could not wrap up the call; it will be finished when the chat reloads.", error)
      } finally {
        setIsWrappingUp(false)
      }
    },
    [onMessages],
  )

  const buildClientTools = useCallback(
    (activeCallId: string) =>
      Object.fromEntries(
        CALL_TOOL_NAMES.map((name): [string, ClientToolHandler] => [
          name,
          async (parameters) => {
            const { result, message } = await postAndParse(
              "/api/tools",
              { callId: activeCallId, name, arguments: parameters },
              toolCallResponseSchema,
            )
            if (message) onMessages([message])
            onToolCompleted()
            return result
          },
        ]),
      ),
    [onMessages, onToolCompleted],
  )

  const saveTranscriptEntry = useCallback(async (activeCallId: string, role: "user" | "agent", content: string) => {
    try {
      await postJson(`/api/calls/${activeCallId}/transcript`, { role, content })
    } catch (error) {
      console.warn("Could not save a transcript line; Fish still has it.", error)
    }
  }, [])

  const connectSession = useCallback(
    (activeCallId: string, sessionToken: SessionToken) =>
      AgentSession.start({
        sessionToken,
        clientTools: buildClientTools(activeCallId),
        callbacks: {
          onMessage: ({ role, text }) => saveTranscriptEntry(activeCallId, role, text),
          onDisconnect: async ({ reason }) => {
            resetCall()
            if (reason === "connection_lost") {
              toast.error("The call dropped. I'll pick things up here in the chat.")
            }
            await finalizeCall(activeCallId)
          },
        },
      }),
    [buildClientTools, finalizeCall, resetCall, saveTranscriptEntry],
  )

  const start = useCallback(async () => {
    if (status !== "idle") return
    setStatus("connecting")
    const startResult = await requestCall()
    if (!startResult) {
      resetCall()
      toast.error(describeCallStartError(undefined))
      return
    }
    setCallId(startResult.callId)
    try {
      sessionRef.current = await connectSession(startResult.callId, startResult.sessionToken)
      setStatus("active")
      setConnectedAt(Date.now())
    } catch (error) {
      console.warn("Could not connect the call.", error)
      resetCall()
      toast.error(describeCallStartError(error))
      await finalizeCall(startResult.callId)
    }
  }, [connectSession, finalizeCall, resetCall, status])

  const hangUp = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    try {
      await session.end()
    } catch (error) {
      console.warn("Hanging up failed; ending the call locally.", error)
      const endedCallId = callId
      resetCall()
      if (endedCallId) await finalizeCall(endedCallId)
    }
  }, [callId, finalizeCall, resetCall])

  const toggleMute = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    try {
      await session.setMicMuted(!isMuted)
      setIsMuted(!isMuted)
    } catch (error) {
      console.warn("Could not change the microphone.", error)
      toast.error("Couldn't change the microphone. Try again.")
    }
  }, [isMuted])

  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendUserMessage(text, { audio: true })
  }, [])

  useEffect(() => {
    if (status !== "active" || !callId) return
    const deliverNotices = async () => {
      const session = sessionRef.current
      if (!session) return
      try {
        const { notices } = await getAndParse(`/api/calls/${callId}/notices`, callNoticesResponseSchema)
        notices
          .filter((notice) => !deliveredNoticesRef.current.has(notice.createdAt))
          .forEach((notice) => {
            deliveredNoticesRef.current.add(notice.createdAt)
            session.sendUserMessage(frameCallNotice(notice.content), { audio: true })
          })
      } catch (error) {
        console.warn("Could not check for call updates.", error)
      }
    }
    const interval = window.setInterval(deliverNotices, NOTICE_POLL_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [callId, status])

  useEffect(
    () => () => {
      const session = sessionRef.current
      if (!session) return
      const endSession = async () => {
        try {
          await session.end()
        } catch (error) {
          console.warn("Could not end the call while leaving the chat.", error)
        }
      }
      endSession()
    },
    [],
  )

  useEffect(() => {
    if (!callId) return
    const endOnClose = () => {
      const body = new Blob([JSON.stringify({ timezone: getTimezone() })], { type: "application/json" })
      navigator.sendBeacon(`/api/calls/${callId}/end`, body)
    }
    window.addEventListener("pagehide", endOnClose)
    return () => window.removeEventListener("pagehide", endOnClose)
  }, [callId])

  return { status, isMuted, isWrappingUp, callId, connectedAt, start, hangUp, toggleMute, sendText }
}
