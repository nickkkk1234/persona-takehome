import { PersonaMarkIcon } from "@/components/icon"
import { cn } from "@/lib/utils"

export const ContactAvatar = ({ className }: { className?: string }) => (
  <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full border border-border-hairline bg-surface", className)}>
    <PersonaMarkIcon className="size-1/2 text-text-primary" />
  </span>
)
