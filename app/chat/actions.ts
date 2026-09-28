"use server"

import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { clearSessionCookie, getSessionUserId } from "@/helpers/api/session"

export const resetUser = async () => {
  const userId = await getSessionUserId()
  if (userId) {
    await db.user.delete({ where: { id: userId } })
  }
  await clearSessionCookie()
  redirect("/")
}
