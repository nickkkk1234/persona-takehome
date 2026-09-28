import "server-only"
import { z } from "zod"
import type { GoogleConnection } from "@/lib/generated/prisma/client"
import type { GmailPart } from "@/types/google"
import { fetchGoogleJson } from "@/helpers/api/google/client"
import { extractEmailBody } from "@/helpers/api/google/emailText"
import { isPresent } from "@/lib/utils"
import { executeWithConcurrencyLimit } from "@/helpers/util/promise"

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
const DRIVE_API = "https://www.googleapis.com/drive/v3/files"
const PEOPLE_API = "https://people.googleapis.com/v1/people/me/connections"

const messageListSchema = z.object({
  messages: z.array(z.object({ id: z.string() })).default([]),
})

const messageSchema = z.object({
  id: z.string(),
  snippet: z.string().default(""),
  labelIds: z.array(z.string()).default([]),
  payload: z.object({
    headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]),
  }),
})

const gmailPartSchema: z.ZodType<GmailPart> = z.lazy(() =>
  z.object({
    mimeType: z.string().optional(),
    body: z.object({ data: z.string().optional() }).optional(),
    parts: z.array(gmailPartSchema).optional(),
  }),
)

const fullMessageSchema = z.object({
  id: z.string(),
  labelIds: z.array(z.string()).default([]),
  payload: z.intersection(
    gmailPartSchema,
    z.object({ headers: z.array(z.object({ name: z.string(), value: z.string() })).default([]) }),
  ),
})

const eventListSchema = z.object({
  items: z
    .array(
      z.object({
        summary: z.string().default("(No title)"),
        location: z.string().optional(),
        start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
        end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }),
        attendees: z.array(z.object({ email: z.string().optional() })).default([]),
        recurringEventId: z.string().optional(),
        htmlLink: z.string().optional(),
      }),
    )
    .default([]),
})

const fileListSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string(),
        mimeType: z.string(),
        modifiedTime: z.string(),
        webViewLink: z.string().optional(),
      }),
    )
    .default([]),
})

const connectionListSchema = z.object({
  connections: z
    .array(
      z.object({
        names: z.array(z.object({ displayName: z.string() })).default([]),
        emailAddresses: z.array(z.object({ value: z.string() })).default([]),
        phoneNumbers: z.array(z.object({ value: z.string() })).default([]),
        organizations: z.array(z.object({ name: z.string().optional(), title: z.string().optional() })).default([]),
      }),
    )
    .default([]),
  totalPeople: z.number().default(0),
})

const findHeader = (headers: { name: string; value: string }[], name: string) =>
  headers.find((header) => header.name.toLowerCase() === name.toLowerCase())?.value ?? ""

export const searchEmail = async (connection: GoogleConnection, query: string, maxResults: number) => {
  const listUrl = `${GMAIL_API}/messages?${new URLSearchParams({ q: query, maxResults: String(maxResults) })}`
  const { messages } = await fetchGoogleJson(connection, listUrl, messageListSchema)
  const metadataQuery = "format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date"
  const details = await executeWithConcurrencyLimit(messages, 10, (message) =>
    fetchGoogleJson(connection, `${GMAIL_API}/messages/${message.id}?${metadataQuery}`, messageSchema),
  )
  return details.map((message) => ({
    id: message.id,
    account: connection.email,
    from: findHeader(message.payload.headers, "From"),
    to: findHeader(message.payload.headers, "To"),
    subject: findHeader(message.payload.headers, "Subject"),
    date: findHeader(message.payload.headers, "Date"),
    snippet: message.snippet,
    isUnread: message.labelIds.includes("UNREAD"),
  }))
}

export const listEmailIds = async (connection: GoogleConnection, query: string, maxResults: number) => {
  const url = `${GMAIL_API}/messages?${new URLSearchParams({ q: query, maxResults: String(maxResults) })}`
  const { messages } = await fetchGoogleJson(connection, url, messageListSchema)
  return messages.map((message) => message.id)
}

export const fetchFullEmail = async (connection: GoogleConnection, id: string) => {
  const message = await fetchGoogleJson(connection, `${GMAIL_API}/messages/${id}?format=full`, fullMessageSchema)
  return {
    id: message.id,
    from: findHeader(message.payload.headers, "From"),
    to: findHeader(message.payload.headers, "To"),
    subject: findHeader(message.payload.headers, "Subject"),
    date: findHeader(message.payload.headers, "Date"),
    isUnread: message.labelIds.includes("UNREAD"),
    isSent: message.labelIds.includes("SENT"),
    body: extractEmailBody(message.payload),
  }
}

export const listCalendarEvents = async (connection: GoogleConnection, from: Date, to: Date) => {
  const url = `${CALENDAR_API}?${new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  })}`
  const { items } = await fetchGoogleJson(connection, url, eventListSchema)
  return items.map((event) => ({
    account: connection.email,
    title: event.summary,
    start: event.start.dateTime ?? event.start.date ?? "",
    end: event.end.dateTime ?? event.end.date ?? "",
    location: event.location,
    attendeeCount: event.attendees.length,
    isRecurring: event.recurringEventId !== undefined,
    link: event.htmlLink,
  }))
}

const toDriveFiles = (connection: GoogleConnection, files: z.infer<typeof fileListSchema>["files"]) =>
  files.map((file) => ({
    account: connection.email,
    name: file.name,
    type: file.mimeType.replace("application/vnd.google-apps.", ""),
    modifiedAt: file.modifiedTime,
    link: file.webViewLink,
  }))

const DRIVE_FIELDS = "files(name,mimeType,modifiedTime,webViewLink)"

export const searchDrive = async (connection: GoogleConnection, query: string) => {
  const escaped = query.replaceAll("\\", "\\\\").replaceAll("'", "\\'")
  const url = `${DRIVE_API}?${new URLSearchParams({
    q: `(name contains '${escaped}' or fullText contains '${escaped}') and trashed = false`,
    pageSize: "10",
    fields: DRIVE_FIELDS,
  })}`
  const { files } = await fetchGoogleJson(connection, url, fileListSchema)
  return toDriveFiles(connection, files)
}

export const listRecentDriveFiles = async (connection: GoogleConnection, limit: number) => {
  const url = `${DRIVE_API}?${new URLSearchParams({
    q: "trashed = false and 'me' in owners",
    orderBy: "modifiedTime desc",
    pageSize: String(limit),
    fields: DRIVE_FIELDS,
  })}`
  const { files } = await fetchGoogleJson(connection, url, fileListSchema)
  return toDriveFiles(connection, files)
}

const toContact = (connection: GoogleConnection, person: z.infer<typeof connectionListSchema>["connections"][number]) => ({
  account: connection.email,
  name: person.names[0]?.displayName ?? "",
  emails: person.emailAddresses.map((email) => email.value),
  phones: person.phoneNumbers.map((phone) => phone.value),
  organization: [person.organizations[0]?.title, person.organizations[0]?.name].filter(isPresent).join(", "),
  company: person.organizations[0]?.name,
})

export const listContacts = async (connection: GoogleConnection) => {
  const url = `${PEOPLE_API}?${new URLSearchParams({
    personFields: "names,emailAddresses,phoneNumbers,organizations",
    pageSize: "500",
    sortOrder: "LAST_MODIFIED_DESCENDING",
  })}`
  const { connections, totalPeople } = await fetchGoogleJson(connection, url, connectionListSchema)
  return { contacts: connections.map((person) => toContact(connection, person)), totalPeople }
}

export const searchContacts = async (connection: GoogleConnection, query: string) => {
  const { contacts } = await listContacts(connection)
  const needle = query.toLowerCase()
  return contacts
    .filter((contact) =>
      [contact.name, contact.organization, ...contact.emails, ...contact.phones].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    )
    .slice(0, 10)
}
