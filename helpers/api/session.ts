import "server-only"
import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { db } from "@/lib/db"
import { getEnvironment } from "@/helpers/api/environment"
import { HttpError } from "@/helpers/api/http"

const SESSION_COOKIE = "persona_session"
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const signUserId = (userId: string) =>
  createHmac("sha256", getEnvironment().SESSION_SECRET).update(userId).digest("base64url")

const verifySessionToken = (token: string) => {
  const [userId, signature] = token.split(".")
  if (!userId || !signature) return
  const expected = Buffer.from(signUserId(userId))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received) ? userId : undefined
}

export const setSessionCookie = async (userId: string) => {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, `${userId}.${signUserId(userId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(getEnvironment().APP_URL).protocol === "https:",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  })
}

export const clearSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export const getSessionUserId = async () => {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  const userId = token ? verifySessionToken(token) : undefined
  if (!userId) return
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } })
  return user?.id
}

export const requireSessionUserId = async () => {
  const userId = await getSessionUserId()
  if (!userId) {
    throw new HttpError("Your session has ended. Start a new one from the home page.", 401)
  }
  return userId
}
