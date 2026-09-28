import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HOME_PATH } from "@/helpers/util/routes"

export const HomeButton = ({ className }: { className?: string }) => (
  <Button
    asChild
    variant="outline"
    className={cn(
      "h-(--action-height) rounded-full border-hairline-warm bg-surface px-(--space-5) font-display text-meta text-text-heading shadow-none",
      className,
    )}
  >
    <Link href={HOME_PATH}>
      Home
      <ArrowRight />
    </Link>
  </Button>
)
