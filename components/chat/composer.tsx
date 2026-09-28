import { useState, type FormEvent } from "react"
import { ArrowUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ComposerProps = {
  initialText?: string
  onSend: (text: string) => void
}

export const Composer = ({ initialText = "", onSend }: ComposerProps) => {
  const [text, setText] = useState(initialText)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) return
    onSend(trimmed)
    setText("")
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-(--space-2) border-t border-border-hairline px-(--space-5) py-(--space-4)"
    >
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Text Persona"
        aria-label="Message"
        className="h-9 rounded-full border-border-field px-(--space-7) text-row shadow-none focus-visible:border-border-field focus-visible:ring-0 md:text-row"
      />
      <Button type="submit" size="icon" className="shrink-0 rounded-full" aria-label="Send" disabled={text.trim().length === 0}>
        <ArrowUp />
      </Button>
    </form>
  )
}
