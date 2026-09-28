import type { z } from "zod"
import type { MemoryEvidence, MemoryKind, Weekday } from "@/lib/generated/prisma/enums"
import type { profileFieldSchema, taskFormSchema } from "@/types/schemas"

export type TaskForm = z.infer<typeof taskFormSchema>

export type ProfileField = z.infer<typeof profileFieldSchema>

export type DashboardTask = {
  id: string
  title: string
  time: string
  days: Weekday[]
  details: string | null
}

export type DashboardMemory = {
  id: string
  kind: MemoryKind
  content: string
  evidence: MemoryEvidence
  sourceUrl: string | null
}

export type DashboardConnection = {
  id: string
  email: string
}
