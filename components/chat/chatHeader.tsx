import { Phone } from "lucide-react"
import type { CallStatus } from "@/types/chat"
import { ContactAvatar } from "@/components/chat/contactAvatar"
import { ResetUserButton } from "@/components/chat/resetUserButton"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type ChatHeaderProps = {
  agentName: string
  callStatus: CallStatus
  onStartCall: () => void
}

export const ChatHeader = ({ agentName, callStatus, onStartCall }: ChatHeaderProps) => (
  <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-border-hairline px-(--space-5) py-(--space-4)">
    <div className="flex pl-(--space-4)">
      <ResetUserButton className="sm:hidden" />
    </div>
    <div className="flex flex-col items-center gap-(--space-2)">
      <ContactAvatar />
      <span className="font-display text-row-title font-semibold text-text-heading">{agentName}</span>
    </div>
    <div className="flex justify-end pr-(--space-4)">
      {callStatus !== "active" && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 rounded-full border border-border-button"
          aria-label="Call"
          disabled={callStatus === "connecting"}
          onClick={onStartCall}
        >
          {callStatus === "connecting" ? <Spinner className="size-5" /> : <Phone className="size-5" />}
        </Button>
      )}
    </div>
  </header>
)
