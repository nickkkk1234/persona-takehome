import { randomBytes } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { buildGoogleAuthUrl, GOOGLE_STATE_COOKIE } from "@/helpers/api/google/oauth"
import { getSessionUserId } from "@/helpers/api/session"

export const GET = async () => {
  const userId = await getSessionUserId()
  if (!userId) redirect("/")
  const state = randomBytes(24).toString("base64url")
  const cookieStore = await cookies()
  cookieStore.set(GOOGLE_STATE_COOKIE, state, { httpOnly: true, sameSite: "lax", path: "/api/google", maxAge: 600 })
  redirect(buildGoogleAuthUrl(state))
}
