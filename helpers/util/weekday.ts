import { Weekday } from "@/lib/generated/prisma/enums"
import { isPresent } from "@/lib/utils"

export const WEEKDAYS = [
  Weekday.SUN,
  Weekday.MON,
  Weekday.TUE,
  Weekday.WED,
  Weekday.THU,
  Weekday.FRI,
  Weekday.SAT,
] as const

const WORKWEEK = [Weekday.MON, Weekday.TUE, Weekday.WED, Weekday.THU, Weekday.FRI]
const WEEKEND = [Weekday.SUN, Weekday.SAT]

const WEEKDAY_NAMES: Record<Weekday, string> = {
  SUN: "sunday",
  MON: "monday",
  TUE: "tuesday",
  WED: "wednesday",
  THU: "thursday",
  FRI: "friday",
  SAT: "saturday",
}

const findWeekday = (word: string) =>
  word.length >= 2 ? WEEKDAYS.find((weekday) => WEEKDAY_NAMES[weekday].startsWith(word)) : undefined

export const sortWeekdays = (days: readonly Weekday[]) =>
  WEEKDAYS.filter((weekday) => days.includes(weekday))

const hasExactly = (days: readonly Weekday[], expected: readonly Weekday[]) =>
  days.length === expected.length && expected.every((weekday) => days.includes(weekday))

export const parseWeekdays = (text: string) => {
  const normalized = text.trim().toLowerCase()
  if (["daily", "every day", "everyday", "all"].includes(normalized)) return [...WEEKDAYS]
  if (["weekdays", "workdays", "weekday"].includes(normalized)) return [...WORKWEEK]
  if (["weekends", "weekend"].includes(normalized)) return [...WEEKEND]

  const matches = normalized
    .split(/[\s,;/]+|\band\b/)
    .map((word) => findWeekday(word.replace(/s$/, "")))
    .filter(isPresent)
  return sortWeekdays(matches)
}

export const formatWeekdays = (days: readonly Weekday[]) => {
  if (days.length === 0) return "No days"
  if (hasExactly(days, WEEKDAYS)) return "Every day"
  if (hasExactly(days, WORKWEEK)) return "Weekdays"
  if (hasExactly(days, WEEKEND)) return "Weekends"
  return sortWeekdays(days)
    .map((weekday) => weekday.charAt(0) + weekday.slice(1).toLowerCase())
    .join(", ")
}

export const formatTaskSchedule = (time: string, days: readonly Weekday[]) =>
  hasExactly(days, WEEKDAYS) ? `${time} every day` : `${time} on ${formatWeekdays(days)}`

export const WEEKDAY_INITIALS: Record<Weekday, string> = {
  SUN: "S",
  MON: "M",
  TUE: "T",
  WED: "W",
  THU: "T",
  FRI: "F",
  SAT: "S",
}
