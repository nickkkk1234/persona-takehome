import Image from "next/image"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { openInGooglePopup } from "@/helpers/client/google"
import { GOOGLE_CONNECT_PATH, GOOGLE_CONNECTED_PATH } from "@/helpers/util/routes"

const BUTTON_CLASS_NAME =
  "h-(--action-height) w-full rounded-full border-hairline-warm bg-surface font-display text-meta text-text-heading shadow-none"

export const GoogleConnectCard = ({ isConnected }: { isConnected: boolean }) => (
  <div className="flex w-3/4 flex-col gap-(--space-4) rounded-lg border border-hairline-warm bg-surface p-(--space-5)">
    <div className="flex items-center gap-(--space-4)">
      <Image src="/google.png" alt="" width={20} height={20} className="shrink-0" />
      <span className="font-display text-row font-medium whitespace-nowrap text-text-heading">Connect Google account</span>
    </div>
    {isConnected ? (
      <Button variant="outline" disabled className={cn(BUTTON_CLASS_NAME, "bg-surface-sunken text-text-muted")}>
        Connected
      </Button>
    ) : (
      <Button asChild variant="outline" className={BUTTON_CLASS_NAME}>
        <a href={`${GOOGLE_CONNECT_PATH}?returnTo=${GOOGLE_CONNECTED_PATH}`} target="_blank" rel="noreferrer" onClick={openInGooglePopup}>
          Connect
          <ArrowUpRight />
        </a>
      </Button>
    )}
  </div>
)
