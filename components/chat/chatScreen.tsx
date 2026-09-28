"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { ChatMessage } from "@/types/chat"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { Icon } from "@/components/icon"
import { CallBar } from "@/components/chat/callBar"
import { CallScreen } from "@/components/chat/callScreen"
import { ChatHeader } from "@/components/chat/chatHeader"
import { Composer } from "@/components/chat/composer"
import { MessageList } from "@/components/chat/messageList"
import { ResetUserButton } from "@/components/chat/resetUserButton"
import { useCall } from "@/hooks/useCall"
import { useChatMessages } from "@/hooks/useChatMessages"

type ChatScreenProps = {
  initialMessages: ChatMessage[]
  agentName: string
  isGoogleConnected: boolean
}

export const ChatScreen = ({ initialMessages, agentName, isGoogleConnected }: ChatScreenProps) => {
  const router = useRouter()
  const refreshServerState = useCallback(() => router.refresh(), [router])
  const chat = useChatMessages(initialMessages, refreshServerState)
  const call = useCall({ onMessages: chat.addMessages, onToolCompleted: refreshServerState })
  const [isCallExpanded, setIsCallExpanded] = useState(false)

  const isOnCall = call.status === "active" && call.callId !== undefined
  const latestTextDuringCall = chat.messages.findLast(
    (message) =>
      message.role === MessageRole.AGENT &&
      call.connectedAt !== undefined &&
      Date.parse(message.createdAt) >= call.connectedAt,
  )

  const handleSend = (text: string) => {
    if (isOnCall) {
      call.sendText(text)
      chat.send(text, { callId: call.callId })
      return
    }
    chat.send(text)
  }

  return (
    <main className="flex h-dvh justify-center bg-page sm:items-center sm:py-(--space-9)">
      <Icon className="absolute top-(--space-12) left-(--space-12) hidden h-5 text-text-primary sm:block sm:h-5" />
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-surface sm:h-208 sm:max-h-full sm:max-w-md sm:rounded-4xl sm:border sm:border-hairline-warm sm:shadow-menu">
        <ChatHeader
          agentName={agentName}
          callStatus={call.status}
          onStartCall={call.start}
        />
        <div className="relative flex min-h-0 flex-1 flex-col">
          {isOnCall && !isCallExpanded && (
            <CallBar
              agentName={agentName}
              connectedAt={call.connectedAt}
              isMuted={call.isMuted}
              onExpand={() => setIsCallExpanded(true)}
              onToggleMute={call.toggleMute}
              onHangUp={call.hangUp}
            />
          )}
          <MessageList
            messages={chat.messages}
            isAwaitingReply={chat.isAwaitingReply || call.isWrappingUp}
            hasFailedReply={chat.hasFailedReply}
            isBelowCallBar={isOnCall && !isCallExpanded}
            isGoogleConnected={isGoogleConnected}
            onRetryReply={chat.retryReply}
          />
        </div>
        <Composer key={chat.unsentText} initialText={chat.unsentText} onSend={handleSend} />
        {isOnCall && isCallExpanded && (
          <CallScreen
            agentName={agentName}
            connectedAt={call.connectedAt}
            isMuted={call.isMuted}
            latestText={latestTextDuringCall}
            onMinimize={() => setIsCallExpanded(false)}
            onToggleMute={call.toggleMute}
            onHangUp={call.hangUp}
          />
        )}
      </div>
      <ResetUserButton className="fixed right-(--space-11) bottom-(--space-8) hidden sm:inline-flex" />
    </main>
  )
}
