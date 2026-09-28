import type { z } from "zod"
import { errorResponseSchema } from "@/types/schemas"

const readErrorMessage = async (response: Response) => {
  try {
    const parsed = errorResponseSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.error : `Request failed with ${response.status}.`
  } catch {
    return `Request failed with ${response.status}.`
  }
}

export const postJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return response
}

export const postAndParse = async <Schema extends z.ZodType>(url: string, body: unknown, schema: Schema) =>
  schema.parse(await (await postJson(url, body)).json())

export const getAndParse = async <Schema extends z.ZodType>(url: string, schema: Schema) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }
  return schema.parse(await response.json())
}
