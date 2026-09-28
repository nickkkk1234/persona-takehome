"use client"

import { useOptimistic, useState, useTransition } from "react"
import { Clock, Ellipsis, Plus } from "lucide-react"
import type { DashboardTask } from "@/types/dashboard"
import { deleteTask } from "@/app/actions"
import {
  DashboardRow,
  DashboardSection,
  EmptyRow,
  PILL_BUTTON_CLASS_NAME,
  RowIcon,
  RowText,
  ShowMoreButton,
} from "@/components/dashboard/dashboardSection"
import { TaskEditDialog } from "@/components/dashboard/taskEditDialog"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { formatTaskSchedule } from "@/helpers/util/weekday"

const PAGE_SIZE = 3

export const TasksSection = ({ tasks }: { tasks: DashboardTask[] }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [editingTask, setEditingTask] = useState<DashboardTask>()
  const [isCreating, setIsCreating] = useState(false)
  const [visibleTasks, removeTask] = useOptimistic(tasks, (current, removedId: string) =>
    current.filter((task) => task.id !== removedId),
  )
  const [, startTransition] = useTransition()

  const handleDelete = (taskId: string) =>
    startTransition(async () => {
      removeTask(taskId)
      await deleteTask(taskId)
    })

  return (
    <DashboardSection
      title="Tasks"
      action={
        <Button variant="outline" onClick={() => setIsCreating(true)} className={cn(PILL_BUTTON_CLASS_NAME, "gap-1")}>
          Add
          <Plus className="size-3.5" />
        </Button>
      }
    >
      {visibleTasks.length === 0 && <EmptyRow text="No tasks yet." />}
      {visibleTasks.slice(0, visibleCount).map((task) => (
        <DashboardRow key={task.id}>
          <RowIcon>
            <Clock className="size-5" />
          </RowIcon>
          <RowText title={task.title} subtitle={formatTaskSchedule(task)} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="rounded-full text-text-muted" aria-label="Task options">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditingTask(task)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => handleDelete(task.id)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DashboardRow>
      ))}
      {visibleTasks.length > visibleCount && <ShowMoreButton onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)} />}
      {editingTask && <TaskEditDialog key={editingTask.id} task={editingTask} onClose={() => setEditingTask(undefined)} />}
      {isCreating && <TaskEditDialog onClose={() => setIsCreating(false)} />}
    </DashboardSection>
  )
}
