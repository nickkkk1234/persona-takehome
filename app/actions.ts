"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import type { ProfileField, TaskForm } from "@/types/dashboard"
import { profileFieldSchema, taskFormSchema } from "@/types/schemas"
import { db } from "@/lib/db"
import { MemoryStatus } from "@/lib/generated/prisma/enums"
import { getSessionUserId, requireSessionUserId, setSessionCookie } from "@/helpers/api/session"
import { createUserWithGreeting } from "@/helpers/api/user"
import { HOME_PATH } from "@/helpers/util/routes"
import { sortWeekdays } from "@/helpers/util/weekday"

export const startSession = async () => {
  const existingUserId = await getSessionUserId()
  if (!existingUserId) {
    const user = await createUserWithGreeting()
    await setSessionCookie(user.id)
  }
  redirect("/chat")
}

export const updateProfile = async (field: ProfileField, value: string) => {
  const userId = await requireSessionUserId()
  const trimmed = z.string().trim().max(80).parse(value)
  await db.user.update({
    where: { id: userId },
    data: { [profileFieldSchema.parse(field)]: trimmed.length > 0 ? trimmed : null },
  })
  revalidatePath(HOME_PATH)
}

export const createTask = async (form: TaskForm) => {
  const userId = await requireSessionUserId()
  const { title, time, date, days, details } = taskFormSchema.parse(form)
  await db.task.create({
    data: { userId, title, time, date, days: date ? [] : sortWeekdays(days), details: details.length > 0 ? details : null },
  })
  revalidatePath(HOME_PATH)
}

export const updateTask = async (taskId: string, form: TaskForm) => {
  const userId = await requireSessionUserId()
  const { title, time, date, days, details } = taskFormSchema.parse(form)
  await db.task.updateMany({
    where: { id: z.uuid().parse(taskId), userId },
    data: { title, time, date, days: date ? [] : sortWeekdays(days), details: details.length > 0 ? details : null },
  })
  revalidatePath(HOME_PATH)
}

export const deleteTask = async (taskId: string) => {
  const userId = await requireSessionUserId()
  await db.task.deleteMany({ where: { id: z.uuid().parse(taskId), userId } })
  revalidatePath(HOME_PATH)
}

export const rejectMemory = async (memoryId: string) => {
  const userId = await requireSessionUserId()
  await db.memory.updateMany({
    where: { id: z.uuid().parse(memoryId), userId },
    data: { status: MemoryStatus.REJECTED },
  })
  revalidatePath(HOME_PATH)
}

export const disconnectGoogle = async (connectionId: string) => {
  const userId = await requireSessionUserId()
  await db.googleConnection.deleteMany({ where: { id: z.uuid().parse(connectionId), userId } })
  revalidatePath(HOME_PATH)
}
