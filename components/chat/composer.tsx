import { useState, type FormEvent, type KeyboardEvent } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useAutoResize } from "@/hooks/useAutoResize"

type ComposerProps = {
  initialText?: string
  placeholder: string
  className?: string
  onSend: (text: string) => void
}

export const Composer = ({ initialText = "", placeholder, className, onSend }: ComposerProps) => {
  const [text, setText] = useState(initialText)
  const textareaRef = useAutoResize(text)
  const hasText = text.trim().length > 0

  const send = () => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onSend(trimmed)
    setText("")
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    send()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-(--space-2) border-t border-border-hairline px-(--space-5) py-(--space-4)",
        className,
      )}
    >
      <div className="relative flex-1">
        <Textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Message"
          className={cn(
            "max-h-32 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-9 resize-none rounded-lg border-border-field px-(--space-7) py-2 text-row leading-5 shadow-none field-sizing-fixed focus-visible:border-border-field focus-visible:ring-0",
            hasText && "pr-12 sm:pr-(--space-7)",
          )}
        />
        {hasText && (
          <Button
            type="submit"
            aria-label="Send"
            className="absolute right-1.5 bottom-1.5 h-6 w-8 rounded-full p-0 sm:hidden"
          >
            <ArrowUp className="size-3.5" />
          </Button>
        )}
      </div>
    </form>
  )
}
