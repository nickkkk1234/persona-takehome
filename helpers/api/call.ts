import "server-only"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import type { CallTranscriptEntry } from "@/types/chat"
import { callTranscriptEntrySchema } from "@/types/schemas"
import { db } from "@/lib/db"
import { MemoryEvidence, MemoryKind, Weekday } from "@/lib/generated/prisma/enums"
import { loadAgentContext } from "@/helpers/api/agent/context"
import { buildCallOpening, buildCallSystemPrompt, getDashboardUrl } from "@/helpers/api/agent/prompt"
import { replyToUser } from "@/helpers/api/agent/textAgent"
import { executeTool } from "@/helpers/api/agent/tools"
import { createFishSession, endFishSession, fetchFishSession, toCallId } from "@/helpers/api/fish"
import { HttpError } from "@/helpers/api/http"
import { saveMemories } from "@/helpers/api/memory"
import { saveAgentTexts } from "@/helpers/api/message"
import { getOpenAI, REASONING_EFFORT, TEXT_MODEL } from "@/helpers/api/openai"
import { formatTaskSchedule } from "@/helpers/util/weekday"

const callSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      "Three to six sentences: what was discussed, what they want help with, anything you promised, short-term plans like \"they'll connect Gmail later\", and exactly where the conversation stopped if it ended mid-topic.",
    ),
  userName: z.string().nullable().describe("Their first name if they clearly said it, otherwise null."),
  agentName: z.string().nullable().describe("The name they chose for you if they clearly picked one, otherwise null."),
  memories: z
    .array(z.object({ kind: z.enum([MemoryKind.GOAL, MemoryKind.FACT]), content: z.string() }))
    .describe(
      "Durable goals and facts about their life or work that are not already remembered, in second person. Never names, what they call you, their email, things they asked you to do (those are tasks), setup status, or vague plans like connecting an account later; those stay in the summary.",
    ),
  tasks: z
    .array(
      z.object({
        title: z.string().describe("Short task name, like Friday Whopper order."),
        time: z.string().describe("24-hour HH:MM."),
        days: z.array(z.enum(Weekday)).describe("For a recurring task, the days to run. Empty for a one time task."),
        date: z.string().nullable().describe("For a one time task, the date in YYYY-MM-DD. Otherwise null."),
        details: z.string().describe("What should happen when the task runs."),
      }),
    )
    .describe(
      "Things they asked you to do regularly or at a set time, like \"order my usual every Friday at 7\", that are not already in their tasks. Empty if none.",
    ),
})

const parseTranscript = (value: unknown) => z.array(callTranscriptEntrySchema).catch([]).parse(value)

const TRANSCRIPT_SPEAKERS: Record<CallTranscriptEntry["role"], string> = { user: "Them", agent: "You", notice: "Update" }

const formatTranscript = (transcript: CallTranscriptEntry[]) =>
  transcript.map((entry) => `${TRANSCRIPT_SPEAKERS[entry.role]}: ${entry.content}`).join("\n")

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim()

const closeOpenCalls = async (userId: string, timezone: string) => {
  const openCalls = await db.call.findMany({ where: { userId, endedAt: null } })
  await Promise.all(openCalls.map((call) => finalizeCall({ userId, callId: call.id, timezone })))
}

export const startCall = async (userId: string, timezone: string) => {
  await closeOpenCalls(userId, timezone)
  const context = await loadAgentContext(userId)
  const sessionToken = await createFishSession({
    userId,
    timezone,
    systemPrompt: buildCallSystemPrompt(context, timezone),
    opening: buildCallOpening(context),
  })
  const call = await db.call.create({ data: { id: toCallId(sessionToken.session_id), userId } })
  return { callId: call.id, sessionToken }
}

export const appendCallTranscript = async (userId: string, callId: string, entry: Omit<CallTranscriptEntry, "createdAt">) => {
  const payload = JSON.stringify([{ ...entry, createdAt: new Date().toISOString() }])
  const updated = await db.$executeRaw`
    UPDATE "Call" SET "transcript" = "transcript" || ${payload}::jsonb
    WHERE "id" = ${callId}::uuid AND "userId" = ${userId}::uuid AND "endedAt" IS NULL`
  if (updated === 0) {
    throw new HttpError("That call has already ended.", 409)
  }
}

const loadFinalTranscript = async (callId: string, savedTranscript: CallTranscriptEntry[]) => {
  try {
    const session = await fetchFishSession(callId)
    if (session.isLive) {
      await endFishSession(callId)
    }
    return session.transcript.length >= savedTranscript.length ? session.transcript : savedTranscript
  } catch (error) {
    console.error(`Could not load the Fish transcript for call ${callId}.`, error)
    return savedTranscript
  }
}

const summarizeCall = async (userId: string, transcript: CallTranscriptEntry[]) => {
  const context = await loadAgentContext(userId)
  const response = await getOpenAI().responses.parse({
    model: TEXT_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    store: false,
    instructions: `You summarize a call between a personal assistant ("You") and the user ("Them") so the assistant can pick up later by text or on the next call. Only use what was actually said.

Already remembered, do not repeat:
${context.acceptedMemories.map((memory) => `- ${memory.content}`).join("\n") || "- nothing yet"}

Their tasks, do not repeat:
${context.tasks.map((task) => `- ${task.title}, ${formatTaskSchedule(task)}`).join("\n") || "- none yet"}`,
    input: formatTranscript(transcript),
    text: { format: zodTextFormat(callSummarySchema, "call_summary") },
  })
  const summary = response.output_parsed
  if (!summary) {
    throw new Error("The call summary came back empty.")
  }
  return { summary, knownUserName: context.user.userName, knownAgentName: context.user.agentName }
}

const saveCallUnderstanding = async (userId: string, callId: string, transcript: CallTranscriptEntry[]) => {
  const { summary, knownUserName, knownAgentName } = await summarizeCall(userId, transcript)
  await db.$transaction([
    db.call.update({ where: { id: callId }, data: { summary: summary.summary } }),
    ...(summary.userName && !knownUserName
      ? [db.user.update({ where: { id: userId }, data: { userName: summary.userName } })]
      : []),
    ...(summary.agentName && !knownAgentName
      ? [db.user.update({ where: { id: userId }, data: { agentName: summary.agentName } })]
      : []),
  ])
  await saveMemories(
    userId,
    summary.memories.map((memory) => ({ kind: memory.kind, content: memory.content, evidence: MemoryEvidence.CALL })),
  )
  await Promise.all(
    summary.tasks.map(({ date, ...task }) =>
      executeTool({ userId, name: "create_task", rawArguments: { ...task, ...(date ? { date } : {}) }, channel: "call" }),
    ),
  )
}

const introduceDashboardAfterFirstCall = async (userId: string) => {
  const understoodCallCount = await db.call.count({ where: { userId, summary: { not: null } } })
  if (understoodCallCount !== 1) return []
  const user = await db.user.findUnique({ where: { id: userId }, select: { userName: true } })
  return saveAgentTexts(userId, [
    `Great chatting${user?.userName ? `, ${user.userName}` : ""}! Check out your dashboard below, it's where you can see what I know about you, your tasks and connected accounts.\n${getDashboardUrl()}`,
  ])
}

type FinalizeRequest = { userId: string; callId: string; timezone: string }

export const finalizeCall = async ({ userId, callId, timezone }: FinalizeRequest) => {
  const call = await db.call.findFirst({ where: { id: callId, userId } })
  if (!call) {
    throw new HttpError("Call not found.", 404)
  }
  const { count } = await db.call.updateMany({
    where: { id: callId, endedAt: null },
    data: { endedAt: new Date() },
  })
  if (count === 0) return []

  const endedCall = await db.call.findUniqueOrThrow({ where: { id: callId } })
  const savedTranscript = parseTranscript(endedCall.transcript)
  const notices = savedTranscript.filter((entry) => entry.role === "notice")
  const spoken = await loadFinalTranscript(
    callId,
    savedTranscript.filter((entry) => entry.role !== "notice"),
  )
  const transcript = [...spoken, ...notices].toSorted((first, second) => first.createdAt.localeCompare(second.createdAt))
  await db.call.update({ where: { id: callId }, data: { transcript } })

  const undeliveredTexts = notices
    .filter(
      (notice) =>
        !spoken.some(
          (entry) => entry.role === "user" && normalizeText(entry.content).includes(normalizeText(notice.content)),
        ),
    )
    .flatMap((notice) => notice.fallbackTexts ?? [])
  const fallbackMessages = undeliveredTexts.length > 0 ? await saveAgentTexts(userId, undeliveredTexts) : []

  if (!spoken.some((entry) => entry.role === "user")) return fallbackMessages

  try {
    await saveCallUnderstanding(userId, callId, transcript)
  } catch (error) {
    console.error(`Could not summarize call ${callId}.`, error)
  }

  const followUp = await replyToUser({
    userId,
    timezone,
    note: `You just got off a call with them; it's the last one under "Earlier calls". Only text if it adds something: what you promised on the call, answers to anything left open, or picking up a topic the call cut off mid-way. No thanks, no recap, no filler like "What can I help with?" or "Ready when you are." Never repeat anything already said in the texts above, including confirmations, links or questions you've already asked.`,
    canStaySilent: true,
  })
  const dashboardIntroduction = await introduceDashboardAfterFirstCall(userId)
  return [...fallbackMessages, ...followUp, ...dashboardIntroduction]
}

type UserUpdate = { texts: string[]; callNotice: string }

export const sendUpdateToUser = async (userId: string, { texts, callNotice }: UserUpdate) => {
  const openCall = await db.call.findFirst({ where: { userId, endedAt: null }, orderBy: { startedAt: "desc" } })
  if (!openCall) return saveAgentTexts(userId, texts)
  try {
    await appendCallTranscript(userId, openCall.id, { role: "notice", content: callNotice, fallbackTexts: texts })
    return []
  } catch (error) {
    console.warn(`Could not pass an update to call ${openCall.id}; texting it instead.`, error)
    return saveAgentTexts(userId, texts)
  }
}

export const listCallNotices = async (userId: string, callId: string) => {
  const call = await db.call.findFirst({ where: { id: callId, userId }, select: { transcript: true } })
  if (!call) {
    throw new HttpError("Call not found.", 404)
  }
  return parseTranscript(call.transcript)
    .filter((entry) => entry.role === "notice")
    .map((entry) => ({ content: entry.content, createdAt: entry.createdAt }))
}

export const finalizeAbandonedCalls = async (userId: string, timezone: string) => {
  const openCalls = await db.call.findMany({ where: { userId, endedAt: null } })
  await Promise.all(
    openCalls.map(async (call) => {
      try {
        const { isLive } = await fetchFishSession(call.id)
        if (!isLive) {
          await finalizeCall({ userId, callId: call.id, timezone })
        }
      } catch (error) {
        console.error(`Could not check abandoned call ${call.id}.`, error)
      }
    }),
  )
}
