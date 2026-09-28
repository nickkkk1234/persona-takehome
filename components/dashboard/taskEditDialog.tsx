"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import type { DashboardTask } from "@/types/dashboard"
import { updateTask } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { WEEKDAY_INITIALS, WEEKDAYS } from "@/helpers/util/weekday"

type TaskEditDialogProps = {
  task: DashboardTask
  onClose: () => void
}

const FIELD_CLASS_NAME = "border-border-field text-row shadow-none focus-visible:border-border-field focus-visible:ring-0 md:text-row"

export const TaskEditDialog = ({ task, onClose }: TaskEditDialogProps) => {
  const [title, setTitle] = useState(task.title)
  const [time, setTime] = useState(task.time)
  const [days, setDays] = useState(task.days)
  const [details, setDetails] = useState(task.details ?? "")
  const [isSaving, startTransition] = useTransition()

  const toggleDay = (day: DashboardTask["days"][number]) =>
    setDays((current) => (current.includes(day) ? current.filter((selected) => selected !== day) : [...current, day]))

  const save = () =>
    startTransition(async () => {
      try {
        await updateTask(task.id, { title, time, days, details })
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
            className="mr-(--space-9) bg-transparent font-display text-nav font-semibold text-text-heading outline-none"
          />
        </DialogTitle>
        <div className="flex flex-col gap-(--space-7)">
          <Input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            aria-label="Time"
            className={cn("h-(--pill-height) w-auto min-w-40 rounded-full px-(--space-7)", FIELD_CLASS_NAME)}
          />
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
          <label className="mt-(--space-4) flex flex-col gap-(--space-2)">
            <span className="font-display text-row font-medium text-text-heading">What should happen?</span>
            <Textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className={cn("min-h-24 rounded-md", FIELD_CLASS_NAME)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={isSaving} className="relative h-(--action-height) rounded-full px-(--space-8) font-display text-meta">
            <span className={cn(isSaving && "invisible")}>Save</span>
            {isSaving && <Spinner className="absolute" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
