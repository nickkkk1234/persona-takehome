import { RotateCcw } from "lucide-react"
import { resetUser } from "@/app/chat/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const ResetUserButton = ({ className }: { className?: string }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive" size="icon" className={cn("size-11 rounded-full bg-transparent", className)} aria-label="Restart">
        <RotateCcw className="size-5" />
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent className="max-w-xs rounded-lg border-border-hairline">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-display text-row-title font-semibold text-text-heading">
          Are you sure you want to restart?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-meta text-text-tertiary">This will erase your user data.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="h-(--action-height) rounded-full border-hairline-warm bg-surface font-display text-meta text-text-heading shadow-none">
          Cancel
        </AlertDialogCancel>
        <form action={resetUser}>
          <Button
            type="submit"
            variant="destructive"
            className="h-(--action-height) w-full rounded-full font-display text-meta font-semibold"
          >
            Restart
          </Button>
        </form>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)
