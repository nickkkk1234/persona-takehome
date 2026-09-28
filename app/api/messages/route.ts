import { after } from "next/server"
import { z } from "zod"
import { sendMessageBodySchema } from "@/types/schemas"
import { db } from "@/lib/db"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { replyToUser } from "@/helpers/api/agent/textAgent"
import { refreshHighlightIfStale } from "@/helpers/api/highlight"
import { parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { saveAgentTexts, toChatMessage } from "@/helpers/api/message"
import { requireSessionUserId } from "@/helpers/api/session"

export const GET = async (request: Request) => {
  try {
    const userId = await requireSessionUserId()
    const after = z.iso.datetime().safeParse(new URL(request.url).searchParams.get("after"))
    const messages = await db.message.findMany({
      where: { userId, ...(after.success ? { createdAt: { gt: new Date(after.data) } } : {}) },
      orderBy: { createdAt: "asc" },
    })
    return Response.json({ messages: messages.map(toChatMessage) })
  } catch (error) {
    return toErrorResponse(error)
  }
}

const saveHighlightAsText = async (userId: string) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { highlight: true } })
  return user?.highlight ? saveAgentTexts(userId, [user.highlight]) : []
}

export const POST = async (request: Request) => {
  try {
    const userId = await requireSessionUserId()
    const { content, callId, quoteHighlight, timezone } = await parseJsonBody(request, sendMessageBodySchema)
    const quotedHighlight = quoteHighlight ? await saveHighlightAsText(userId) : []
    const userMessage = content
      ? toChatMessage(
          await db.message.create({ data: { userId, role: MessageRole.USER, content, createdAt: new Date() } }),
        )
      : undefined
    const userMessages = [...quotedHighlight, ...(userMessage ? [userMessage] : [])]
    if (callId) {
      return Response.json({ messages: userMessages })
    }
    const replies = await replyToUser({ userId, timezone })
    after(() => refreshHighlightIfStale(userId))
    return Response.json({ messages: [...userMessages, ...replies] })
  } catch (error) {
    return toErrorResponse(error)
  }
}
