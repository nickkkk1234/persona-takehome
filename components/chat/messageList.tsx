import type { ChatMessage } from "@/types/chat"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { cn } from "@/lib/utils"
import { GoogleConnectCard } from "@/components/chat/googleConnectCard"
import { DashboardCard } from "@/components/chat/dashboardCard"
import { splitCardLinks, splitLinks } from "@/helpers/client/message"
import { HOME_PATH, GOOGLE_CONNECT_PATH } from "@/helpers/util/routes"
import { useAutoScroll } from "@/hooks/useAutoScroll"

type MessageListProps = {
  messages: ChatMessage[]
  isAwaitingReply: boolean
  hasFailedReply: boolean
  isBelowCallBar: boolean
  isGoogleConnected: boolean
  onRetryReply: () => void
}

const MessageBubble = ({ message, content }: { message: ChatMessage; content: string }) => {
  const isUser = message.role === MessageRole.USER
  return (
    <p
      className={cn(
        "max-w-3/4 rounded-lg px-(--space-5) py-(--space-2) text-row leading-snug break-words whitespace-pre-wrap",
        isUser ? "bg-primary text-primary-foreground" : "bg-tile text-text-primary",
      )}
    >
      {splitLinks(content).map((part, index) =>
        part.isLink ? (
          <a key={index} href={part.text} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            {part.text}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  )
}

const MessageContent = ({ message, isGoogleConnected }: { message: ChatMessage; isGoogleConnected: boolean }) => {
  if (message.role === MessageRole.USER) return <MessageBubble message={message} content={message.content} />
  const { text, cardPaths } = splitCardLinks(message.content)
  if (cardPaths.length === 0) return <MessageBubble message={message} content={message.content} />
  return (
    <div className="flex w-full flex-col items-start gap-(--space-2)">
      {text.length > 0 && <MessageBubble message={message} content={text} />}
      {cardPaths.includes(GOOGLE_CONNECT_PATH) && <GoogleConnectCard isConnected={isGoogleConnected} />}
      {cardPaths.includes(HOME_PATH) && <DashboardCard />}
    </div>
  )
}

const TypingBubble = () => (
  <span className="flex gap-1 rounded-lg bg-tile px-(--space-5) py-(--space-4)" aria-label="Typing">
    {[0, 200, 400].map((delay) => (
      <span
        key={delay}
        className="size-2 animate-typing rounded-full bg-text-placeholder"
        style={{ animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
)

export const MessageList = ({
  messages,
  isAwaitingReply,
  hasFailedReply,
  isBelowCallBar,
  isGoogleConnected,
  onRetryReply,
}: MessageListProps) => {
  const lastMessage = messages.at(-1)
  const containerRef = useAutoScroll(
    `${messages.length}-${isAwaitingReply}-${hasFailedReply}`,
    lastMessage?.role === MessageRole.USER,
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 overflow-y-auto px-(--space-5) py-(--space-7) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        isBelowCallBar && "pt-20",
      )}
    >
      <ol className="flex flex-col">
        {messages.map((message, index) => {
          const isNewSpeaker = index > 0 && messages.at(index - 1)?.role !== message.role
          return (
            <li
              key={message.id}
              className={cn(
                "flex",
                message.role === MessageRole.USER ? "justify-end" : "justify-start",
                isNewSpeaker ? "mt-(--space-5)" : "mt-1",
              )}
            >
              <MessageContent message={message} isGoogleConnected={isGoogleConnected} />
            </li>
          )
        })}
        {isAwaitingReply && (
          <li className="mt-(--space-5) flex">
            <TypingBubble />
          </li>
        )}
      </ol>
      {hasFailedReply && (
        <button
          type="button"
          onClick={onRetryReply}
          className="cursor-pointer mt-(--space-2) w-full text-right text-meta text-text-alert"
        >
          Didn&apos;t get a reply. Tap to retry.
        </button>
      )}
    </div>
  )
}
