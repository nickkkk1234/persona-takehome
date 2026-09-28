import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HOME_PATH } from "@/helpers/util/routes"

export const DashboardCard = () => (
  <div className="flex w-3/4 items-center justify-between gap-(--space-4) rounded-lg border border-hairline-warm bg-surface py-(--space-4) pr-(--space-4) pl-(--space-5)">
    <span className="font-display text-row font-medium text-text-heading">View dashboard</span>
    <Button
      asChild
      variant="outline"
      className="h-(--action-height) rounded-full border-hairline-warm bg-surface px-(--space-5) font-display text-meta text-text-heading shadow-none"
    >
      <Link href={HOME_PATH}>
        Open
        <ArrowUpRight />
      </Link>
    </Button>
  </div>
)
