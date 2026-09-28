import { after } from "next/server"
import { z } from "zod"
import { timezoneBodySchema } from "@/types/schemas"
import { finalizeCall } from "@/helpers/api/call"
import { refreshHighlightSafely } from "@/helpers/api/highlight"
import { HttpError, parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { requireSessionUserId } from "@/helpers/api/session"

export const POST = async (request: Request, context: RouteContext<"/api/calls/[callId]/end">) => {
  try {
    const userId = await requireSessionUserId()
    const callId = z.uuid().safeParse((await context.params).callId)
    if (!callId.success) {
      throw new HttpError("Call not found.", 404)
    }
    const { timezone } = await parseJsonBody(request, timezoneBodySchema)
    const messages = await finalizeCall({ userId, callId: callId.data, timezone })
    after(() => refreshHighlightSafely(userId))
    return Response.json({ messages })
  } catch (error) {
    return toErrorResponse(error)
  }
}
