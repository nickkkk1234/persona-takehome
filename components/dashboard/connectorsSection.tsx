"use client"

import { useOptimistic, useTransition } from "react"
import Image from "next/image"
import { Ellipsis } from "lucide-react"
import type { DashboardConnection } from "@/types/dashboard"
import { disconnectGoogle } from "@/app/actions"
import { DashboardSection, PILL_BUTTON_CLASS_NAME, RowIcon, RowText } from "@/components/dashboard/dashboardSection"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { HOME_PATH, GOOGLE_CONNECT_PATH } from "@/helpers/util/routes"

export const ConnectorsSection = ({ connections }: { connections: DashboardConnection[] }) => {
  const [visibleConnections, removeConnection] = useOptimistic(connections, (current, removedId: string) =>
    current.filter((connection) => connection.id !== removedId),
  )
  const [, startTransition] = useTransition()

  const handleDisconnect = (connectionId: string) =>
    startTransition(async () => {
      removeConnection(connectionId)
      await disconnectGoogle(connectionId)
    })

  return (
    <DashboardSection title="Connectors">
      <div className="flex flex-col gap-(--space-5) px-(--space-8) py-(--space-7)">
        <div className="flex items-center gap-(--space-5)">
          <RowIcon>
            <Image src="/google.png" alt="" width={22} height={22} />
          </RowIcon>
          <RowText title="Google Workspace" />
          <Button asChild variant="outline" className={PILL_BUTTON_CLASS_NAME}>
            <a href={`${GOOGLE_CONNECT_PATH}?returnTo=${HOME_PATH}`}>Add account</a>
          </Button>
        </div>
        {visibleConnections.map((connection) => (
          <div key={connection.id} className="flex items-center gap-(--space-4) pl-(--space-2)">
            <span className="min-w-0 flex-1 truncate text-row text-text-heading">{connection.email}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="rounded-full text-text-muted" aria-label="Account options">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => handleDisconnect(connection.id)}>
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </DashboardSection>
  )
}
