import Link from "next/link"
import { PersonaMarkIcon } from "@/components/icon"
import { Button } from "@/components/ui/button"

export const ChatButton = () => (
  <Button
    asChild
    variant="outline"
    className="fixed right-(--space-11) bottom-(--space-8) h-(--pill-height) rounded-full border-hairline-warm bg-surface px-(--space-8) font-display text-row text-text-heading shadow-menu"
  >
    <Link href="/chat">
      <PersonaMarkIcon className="size-4.5" />
      Chat
    </Link>
  </Button>
)
