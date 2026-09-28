import { ChevronDown, Mic, MicOff, Phone } from "lucide-react"
import type { ChatMessage } from "@/types/chat"
import { ContactAvatar } from "@/components/chat/contactAvatar"
import { Button } from "@/components/ui/button"
import { describeTextedMessage, formatDuration } from "@/helpers/client/message"
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds"

type CallScreenProps = {
  agentName: string
  connectedAt: number | undefined
  isMuted: boolean
  latestText: ChatMessage | undefined
  onMinimize: () => void
  onToggleMute: () => void
  onHangUp: () => void
}

export const CallScreen = ({
  agentName,
  connectedAt,
  isMuted,
  latestText,
  onMinimize,
  onToggleMute,
  onHangUp,
}: CallScreenProps) => {
  const elapsedSeconds = useElapsedSeconds(connectedAt)
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center bg-page px-(--gutter) py-(--space-9)">
      <Button variant="ghost" size="icon" className="self-start rounded-full" aria-label="Minimize call" onClick={onMinimize}>
        <ChevronDown />
      </Button>
      <div className="flex flex-1 flex-col items-center justify-center gap-(--space-4)">
        <ContactAvatar className="size-24" />
        <p className="font-display text-display font-semibold text-text-heading">{agentName}</p>
        <p className="text-body text-success tabular-nums">{formatDuration(elapsedSeconds)}</p>
        {latestText && (
          <button
            type="button"
            onClick={onMinimize}
            className="cursor-pointer mt-(--space-4) max-w-full truncate rounded-full border border-hairline-warm bg-surface px-(--space-7) py-(--space-2) text-meta text-text-heading"
          >
            {describeTextedMessage(latestText.content)}
          </button>
        )}
      </div>
      <div className="flex gap-(--space-12)">
        <Button
          variant="outline"
          size="icon"
          className="size-16 rounded-full"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
        </Button>
        <Button variant="destructive" size="icon" className="size-16 rounded-full" aria-label="Hang up" onClick={onHangUp}>
          <Phone className="size-6 rotate-135" />
        </Button>
      </div>
    </div>
  )
}
