import "server-only"
import type { GmailPart } from "@/types/google"

const INVISIBLE_CHARACTERS = /[\u200B-\u200F\u2060\uFEFF]/g
const QUOTED_REPLY =
  /\n(?:On .{0,300} wrote:|[- ]*Original Message[- ]*|From:\s.+\nSent:\s.+\nTo:\s.+\nSubject:\s.+)(?:\n|$)/i
const SIGNATURE = /\n(?:--\s*|Sent from my (?:iPhone|iPad|Android).*)\n?/i
const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
}

const decodeBase64Url = (data: string) => Buffer.from(data, "base64url").toString("utf8")

const collectText = (part: GmailPart, mimeType: string): string[] => [
  ...(part.mimeType === mimeType && part.body?.data ? [decodeBase64Url(part.body.data)] : []),
  ...(part.parts ?? []).flatMap((child) => collectText(child, mimeType)),
]

const decodeEntities = (text: string) =>
  text
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos|#39);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))

const stripHtml = (html: string) =>
  html
    .replace(/<(?:head|style|script)[^>]*>[\s\S]*?<\/(?:head|style|script)>/gi, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")

const cutAt = (text: string, pattern: RegExp) => {
  const index = text.search(pattern)
  return index > 0 ? text.slice(0, index) : text
}

export const extractEmailBody = (payload: GmailPart) => {
  const plain = collectText(payload, "text/plain").join("\n")
  const raw = plain.trim().length > 0 ? plain : stripHtml(collectText(payload, "text/html").join("\n"))
  const decoded = decodeEntities(raw).replace(INVISIBLE_CHARACTERS, "").replace(/\r\n/g, "\n")
  return cutAt(cutAt(decoded, QUOTED_REPLY), SIGNATURE)
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
}
