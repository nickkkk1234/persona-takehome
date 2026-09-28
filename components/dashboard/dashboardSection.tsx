import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"

type DashboardSectionProps = { title: string; action?: ReactNode; children: ReactNode }

export const DashboardSection = ({ title, action, children }: DashboardSectionProps) => (
  <section className="flex flex-col gap-(--space-7)">
    <div className="flex items-end justify-between">
      <h2 className="font-serif text-section text-text-primary">{title}</h2>
      {action}
    </div>
    <div className="flex flex-col divide-y divide-border-hairline overflow-hidden rounded-lg border border-border-hairline bg-surface">
      {children}
    </div>
  </section>
)

export const DashboardRow = ({ children }: { children: ReactNode }) => (
  <div className="flex items-center gap-(--space-5) px-(--space-8) py-(--space-7)">{children}</div>
)

export const RowIcon = ({ children }: { children: ReactNode }) => (
  <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-surface-sunken text-text-heading">
    {children}
  </span>
)

export const RowText = ({ title, subtitle }: { title: string; subtitle?: ReactNode }) => (
  <div className="flex min-w-0 flex-1 flex-col">
    <span className="line-clamp-2 font-display text-row font-medium text-text-heading">{title}</span>
    {subtitle && <span className="truncate text-meta text-text-tertiary">{subtitle}</span>}
  </div>
)

export const EmptyRow = ({ text }: { text: string }) => (
  <p className="px-(--space-8) py-(--space-7) text-row text-text-muted">{text}</p>
)

export const ShowMoreButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className="h-auto rounded-none py-(--space-5) font-display text-meta text-text-secondary"
  >
    Show more
  </Button>
)

export const PILL_BUTTON_CLASS_NAME =
  "h-(--action-height) rounded-full border-hairline-warm bg-surface px-(--space-5) font-display text-meta text-text-heading shadow-none"
