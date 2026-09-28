import { toolCallBodySchema } from "@/types/schemas"
import { db } from "@/lib/db"
import { executeTool } from "@/helpers/api/agent/tools"
import { HttpError, parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { requireSessionUserId } from "@/helpers/api/session"

export const POST = async (request: Request) => {
  try {
    const userId = await requireSessionUserId()
    const { callId, name, arguments: rawArguments } = await parseJsonBody(request, toolCallBodySchema)
    const call = await db.call.findFirst({ where: { id: callId, userId, endedAt: null }, select: { id: true } })
    if (!call) {
      throw new HttpError("That call has already ended.", 409)
    }
    return Response.json(await executeTool({ userId, name, rawArguments, channel: "call" }))
  } catch (error) {
    return toErrorResponse(error)
  }
}
