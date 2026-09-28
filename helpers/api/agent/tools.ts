import "server-only"
import { z } from "zod"
import type { ChatMessage, ToolChannel, ToolName } from "@/types/chat"
import type { GoogleConnection } from "@/lib/generated/prisma/client"
import { db } from "@/lib/db"
import { MemoryEvidence, MemoryStatus } from "@/lib/generated/prisma/enums"
import { CALL_TOOL_NAMES, TEXT_TOOL_NAMES, TOOL_DEFINITIONS } from "@/helpers/util/toolDefinitions"
import { loadAgentContext } from "@/helpers/api/agent/context"
import { getGoogleConnectUrl, getNextOnboardingStep } from "@/helpers/api/agent/prompt"
import { isDurableMemory, saveMemories } from "@/helpers/api/memory"
import { saveAgentTexts } from "@/helpers/api/message"
import { searchContacts, searchDrive, searchEmail, listCalendarEvents } from "@/helpers/api/google/workspace"
import { GOOGLE_CONNECT_PATH } from "@/helpers/util/routes"
import { sortWeekdays } from "@/helpers/util/weekday"

type ToolRequest = { userId: string; name: string; rawArguments: unknown; channel: ToolChannel }

type ToolOutcome = { result: unknown; message?: ChatMessage }

const failure = (error: string): ToolOutcome => ({ result: { isError: true, error } })

const getAllowedToolNames = (channel: ToolChannel): readonly ToolName[] => {
  switch (channel) {
    case "text":
      return TEXT_TOOL_NAMES
    case "call":
      return CALL_TOOL_NAMES
    default: {
      const _absurd: never = channel
      return _absurd
    }
  }
}

const findAllowedToolName = (name: string, channel: ToolChannel) =>
  getAllowedToolNames(channel).find((allowedName) => allowedName === name)

const readAllGoogleAccounts = async <Item,>(
  userId: string,
  read: (connection: GoogleConnection) => Promise<Item[]>,
) => {
  const connections = await db.googleConnection.findMany({ where: { userId } })
  if (connections.length === 0) {
    return failure(`Google isn't connected yet. They can connect it here: ${getGoogleConnectUrl()}`)
  }
  const settled = await Promise.allSettled(connections.map(read))
  const results = settled.flatMap((outcome) => (outcome.status === "fulfilled" ? outcome.value : []))
  const errors = settled.flatMap((outcome) =>
    outcome.status === "rejected" ? [outcome.reason instanceof Error ? outcome.reason.message : "Unknown error."] : [],
  )
  if (results.length === 0 && errors.length > 0) return failure(errors.join(" "))
  return { result: { results, ...(errors.length > 0 ? { errors } : {}) } }
}

const describeNextSetupStep = async (userId: string, channel: ToolChannel) => {
  const nextStep = getNextOnboardingStep(await loadAgentContext(userId), channel)
  return nextStep ? { nextSetupStep: `Do this in the same reply: ${nextStep.instruction}` } : {}
}

const runTool = async (userId: string, name: ToolName, rawArguments: unknown, channel: ToolChannel): Promise<ToolOutcome> => {
  switch (name) {
    case "update_profile": {
      const input = TOOL_DEFINITIONS.update_profile.input.parse(rawArguments)
      const user = await db.user.update({
        where: { id: userId },
        data: { userName: input.user_name, agentName: input.agent_name, email: input.email },
      })
      return {
        result: {
          userName: user.userName,
          agentName: user.agentName,
          email: user.email,
          ...(await describeNextSetupStep(userId, channel)),
        },
      }
    }
    case "save_memory": {
      const input = TOOL_DEFINITIONS.save_memory.input.parse(rawArguments)
      if (!isDurableMemory(input.content)) {
        return failure("Not saved: names, setup status and vague plans don't belong in memory. Use update_profile for names.")
      }
      const [memory] = await saveMemories(userId, [
        { kind: input.kind, content: input.content, evidence: channel === "call" ? MemoryEvidence.CALL : MemoryEvidence.CHAT },
      ])
      const nextSetupStep = await describeNextSetupStep(userId, channel)
      return {
        result: memory ? { memoryId: memory.id, saved: memory.content, ...nextSetupStep } : { note: "Already remembered.", ...nextSetupStep },
      }
    }
    case "reject_memory": {
      const input = TOOL_DEFINITIONS.reject_memory.input.parse(rawArguments)
      const { count } = await db.memory.updateMany({
        where: { id: input.memory_id, userId },
        data: { status: MemoryStatus.REJECTED },
      })
      return count === 0 ? failure("No memory with that id.") : { result: { forgotten: true } }
    }
    case "create_task": {
      const input = TOOL_DEFINITIONS.create_task.input.parse(rawArguments)
      const task = await db.task.create({
        data: {
          userId,
          title: input.title,
          time: input.time,
          date: input.date,
          days: input.date ? [] : sortWeekdays(input.days ?? []),
          details: input.details,
        },
      })
      return { result: { taskId: task.id } }
    }
    case "update_task": {
      const input = TOOL_DEFINITIONS.update_task.input.parse(rawArguments)
      const { count } = await db.task.updateMany({
        where: { id: input.task_id, userId },
        data: {
          title: input.title,
          time: input.time,
          details: input.details,
          ...(input.date ? { date: input.date, days: [] } : {}),
          ...(input.days ? { date: null, days: sortWeekdays(input.days) } : {}),
        },
      })
      return count === 0 ? failure("No task with that id.") : { result: { updated: true } }
    }
    case "delete_task": {
      const input = TOOL_DEFINITIONS.delete_task.input.parse(rawArguments)
      const { count } = await db.task.deleteMany({ where: { id: input.task_id, userId } })
      return count === 0 ? failure("No task with that id.") : { result: { deleted: true } }
    }
    case "search_email": {
      const input = TOOL_DEFINITIONS.search_email.input.parse(rawArguments)
      return readAllGoogleAccounts(userId, (connection) => searchEmail(connection, input.query, input.max_results ?? 10))
    }
    case "list_calendar_events": {
      const input = TOOL_DEFINITIONS.list_calendar_events.input.parse(rawArguments)
      const now = new Date()
      const until = new Date(now.getTime() + (input.days_ahead ?? 7) * 24 * 60 * 60 * 1000)
      return readAllGoogleAccounts(userId, (connection) => listCalendarEvents(connection, now, until))
    }
    case "search_drive": {
      const input = TOOL_DEFINITIONS.search_drive.input.parse(rawArguments)
      return readAllGoogleAccounts(userId, (connection) => searchDrive(connection, input.query))
    }
    case "search_contacts": {
      const input = TOOL_DEFINITIONS.search_contacts.input.parse(rawArguments)
      return readAllGoogleAccounts(userId, (connection) => searchContacts(connection, input.query))
    }
    case "complete_request": {
      const input = TOOL_DEFINITIONS.complete_request.input.parse(rawArguments)
      return { result: { status: "confirmed", request: input.request, ...(input.when ? { when: input.when } : {}) } }
    }
    case "send_text": {
      const input = TOOL_DEFINITIONS.send_text.input.parse(rawArguments)
      const content = input.content.includes(GOOGLE_CONNECT_PATH) ? getGoogleConnectUrl() : input.content
      const [message] = await saveAgentTexts(userId, [content])
      return { result: { sent: true }, ...(message ? { message } : {}) }
    }
    default: {
      const _absurd: never = name
      return _absurd
    }
  }
}

export const executeTool = async ({ userId, name, rawArguments, channel }: ToolRequest) => {
  const toolName = findAllowedToolName(name, channel)
  if (!toolName) {
    return failure(`There is no ${name} tool here.`)
  }
  try {
    return await runTool(userId, toolName, rawArguments, channel)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return failure(`Invalid arguments: ${z.prettifyError(error)}`)
    }
    console.error(`Tool ${toolName} failed.`, error)
    return failure(error instanceof Error ? error.message : "The tool failed.")
  }
}
