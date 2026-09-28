import { after } from "next/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { backfillGoogleConnection } from "@/helpers/api/google/backfill"
import { exchangeGoogleCode, fetchGoogleUserInfo, GOOGLE_SCOPES, GOOGLE_STATE_COOKIE } from "@/helpers/api/google/oauth"
import { sendUpdateToUser } from "@/helpers/api/call"
import { encryptSecret } from "@/helpers/api/secret"
import { getSessionUserId } from "@/helpers/api/session"

const connectGoogleAccount = async (userId: string, code: string) => {
  const token = await exchangeGoogleCode(code)
  const grantedScopes = token.scope.split(" ")
  if (!GOOGLE_SCOPES.every((scope) => scope === "openid" || scope === "email" || grantedScopes.includes(scope))) {
    return
  }
  const profile = await fetchGoogleUserInfo(token.access_token)
  const existing = await db.googleConnection.findUnique({ where: { googleId: profile.sub } })
  const refreshToken = token.refresh_token ? encryptSecret(token.refresh_token) : existing?.refreshToken
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token.")
  }
  await db.user.updateMany({ where: { id: userId, email: null }, data: { email: profile.email } })
  return db.googleConnection.upsert({
    where: { googleId: profile.sub },
    create: { userId, googleId: profile.sub, email: profile.email, scopes: grantedScopes, refreshToken },
    update: { userId, email: profile.email, scopes: grantedScopes, refreshToken },
  })
}

const connectAndNotify = async (userId: string, code: string) => {
  try {
    const connection = await connectGoogleAccount(userId, code)
    if (!connection) {
      await sendUpdateToUser(userId, {
        texts: ["Looks like some permissions were unchecked on Google's screen, so I couldn't connect. You can try again anytime."],
        callNotice:
          "They tried to connect Google but left some permissions unchecked, so it didn't connect. Let them know they can try again with the same link whenever, then carry on.",
      })
      return
    }
    await sendUpdateToUser(userId, {
      texts: [`Connected ${connection.email}. Give me a minute to look around and I'll text you what I find.`],
      callNotice: `They just connected their Google account (${connection.email}). Tell them it worked and that you'll look around and share what you find in a minute, then keep going with whatever setup is left.`,
    })
    after(() => backfillGoogleConnection(userId, connection.id))
  } catch (error) {
    console.error("Connecting Google failed.", error)
    await sendUpdateToUser(userId, {
      texts: ["Something went wrong connecting Google. Mind trying again?"],
      callNotice: "Connecting their Google account failed on our side. Ask them to try the link again, then carry on.",
    })
  }
}

export const GET = async (request: Request) => {
  const userId = await getSessionUserId()
  if (!userId) redirect("/")

  const parameters = new URL(request.url).searchParams
  const cookieStore = await cookies()
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value
  cookieStore.delete(GOOGLE_STATE_COOKIE)
  const code = parameters.get("code")
  if (!code || !expectedState || parameters.get("state") !== expectedState) redirect("/chat")

  await connectAndNotify(userId, code)
  redirect("/chat")
}
