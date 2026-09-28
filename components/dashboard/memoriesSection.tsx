"use client"

import { useOptimistic, useState, useTransition } from "react"
import { ArrowUpRight, BookOpenCheck, Crosshair, Lightbulb, X } from "lucide-react"
import type { DashboardMemory } from "@/types/dashboard"
import { MemoryKind } from "@/lib/generated/prisma/enums"
import { rejectMemory } from "@/app/actions"
import {
  DashboardRow,
  DashboardSection,
  EmptyRow,
  RowIcon,
  RowText,
  ShowMoreButton,
} from "@/components/dashboard/dashboardSection"
import { Button } from "@/components/ui/button"
import { getMemoryKindLabel, getMemorySourceLabel } from "@/helpers/client/memory"

const PAGE_SIZE = 3

const MEMORY_ICONS = {
  [MemoryKind.GOAL]: Crosshair,
  [MemoryKind.INSIGHT]: Lightbulb,
  [MemoryKind.FACT]: BookOpenCheck,
}

export const MemoriesSection = ({ memories }: { memories: DashboardMemory[] }) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [visibleMemories, removeMemory] = useOptimistic(memories, (current, removedId: string) =>
    current.filter((memory) => memory.id !== removedId),
  )
  const [, startTransition] = useTransition()

  const handleReject = (memoryId: string) =>
    startTransition(async () => {
      removeMemory(memoryId)
      await rejectMemory(memoryId)
    })

  return (
    <DashboardSection title="Memories">
      {visibleMemories.length === 0 && <EmptyRow text="Nothing yet." />}
      {visibleMemories.slice(0, visibleCount).map((memory) => {
        const MemoryIcon = MEMORY_ICONS[memory.kind]
        return (
          <DashboardRow key={memory.id}>
            <RowIcon>
              <MemoryIcon className="size-5" />
            </RowIcon>
            <RowText
              title={memory.content}
              subtitle={
                <>
                  {getMemoryKindLabel(memory.kind)} |{" "}
                  {memory.sourceUrl ? (
                    <a
                      href={memory.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-text-heading hover:underline"
                    >
                      {getMemorySourceLabel(memory.evidence)}
                      <ArrowUpRight className="size-3" />
                    </a>
                  ) : (
                    getMemorySourceLabel(memory.evidence)
                  )}
                </>
              }
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full text-text-muted"
              aria-label="Reject"
              onClick={() => handleReject(memory.id)}
            >
              <X />
            </Button>
          </DashboardRow>
        )
      })}
      {visibleMemories.length > visibleCount && (
        <ShowMoreButton onClick={() => setVisibleCount(visibleCount + PAGE_SIZE)} />
      )}
    </DashboardSection>
  )
}
