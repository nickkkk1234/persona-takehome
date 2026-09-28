import { ChevronDown, Mic, MicOff, Phone } from "lucide-react"
import { ContactAvatar } from "@/components/chat/contactAvatar"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/helpers/client/message"
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds"

type CallBarProps = {
  agentName: string
  connectedAt: number | undefined
  isMuted: boolean
  onExpand: () => void
  onToggleMute: () => void
  onHangUp: () => void
}

export const CallBar = ({ agentName, connectedAt, isMuted, onExpand, onToggleMute, onHangUp }: CallBarProps) => {
  const elapsedSeconds = useElapsedSeconds(connectedAt)
  return (
    <div className="group absolute inset-x-(--space-5) top-(--space-4) z-10 flex flex-col items-center">
      <div className="flex w-full items-center gap-(--space-4) rounded-full border border-border-field bg-surface p-(--space-2) shadow-pill">
        <button type="button" onClick={onExpand} className="cursor-pointer flex flex-1 items-center gap-(--space-4) text-left">
          <ContactAvatar className="size-11" />
          <span className="flex flex-col">
            <span className="text-meta text-success tabular-nums">{formatDuration(elapsedSeconds)}</span>
            <span className="font-display text-row-title font-medium text-text-heading">{agentName}</span>
          </span>
        </button>
        <Button
          size="icon"
          className="size-11 rounded-full bg-surface-sunken text-text-heading hover:bg-tile"
          aria-label={isMuted ? "Unmute" : "Mute"}
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="size-11 rounded-full"
          aria-label="Hang up"
          onClick={onHangUp}
        >
          <Phone className="size-5 rotate-135" />
        </Button>
      </div>
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand call"
        className="cursor-pointer mt-(--space-2) flex size-7 -translate-y-1 items-center justify-center rounded-full border border-border-field bg-surface text-text-secondary opacity-0 shadow-pill transition duration-200 ease-standard group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  )
}
