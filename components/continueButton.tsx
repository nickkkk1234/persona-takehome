"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export const ContinueButton = () => {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="relative h-(--pill-height) rounded-full border-hairline-warm bg-surface px-(--space-8) font-display text-row text-text-heading shadow-none disabled:opacity-100"
    >
      <span className={cn("inline-flex items-center gap-2", pending && "invisible")}>
        Continue
        <svg className="size-4.5" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M3.5 9h11m0 0-4.2-4.2M14.5 9l-4.2 4.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {pending && <Spinner className="absolute size-4.5" />}
    </Button>
  )
}
