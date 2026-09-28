import "server-only"
import { z } from "zod"
import { zodTextFormat } from "openai/helpers/zod"
import { db } from "@/lib/db"
import { MessageRole } from "@/lib/generated/prisma/enums"
import { isPresent } from "@/lib/utils"
import { loadAgentContext } from "@/helpers/api/agent/context"
import { getAgentName } from "@/helpers/api/agent/prompt"
import { removeDashes } from "@/helpers/api/message"
import { getOpenAI, REASONING_EFFORT, TEXT_MODEL } from "@/helpers/api/openai"
import { formatWeekdays } from "@/helpers/util/weekday"

const TEXT_REFRESH_INTERVAL_MS = 10 * 60 * 1000

const highlightSchema = z.object({
  update: z
    .string()
    .nullable()
    .describe("One or two sentences to the user, or null if you don't know enough yet to say something genuinely useful."),
  opener: z
    .enum(["update", "found"])
    .describe("found if it comes from something you noticed in their email, calendar or files, otherwise update."),
  canHandleIt: z
    .boolean()
    .describe("True only if it's still undone and you could take care of it for them. False if it's already handled or scheduled."),
})

const OPENERS = { update: "Here's your update.", found: "Here's what I found." }

const composeHighlight = (userName: string | null, highlight: z.infer<typeof highlightSchema>, update: string) =>
  `Hey${userName ? ` ${userName}` : ""}! ${OPENERS[highlight.opener]}\n${removeDashes(update)}${highlight.canHandleIt ? " Want me to handle that for you?" : ""}`

export const refreshHighlight = async (userId: string) => {
  const context = await loadAgentContext(userId)
  const response = await getOpenAI().responses.parse({
    model: TEXT_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    store: false,
    instructions: `You are ${getAgentName(context)}, the user's personal assistant. Write the one thing most worth telling them right now, shown at the top of their dashboard: a specific suggestion for something they should do, or a genuinely useful observation about their week, work or goals.
- One or two warm, natural sentences in second person, like a friend who's been paying attention.
- Ground it in what you know below. Never generic advice, never made up.
- Prefer what's time-sensitive or easy to miss over what they obviously already know.
- Never ask them for setup info like their name or connecting accounts. If you don't know anything specific and useful about them yet, return null.
- No greeting and no closing question, those are added for you. No links, no lists, no dashes, and don't mention the dashboard or yourself as software.
- You can do almost anything for them (book, order, email, schedule, research), so set canHandleIt when it's still undone and you could take it on. Then phrase the update as what still needs doing, like "Your database comparison for Derrick is due tomorrow at 9 AM and hasn't been started yet."
- If it's already handled, scheduled or covered by one of their tasks, set canHandleIt to false and just tell them what's coming. Never describe something as handled and then offer to handle it.`,
    input: JSON.stringify({
      now: new Date().toISOString(),
      memories: context.acceptedMemories.map((memory) => `${memory.kind}: ${memory.content}`),
      tasks: context.tasks.map((task) => `${task.title} at ${task.time} on ${formatWeekdays(task.days)}`),
      recentCalls: context.recentCalls.map((call) => call.summary).filter(isPresent),
      recentTexts: context.recentMessages
        .slice(-20)
        .map((message) => `${message.role === MessageRole.USER ? "Them" : "You"}: ${message.content}`),
    }),
    text: { format: zodTextFormat(highlightSchema, "dashboard_highlight") },
  })
  const parsed = response.output_parsed
  const update = parsed?.update?.trim()
  await db.user.update({
    where: { id: userId },
    data: {
      highlight: parsed && update ? composeHighlight(context.user.userName, parsed, update) : null,
      highlightUpdatedAt: new Date(),
    },
  })
}

export const refreshHighlightSafely = async (userId: string) => {
  try {
    await refreshHighlight(userId)
  } catch (error) {
    console.error(`Could not refresh the highlight for user ${userId}.`, error)
  }
}

export const refreshHighlightIfStale = async (userId: string) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { highlightUpdatedAt: true } })
  const isStale =
    !user?.highlightUpdatedAt || Date.now() - user.highlightUpdatedAt.getTime() > TEXT_REFRESH_INTERVAL_MS
  if (isStale) await refreshHighlightSafely(userId)
}
