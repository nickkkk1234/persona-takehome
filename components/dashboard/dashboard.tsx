import { after } from "next/server"
import { db } from "@/lib/db"
import { MemoryStatus } from "@/lib/generated/prisma/enums"
import { Icon } from "@/components/icon"
import { ResetUserButton } from "@/components/chat/resetUserButton"
import { AgentHighlight } from "@/components/dashboard/agentHighlight"
import { ChatButton } from "@/components/dashboard/chatButton"
import { ConnectorsSection } from "@/components/dashboard/connectorsSection"
import { MemoriesSection } from "@/components/dashboard/memoriesSection"
import { ProfileSection } from "@/components/dashboard/profileSection"
import { TasksSection } from "@/components/dashboard/tasksSection"
import { DEFAULT_AGENT_NAME } from "@/helpers/api/agent/prompt"
import { refreshHighlightSafely } from "@/helpers/api/highlight"

export const Dashboard = async ({ userId }: { userId: string }) => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      tasks: { orderBy: { time: "asc" } },
      memories: { where: { status: MemoryStatus.ACCEPTED }, orderBy: { createdAt: "desc" } },
      googleConnections: { orderBy: { createdAt: "asc" } },
    },
  })
  if (!user.highlightUpdatedAt) after(() => refreshHighlightSafely(userId))

  return (
    <main className="min-h-dvh bg-page px-(--space-11) pb-32 sm:px-(--space-12)">
      <header className="flex items-center pt-(--space-11) sm:pt-(--space-12)">
        <Icon className="h-5 text-text-primary sm:h-5" />
      </header>
      <div className="mx-auto flex max-w-2xl flex-col gap-(--space-12) pt-(--space-12)">
        <AgentHighlight agentName={user.agentName ?? DEFAULT_AGENT_NAME} userName={user.userName} highlight={user.highlight} />
        <ProfileSection userName={user.userName} agentName={user.agentName} />
        <ConnectorsSection
          connections={user.googleConnections.map((connection) => ({ id: connection.id, email: connection.email }))}
        />
        <TasksSection
          tasks={user.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            time: task.time,
            date: task.date,
            days: task.days,
            details: task.details,
          }))}
        />
        <MemoriesSection
          memories={user.memories.map((memory) => ({
            id: memory.id,
            kind: memory.kind,
            content: memory.content,
            evidence: memory.evidence,
            sourceUrl: memory.sourceUrl,
          }))}
        />
      </div>
      <ResetUserButton className="fixed bottom-(--space-8) left-(--space-11)" />
      <ChatButton />
    </main>
  )
}

