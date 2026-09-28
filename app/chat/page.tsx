import { after } from "next/server"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ChatScreen } from "@/components/chat/chatScreen"
import { DEFAULT_AGENT_NAME } from "@/helpers/api/agent/prompt"
import { finalizeAbandonedCalls } from "@/helpers/api/call"
import { toChatMessage } from "@/helpers/api/message"
import { getSessionUserId } from "@/helpers/api/session"

const ChatPage = async () => {
  const userId = await getSessionUserId()
  if (!userId) redirect("/")

  after(() => finalizeAbandonedCalls(userId, "UTC"))

  const [messages, user] = await Promise.all([
    db.message.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    db.user.findUnique({ where: { id: userId }, select: { agentName: true, _count: { select: { googleConnections: true } } } }),
  ])

  return (
    <ChatScreen
      initialMessages={messages.map(toChatMessage)}
      agentName={user?.agentName ?? DEFAULT_AGENT_NAME}
      isGoogleConnected={(user?._count.googleConnections ?? 0) > 0}
    />
  )
}

export default ChatPage
