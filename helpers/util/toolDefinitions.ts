import { z } from "zod"
import { MemoryKind, Weekday } from "@/lib/generated/prisma/enums"
import { parseWeekdays } from "@/helpers/util/weekday"

// Imported by the browser and scripts/syncFishAgent.ts, so keep it free of server-only imports.

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional()

const time = z
  .string()
  .trim()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Time must be 24-hour HH:MM, like 07:30.")
  .transform((value) => value.padStart(5, "0"))

const weekdays = z.union([
  z.array(z.enum(Weekday)),
  z.string().transform((text, context) => {
    const days = parseWeekdays(text)
    if (days.length === 0) {
      context.addIssue({ code: "custom", message: `Could not read days from "${text}".` })
    }
    return days
  }),
])

const count = (maximum: number) =>
  z.union([z.number(), z.string()]).pipe(z.coerce.number<string | number>().int().min(1).max(maximum)).optional()

export const TOOL_DEFINITIONS = {
  update_profile: {
    description:
      "Save the user's name, the name they chose for you, or their email address. Only pass fields the user actually told you.",
    input: z.object({
      user_name: optionalText.describe("The user's first name, as they said it."),
      agent_name: optionalText.describe("The name the user picked for you."),
      email: z.email().optional().catch(undefined).describe("The user's email address, only if they typed or spelled it out."),
    }),
  },
  save_memory: {
    description:
      "Remember a durable fact about the user's life or work. GOAL is something they want help with, FACT is a fact about them, INSIGHT is a non-obvious observation. Never save names or email (use update_profile), things you'll do for them (use create_task), setup status, or vague plans like connecting an account later. Don't save duplicates.",
    input: z.object({
      kind: z.enum(MemoryKind).describe("One of GOAL, FACT, INSIGHT."),
      content: z.string().trim().min(1).max(500).describe("One short sentence, written about the user in second person."),
    }),
  },
  reject_memory: {
    description:
      "Forget a memory the user says is wrong or no longer true. Use the memory id from your context.",
    input: z.object({
      memory_id: z.uuid().describe("Id of the memory to forget."),
    }),
  },
  create_task: {
    description:
      "Create a recurring task you will do for the user at a time of day on given days, like a morning email digest on weekdays.",
    input: z.object({
      title: z.string().trim().min(1).max(120).describe("Short task name, like Morning inbox digest."),
      time: time.describe("Time of day in 24-hour HH:MM, like 08:00."),
      days: weekdays.describe("Days to run: a list of SUN, MON, TUE, WED, THU, FRI, SAT, or words like weekdays, weekends, daily."),
      details: optionalText.describe("What should happen when the task runs."),
    }),
  },
  update_task: {
    description: "Change an existing task. Only pass the fields that change.",
    input: z.object({
      task_id: z.uuid().describe("Id of the task to change."),
      title: optionalText.describe("New task name."),
      time: time.optional().describe("New time of day in 24-hour HH:MM."),
      days: weekdays.optional().describe("New days to run."),
      details: optionalText.describe("New description of what should happen."),
    }),
  },
  delete_task: {
    description: "Delete a task the user no longer wants.",
    input: z.object({
      task_id: z.uuid().describe("Id of the task to delete."),
    }),
  },
  search_email: {
    description:
      "Search the user's connected Gmail accounts. Returns sender, subject, date and a snippet for each match.",
    input: z.object({
      query: z.string().trim().min(1).describe("Gmail search syntax, like from:amazon newer_than:30d."),
      max_results: count(20).describe("How many emails to return, up to 20. Defaults to 10."),
    }),
  },
  list_calendar_events: {
    description: "List upcoming events on the user's connected Google calendars.",
    input: z.object({
      days_ahead: count(30).describe("How many days ahead to look, up to 30. Defaults to 7."),
    }),
  },
  search_drive: {
    description: "Search file names and contents in the user's connected Google Drive accounts.",
    input: z.object({
      query: z.string().trim().min(1).describe("Words to search for."),
    }),
  },
  search_contacts: {
    description: "Search the user's Google contacts by name, email or phone number.",
    input: z.object({
      query: z.string().trim().min(1).describe("Name, email or phone number to look for."),
    }),
  },
  complete_request: {
    description:
      "Take care of anything they ask you to do in the real world: book a ride, make a reservation, order something, send an email or message, pay a bill. It always succeeds. Use it whenever they ask, then tell them it's handled.",
    input: z.object({
      request: z.string().trim().min(1).max(500).describe("What they asked for, with every detail they gave."),
      when: optionalText.describe("When it should happen, if they said."),
    }),
  },
  send_text: {
    description:
      "Text the user in the chat while you are on the call. Use it for anything they need to read, like links, lists or email addresses, then tell them you texted it.",
    input: z.object({
      content: z.string().trim().min(1).max(2000).describe("The text message to send."),
    }),
  },
} as const

export const TEXT_TOOL_NAMES = [
  "update_profile",
  "save_memory",
  "reject_memory",
  "create_task",
  "update_task",
  "delete_task",
  "search_email",
  "list_calendar_events",
  "search_drive",
  "search_contacts",
  "complete_request",
] as const

export const CALL_TOOL_NAMES = [...TEXT_TOOL_NAMES, "send_text"] as const
