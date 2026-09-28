import { startSession } from "@/app/actions"
import { Icon } from "@/components/icon"
import { ContinueButton } from "@/components/continueButton"

export const Lander = () => (
  <main className="flex min-h-dvh flex-col bg-page px-(--space-11) sm:px-(--space-12)">
    <header className="flex items-center pt-(--space-11) sm:pt-(--space-12)">
      <Icon className="h-5 text-text-primary sm:h-5" />
    </header>
    <section className="flex flex-1 flex-col items-center justify-center pb-(--space-16) text-center">
      <h1 className="font-display text-display font-semibold text-text-heading">
        Talk to your Persona
      </h1>
      <p className="mt-(--space-2) text-body text-text-tertiary">Call or text to get started.</p>
      <form action={startSession} className="mt-(--space-9)">
        <ContinueButton />
      </form>
    </section>
  </main>
)
