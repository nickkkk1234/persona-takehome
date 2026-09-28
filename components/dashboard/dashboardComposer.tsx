"use client"

import { useRouter } from "next/navigation"
import { Composer } from "@/components/chat/composer"

export const DashboardComposer = ({ agentName }: { agentName: string }) => {
  const router = useRouter()
  return (
    <Composer
      placeholder={`Text ${agentName}`}
      className="w-full border-0 p-0"
      onSend={(text) => router.push(`/chat?${new URLSearchParams({ message: text })}`)}
    />
  )
}
