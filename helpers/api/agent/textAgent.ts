import "server-only"
import { z } from "zod"
import type {
  FunctionTool,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
  ResponseOutputMessage,
  ResponseReasoningItem,
} from "openai/resources/responses/responses"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { isPresent } from "@/lib/utils"
import { loadAgentContext } from "@/helpers/api/agent/context"
import { buildTextInstructions } from "@/helpers/api/agent/prompt"
import { TEXT_TOOL_NAMES, TOOL_DEFINITIONS } from "@/helpers/util/toolDefinitions"
import { executeTool } from "@/helpers/api/agent/tools"
import { HttpError } from "@/helpers/api/http"
import { saveAgentTexts, splitIntoTexts } from "@/helpers/api/message"
import { getOpenAI, TEXT_MODEL, REASONING_EFFORT } from "@/helpers/api/openai"

const MAX_TOOL_ROUNDS = 6

const TEXT_TOOLS: FunctionTool[] = TEXT_TOOL_NAMES.map((name) => ({
  type: "function",
  name,
  description: TOOL_DEFINITIONS[name].description,
  parameters: z.toJSONSchema(TOOL_DEFINITIONS[name].input, { io: "input" }),
  strict: false,
}))

const isReplayable = (
  item: ResponseOutputItem,
): item is ResponseReasoningItem | ResponseOutputMessage | ResponseFunctionToolCall =>
  item.type === "reasoning" || item.type === "message" || item.type === "function_call"

const isFunctionCall = (item: ResponseOutputItem): item is ResponseFunctionToolCall => item.type === "function_call"

const parseToolArguments = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return { unparseableArguments: text }
  }
}

type TextReplyRequest = {
  userId: string
  timezone: string
  note?: string
  canStaySilent?: boolean
}

const SILENT_REPLY = "NO_REPLY"

export const replyToUser = async ({ userId, timezone, note, canStaySilent = false }: TextReplyRequest) => {
  const context = await loadAgentContext(userId)
  const instructions = [
    buildTextInstructions(context, timezone),
    note ? `## Right now\n${note}` : undefined,
    canStaySilent ? `If there's nothing worth texting, reply with exactly ${SILENT_REPLY}.` : undefined,
  ]
    .filter(isPresent)
    .join("\n\n")
  const history: ResponseInputItem[] = context.recentMessages.map((message) =>
    message.role === MessageRole.USER
      ? { role: "user", content: message.content }
      : { role: "assistant", content: message.content },
  )

  const runRound = async (input: ResponseInputItem[], round: number): Promise<string> => {
    const response = await getOpenAI().responses.create({
      model: TEXT_MODEL,
      instructions,
      input,
      tools: TEXT_TOOLS,
      tool_choice: round < MAX_TOOL_ROUNDS ? "auto" : "none",
      reasoning: { effort: REASONING_EFFORT },
      store: false,
      include: ["reasoning.encrypted_content"],
    })
    const functionCalls = response.output.filter(isFunctionCall)
    if (functionCalls.length === 0) return response.output_text

    const toolOutputs = await Promise.all(
      functionCalls.map(async (call): Promise<ResponseInputItem> => {
        const { result } = await executeTool({
          userId,
          name: call.name,
          rawArguments: parseToolArguments(call.arguments),
          channel: "text",
        })
        return { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) }
      }),
    )
    return runRound([...input, ...response.output.filter(isReplayable), ...toolOutputs], round + 1)
  }

  const reply = await runRound(history, 0)
  if (canStaySilent && reply.trim() === SILENT_REPLY) return []
  const texts = splitIntoTexts(reply)
  if (texts.length === 0) {
    throw new HttpError("Persona didn't come up with a reply. Try again.", 502)
  }
  return saveAgentTexts(userId, texts)
}
