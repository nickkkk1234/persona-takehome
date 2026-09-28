import { z } from "zod"
import { appendTranscriptBodySchema } from "@/types/schemas"
import { appendCallTranscript } from "@/helpers/api/call"
import { HttpError, parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { requireSessionUserId } from "@/helpers/api/session"

export const POST = async (request: Request, context: RouteContext<"/api/calls/[callId]/transcript">) => {
  try {
    const userId = await requireSessionUserId()
    const callId = z.uuid().safeParse((await context.params).callId)
    if (!callId.success) {
      throw new HttpError("Call not found.", 404)
    }
    const entry = await parseJsonBody(request, appendTranscriptBodySchema)
    await appendCallTranscript(userId, callId.data, entry)
    return new Response(null, { status: 204 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
