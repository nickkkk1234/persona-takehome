import "server-only"
import { z } from "zod"
import { getEnvironment } from "@/helpers/api/environment"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
]

export const GOOGLE_STATE_COOKIE = "google_oauth_state"

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
})

const userInfoSchema = z.object({
  sub: z.string(),
  email: z.email(),
})

const getRedirectUri = () => `${getEnvironment().APP_URL}/api/google/callback`

export const buildGoogleAuthUrl = (state: string) => {
  const url = new URL(GOOGLE_AUTH_URL)
  url.search = new URLSearchParams({
    client_id: getEnvironment().GMAIL_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  }).toString()
  return url.toString()
}

const requestToken = async (parameters: Record<string, string>) => {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = getEnvironment()
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, ...parameters }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}: ${await response.text()}`)
  }
  return tokenResponseSchema.parse(await response.json())
}

export const exchangeGoogleCode = (code: string) =>
  requestToken({ code, grant_type: "authorization_code", redirect_uri: getRedirectUri() })

export const refreshGoogleAccessToken = (refreshToken: string) =>
  requestToken({ refresh_token: refreshToken, grant_type: "refresh_token" })

export const fetchGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Google user info request failed with ${response.status}.`)
  }
  return userInfoSchema.parse(await response.json())
}
