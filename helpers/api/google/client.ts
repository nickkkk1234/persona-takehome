import "server-only"
import type { z } from "zod"
import type { GoogleConnection } from "@/lib/generated/prisma/client"
import { decryptSecret } from "@/helpers/api/secret"
import { refreshGoogleAccessToken } from "@/helpers/api/google/oauth"

type GoogleConnectionCredentials = Pick<GoogleConnection, "id" | "email" | "refreshToken">

const accessTokens = new Map<string, { token: string; expiresAt: number }>()

const getAccessToken = async (connection: GoogleConnectionCredentials) => {
  const cached = accessTokens.get(connection.id)
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token
  const { access_token, expires_in } = await refreshGoogleAccessToken(decryptSecret(connection.refreshToken))
  accessTokens.set(connection.id, { token: access_token, expiresAt: Date.now() + expires_in * 1000 })
  return access_token
}

const MAX_ATTEMPTS = 4

const isRateLimited = async (response: Response) =>
  response.status === 429 ||
  (response.status === 403 && /rateLimitExceeded|userRateLimitExceeded/.test(await response.clone().text()))

const getRetryDelay = (response: Response, attempt: number) => {
  const retryAfterSeconds = Number(response.headers.get("Retry-After"))
  return Math.min(Math.max(1000 * 2 ** attempt, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 0), 30_000)
}

const requestWithRetry = async (connection: GoogleConnectionCredentials, url: string, attempt: number): Promise<Response> => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${await getAccessToken(connection)}` },
    signal: AbortSignal.timeout(20_000),
  })
  if (attempt + 1 < MAX_ATTEMPTS && (await isRateLimited(response))) {
    await new Promise((resolve) => setTimeout(resolve, getRetryDelay(response, attempt)))
    return requestWithRetry(connection, url, attempt + 1)
  }
  return response
}

export const fetchGoogleJson = async <Schema extends z.ZodType>(
  connection: GoogleConnectionCredentials,
  url: string,
  schema: Schema,
) => {
  const response = await requestWithRetry(connection, url, 0)
  if (response.status === 401 || response.status === 403) {
    accessTokens.delete(connection.id)
    throw new Error(`Google refused access for ${connection.email}. The user may need to reconnect this account.`)
  }
  if (!response.ok) {
    throw new Error(`Google request for ${connection.email} failed with ${response.status}.`)
  }
  return schema.parse(await response.json())
}
