import { timezoneBodySchema } from "@/types/schemas"
import { startCall } from "@/helpers/api/call"
import { parseJsonBody, toErrorResponse } from "@/helpers/api/http"
import { requireSessionUserId } from "@/helpers/api/session"

export const POST = async (request: Request) => {
  try {
    const userId = await requireSessionUserId()
    const { timezone } = await parseJsonBody(request, timezoneBodySchema)
    return Response.json(await startCall(userId, timezone))
  } catch (error) {
    return toErrorResponse(error)
  }
}
