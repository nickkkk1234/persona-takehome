import "server-only"
import { db } from "@/lib/db"
import { MemoryStatus } from "@/lib/generated/prisma/enums"
import { HttpError } from "@/helpers/api/http"

const RECENT_MESSAGE_LIMIT = 40
const RECENT_CALL_LIMIT = 3

export const loadAgentContext = async (userId: string) => {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memories: { orderBy: { createdAt: "asc" } },
      tasks: { orderBy: { time: "asc" } },
      googleConnections: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "desc" }, take: RECENT_MESSAGE_LIMIT },
      calls: { where: { endedAt: { not: null } }, orderBy: { startedAt: "desc" }, take: RECENT_CALL_LIMIT },
    },
  })
  if (!user) {
    throw new HttpError("User not found.", 404)
  }

  return {
    user,
    acceptedMemories: user.memories.filter((memory) => memory.status === MemoryStatus.ACCEPTED),
    rejectedMemories: user.memories.filter((memory) => memory.status === MemoryStatus.REJECTED),
    tasks: user.tasks,
    googleConnections: user.googleConnections,
    recentMessages: user.messages.toReversed(),
    recentCalls: user.calls.toReversed(),
  }
}
