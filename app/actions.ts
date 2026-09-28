"use server"

import { redirect } from "next/navigation"
import { getSessionUserId, setSessionCookie } from "@/helpers/api/session"
import { createUserWithGreeting } from "@/helpers/api/user"

export const startSession = async () => {
  const existingUserId = await getSessionUserId()
  if (!existingUserId) {
    const user = await createUserWithGreeting()
    await setSessionCookie(user.id)
  }
  redirect("/chat")
}
