import "server-only"
import { z } from "zod"
import type { CallTranscriptEntry } from "@/types/chat"
import { fishSessionTokenSchema } from "@/types/schemas"
import { getEnvironment } from "@/helpers/api/environment"

const FISH_API_URL = "https://api.fish.audio/v1/agent"

// Fish session ids are "sess_" plus a UUID; that UUID doubles as our Call id.
const SESSION_ID_PREFIX = "sess_"

export const toFishSessionId = (callId: string) => `${SESSION_ID_PREFIX}${callId}`

export const toCallId = (sessionId: string) => {
  const callId = z.uuid().safeParse(sessionId.replace(SESSION_ID_PREFIX, ""))
  if (!callId.success) {
    throw new Error(`Unexpected Fish session id ${sessionId}.`)
  }
  return callId.data
}

const sessionSchema = z.object({
  status: z.enum(["pending", "active", "completed", "failed", "unknown"]),
  items: z
    .array(
      z.object({
        type: z.string(),
        role: z.string().optional(),
        content: z.unknown(),
        created_at: z.string().optional(),
      }),
    )
    .default([]),
})

const requestFish = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${FISH_API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${getEnvironment().FISH_API_KEY}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Fish request ${path} failed with ${response.status}: ${await response.text()}`)
  }
  return response
}

type SessionRequest = {
  userId: string
  timezone: string
  systemPrompt: string
  opening: { first_message: string } | { first_message_prompt: string }
}

export const createFishSession = async ({ userId, timezone, systemPrompt, opening }: SessionRequest) => {
  const response = await requestFish("/sessions", {
    method: "POST",
    body: JSON.stringify({
      agent_id: getEnvironment().FISH_AGENT_ID,
      end_user_id: userId,
      client_timezone: timezone,
      overrides: { system_prompt: systemPrompt, ...opening },
    }),
  })
  return fishSessionTokenSchema.parse(await response.json())
}

export const fetchFishSession = async (callId: string) => {
  const response = await requestFish(`/sessions/${toFishSessionId(callId)}`)
  const session = sessionSchema.parse(await response.json())
  const transcript = session.items.flatMap((item): CallTranscriptEntry[] =>
    item.type === "message" && (item.role === "user" || item.role === "assistant") && typeof item.content === "string"
      ? [
          {
            role: item.role === "user" ? "user" : "agent",
            content: item.content,
            createdAt: item.created_at ?? new Date().toISOString(),
          },
        ]
      : [],
  )
  return { isLive: session.status === "pending" || session.status === "active", transcript }
}

export const endFishSession = async (callId: string) => {
  await requestFish(`/sessions/${toFishSessionId(callId)}/end`, { method: "POST" })
}
