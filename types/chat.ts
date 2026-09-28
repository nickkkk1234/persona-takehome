import type { z } from "zod"
import type { loadAgentContext } from "@/helpers/api/agent/context"
import type { TOOL_DEFINITIONS } from "@/helpers/util/toolDefinitions"
import type {
  callTranscriptEntrySchema,
  chatMessageSchema,
  startCallResponseSchema,
} from "@/types/schemas"

export type ChatMessage = z.infer<typeof chatMessageSchema>

export type CallTranscriptEntry = z.infer<typeof callTranscriptEntrySchema>

export type StartCallResponse = z.infer<typeof startCallResponseSchema>

export type ToolName = keyof typeof TOOL_DEFINITIONS

export type ToolChannel = "text" | "call"

export type CallStatus = "idle" | "connecting" | "active"

export type AgentContext = Awaited<ReturnType<typeof loadAgentContext>>
