import { z } from "zod"
import { listCallNotices } from "@/helpers/api/call"
import { HttpError, toErrorResponse } from "@/helpers/api/http"
import { requireSessionUserId } from "@/helpers/api/session"

export const GET = async (_request: Request, context: RouteContext<"/api/calls/[callId]/notices">) => {
  try {
    const userId = await requireSessionUserId()
    const callId = z.uuid().safeParse((await context.params).callId)
    if (!callId.success) {
      throw new HttpError("Call not found.", 404)
    }
    return Response.json({ notices: await listCallNotices(userId, callId.data) })
  } catch (error) {
    return toErrorResponse(error)
  }
}
