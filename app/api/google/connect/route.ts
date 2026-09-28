import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import {
  buildGoogleAuthUrl,
  GOOGLE_RETURN_COOKIE,
  GOOGLE_RETURN_PATHS,
  GOOGLE_STATE_COOKIE,
} from "@/helpers/api/google/oauth"
import { getSessionUserId } from "@/helpers/api/session"

const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax", path: "/api/google", maxAge: 600 } as const

export const GET = async (request: Request) => {
  const userId = await getSessionUserId()
  if (!userId) redirect("/")
  const returnTo = z.enum(GOOGLE_RETURN_PATHS).catch("/chat").parse(new URL(request.url).searchParams.get("returnTo"))
  const state = randomBytes(24).toString("base64url")
  const cookieStore = await cookies()
  cookieStore.set(GOOGLE_STATE_COOKIE, state, COOKIE_OPTIONS)
  cookieStore.set(GOOGLE_RETURN_COOKIE, returnTo, COOKIE_OPTIONS)
  redirect(buildGoogleAuthUrl(state))
}
