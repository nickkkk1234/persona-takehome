import { z } from "zod"
import { sendMessageBodySchema } from "@/types/schemas"
import { db } from "@/lib/db"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { replyToUser } from "@/helpers/api/agent/textAgent"
import { parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { toChatMessage } from "@/helpers/api/message"
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

export const POST = async (request: Request) => {
  try {
    const userId = await requireSessionUserId()
    const { content, callId, timezone } = await parseJsonBody(request, sendMessageBodySchema)
    const userMessage = content
      ? toChatMessage(await db.message.create({ data: { userId, role: MessageRole.USER, content } }))
      : undefined
    const userMessages = userMessage ? [userMessage] : []
    if (callId) {
      return Response.json({ messages: userMessages })
    }
    const replies = await replyToUser({ userId, timezone })
    return Response.json({ messages: [...userMessages, ...replies] })
  } catch (error) {
    return toErrorResponse(error)
  }
}
