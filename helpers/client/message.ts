import type { ChatMessage } from "@/types/chat"
import { HOME_PATH, GOOGLE_CONNECT_PATH } from "@/helpers/util/routes"
import { isPresent } from "@/lib/utils"

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

const CARD_PATHS = [GOOGLE_CONNECT_PATH, HOME_PATH]

const findCardPath = (url: string) => {
  try {
    const { pathname } = new URL(url)
    return CARD_PATHS.find((path) => path === pathname)
  } catch {
    return
  }
}

export const splitCardLinks = (content: string) => {
  const parts = splitLinks(content)
  const cardPaths = parts.map((part) => (part.isLink ? findCardPath(part.text) : undefined)).filter(isPresent)
  const text = parts
    .filter((part) => !(part.isLink && findCardPath(part.text)))
    .map((part) => part.text)
    .join("")
    .replace(/[ \t]*:?\s*$/, "")
    .trim()
  return { text, cardPaths: [...new Set(cardPaths)] }
}

const CARD_PREVIEWS = new Map([
  [GOOGLE_CONNECT_PATH, "a Google connection link"],
  [HOME_PATH, "a dashboard link"],
])

export const describeTextedMessage = (content: string) => {
  const { text, cardPaths } = splitCardLinks(content)
  const [cardPath] = cardPaths
  const cardPreview = cardPath ? CARD_PREVIEWS.get(cardPath) : undefined
  if (cardPreview && text.length === 0) return `Texted you ${cardPreview}`
  return `Texted you: ${text.length > 0 ? text : content}`
}

export const formatDuration = (totalSeconds: number) =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`
