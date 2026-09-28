import { z } from "zod"
import { MessageRole } from "@/lib/generated/prisma/enums"

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(MessageRole),
  content: z.string(),
  createdAt: z.string(),
})

export const messagesResponseSchema = z.object({
  messages: z.array(chatMessageSchema),
})

export const sendMessageBodySchema = z.object({
  content: z.string().trim().min(1).max(4000).optional(),
  callId: z.uuid().optional(),
  timezone: z.string().min(1).max(64),
})

export const callTranscriptEntrySchema = z.object({
  role: z.enum(["user", "agent", "notice"]),
  content: z.string(),
  createdAt: z.string(),
  fallbackTexts: z.array(z.string()).optional(),
})

export const appendTranscriptBodySchema = z.object({
  role: z.enum(["user", "agent"]),
  content: z.string(),
})

export const callNoticesResponseSchema = z.object({
  notices: z.array(callTranscriptEntrySchema.pick({ content: true, createdAt: true })),
})

export const timezoneBodySchema = z.object({
  timezone: z.string().min(1).max(64),
})

export const fishSessionTokenSchema = z.object({
  session_id: z.string(),
  expires_at: z.string(),
  max_duration_seconds: z.number(),
  transport: z.literal("livekit"),
  livekit_url: z.string(),
  token: z.string(),
})

export const startCallResponseSchema = z.object({
  callId: z.uuid(),
  sessionToken: fishSessionTokenSchema,
})

export const toolCallBodySchema = z.object({
  callId: z.uuid(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
})

export const toolCallResponseSchema = z.object({
  result: z.unknown(),
  message: chatMessageSchema.optional(),
})

export const errorResponseSchema = z.object({
  error: z.string(),
})
