export type GmailPart = {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
}
