"use client"

import { useState, useTransition } from "react"
import { format, parseISO } from "date-fns"
import { CalendarDays, Clock } from "lucide-react"
import { toast } from "sonner"
import type { DashboardTask } from "@/types/dashboard"
import { createTask, updateTask } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { Weekday } from "@/lib/generated/prisma/enums"
import { cn, isPresent } from "@/lib/utils"
import { WEEKDAY_INITIALS, WEEKDAYS } from "@/helpers/util/weekday"

type TaskEditDialogProps = {
  task?: DashboardTask
  onClose: () => void
}

const FIELD_CLASS_NAME = "border-border-field text-row shadow-none focus-visible:border-border-field focus-visible:ring-0 md:text-row"

const PILL_FIELD_CLASS_NAME = cn("h-(--pill-height) w-full rounded-full px-(--space-7) text-text-heading", FIELD_CLASS_NAME)

const PILL_FIELD_ICON_CLASS_NAME =
  "pointer-events-none absolute top-1/2 right-(--space-7) size-4 -translate-y-1/2 text-text-muted"

export const TaskEditDialog = ({ task, onClose }: TaskEditDialogProps) => {
  const [title, setTitle] = useState(task?.title ?? "")
  const [time, setTime] = useState(task?.time ?? "09:00")
  const [isRecurring, setIsRecurring] = useState(isPresent(task) && !task.date)
  const [date, setDate] = useState(task?.date ?? format(new Date(), "yyyy-MM-dd"))
  const [days, setDays] = useState(task?.days ?? [])
  const [details, setDetails] = useState(task?.details ?? "")
  const [isSaving, startTransition] = useTransition()

  const toggleDay = (day: Weekday) =>
    setDays((current) => (current.includes(day) ? current.filter((selected) => selected !== day) : [...current, day]))

  const save = () =>
    startTransition(async () => {
      try {
        const form = { title, time, date: isRecurring ? null : date, days, details }
        await (task ? updateTask(task.id, form) : createTask(form))
        onClose()
      } catch (error) {
        console.warn("Could not save the task.", error)
        toast.error("Couldn't save the task. Check the name and time and try again.")
      }
    })

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm rounded-lg border-border-hairline" onOpenAutoFocus={(event) => event.preventDefault()}>
        <DialogTitle asChild>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-label="Task name"
            placeholder="Task name"
            className="mr-(--space-9) bg-transparent font-display text-nav font-semibold text-text-heading outline-none placeholder:text-text-muted"
          />
        </DialogTitle>
        <div className="flex flex-col gap-(--space-7)">
          {isRecurring ? (
            <div className="flex justify-between">
              {WEEKDAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={days.includes(day)}
                  aria-label={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex size-9 cursor-pointer items-center justify-center rounded-full font-display text-meta font-medium transition-colors duration-200",
                    days.includes(day)
                      ? "bg-primary text-primary-foreground"
                      : "border border-border-field text-text-secondary hover:bg-tile",
                  )}
                >
                  {WEEKDAY_INITIALS[day]}
                </button>
              ))}
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn("relative flex cursor-pointer items-center border bg-surface", PILL_FIELD_CLASS_NAME)}
                >
                  {format(parseISO(date), "MMMM d")}
                  <CalendarDays className={PILL_FIELD_ICON_CLASS_NAME} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto rounded-lg border-border-hairline p-0">
                <Calendar
                  mode="single"
                  required
                  selected={parseISO(date)}
                  defaultMonth={parseISO(date)}
                  onSelect={(selected) => setDate(format(selected, "yyyy-MM-dd"))}
                />
              </PopoverContent>
            </Popover>
          )}
          <div className="relative">
            <Input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label="Time"
              className={cn(PILL_FIELD_CLASS_NAME, "[&::-webkit-calendar-picker-indicator]:opacity-0")}
            />
            <Clock className={PILL_FIELD_ICON_CLASS_NAME} />
          </div>
          <label className="mt-(--space-4) flex flex-col gap-(--space-2)">
            <span className="font-display text-row font-medium text-text-heading">What should happen?</span>
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className={cn("min-h-24 rounded-md", FIELD_CLASS_NAME)}
            />
          </label>
        </div>
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <label className="flex cursor-pointer items-center gap-(--space-4) font-display text-meta text-text-secondary">
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            {isRecurring ? "Recurring" : "One time"}
          </label>
          <Button onClick={save} disabled={isSaving} className="relative h-(--action-height) rounded-full px-(--space-8) font-display text-meta">
            <span className={cn(isSaving && "invisible")}>Save</span>
            {isSaving && <Spinner className="absolute" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
