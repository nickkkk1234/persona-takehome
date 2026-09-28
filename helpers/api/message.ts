import "server-only"
import type { Message } from "@/lib/generated/prisma/client"
import type { ChatMessage } from "@/types/chat"
import { db } from "@/lib/db"
import { MessageRole } from "@/lib/generated/prisma/enums"

export const toChatMessage = (message: Message): ChatMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
})

export const splitIntoTexts = (content: string) =>
  content
    .split(/\n\s*\n/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)

export const removeDashes = (text: string) => text.replace(/\s*—\s*/g, ", ").replaceAll("–", "-")

export const saveAgentTexts = async (userId: string, texts: string[]) => {
  const now = Date.now()
  const messages = await db.$transaction(
    texts.map((content, index) =>
      db.message.create({
        data: { userId, role: MessageRole.AGENT, content: removeDashes(content), createdAt: new Date(now + index) },
      }),
    ),
  )
  return messages.map(toChatMessage)
}
