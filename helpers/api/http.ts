import "server-only"
import { z } from "zod"

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export const parseJsonBody = async <Schema extends z.ZodType>(request: Request, schema: Schema) => {
  const result = schema.safeParse(await request.json())
  if (!result.success) {
    throw new HttpError(`Invalid request: ${z.prettifyError(result.error)}`, 400)
  }
  return result.data
}

export const toErrorResponse = (error: unknown) => {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  console.error(error)
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 })
}
