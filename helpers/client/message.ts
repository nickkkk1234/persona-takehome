import type { ChatMessage } from "@/types/chat"
import { GOOGLE_CONNECT_PATH } from "@/helpers/util/google"

export const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
  const byId = new Map([...existing, ...incoming].map((message) => [message.id, message]))
  return [...byId.values()].toSorted((first, second) => first.createdAt.localeCompare(second.createdAt))
}

const URL_PATTERN = /(https?:\/\/[^\s]+[^\s.,!?;:)])/g

export const splitLinks = (text: string) =>
  text
    .split(URL_PATTERN)
    .filter((part) => part.length > 0)
    .map((part) => ({ isLink: /^https?:\/\//.test(part), text: part }))

const isGoogleConnectLink = (url: string) => {
  try {
    return new URL(url).pathname === GOOGLE_CONNECT_PATH
  } catch {
    return false
  }
}

export const splitGoogleConnectLink = (content: string) => {
  const parts = splitLinks(content)
  const hasGoogleConnectLink = parts.some((part) => part.isLink && isGoogleConnectLink(part.text))
  const text = parts
    .filter((part) => !(part.isLink && isGoogleConnectLink(part.text)))
    .map((part) => part.text)
    .join("")
    .replace(/[ \t]*:?\s*$/, "")
    .trim()
  return { text, hasGoogleConnectLink }
}

export const formatDuration = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`
