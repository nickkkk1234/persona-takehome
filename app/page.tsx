import Link from "next/link";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-page px-(--space-11) sm:px-(--space-12)">
      <header className="flex items-center pt-(--space-11) sm:pt-(--space-12)">
        <Icon className="h-5 text-text-primary sm:h-5" />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center pb-(--space-16) text-center">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.4px] text-text-heading sm:text-display">
          Talk to your Persona
        </h1>
        <p className="mt-(--space-2) text-body text-text-tertiary">Call or text to get started.</p>
        <Button
          asChild
          variant="outline"
          className="mt-(--space-9) h-(--pill-height) rounded-full border-hairline-warm bg-surface px-(--space-8) font-display text-row text-text-heading shadow-none"
        >
          <Link href="/chat">
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
          </Link>
        </Button>
      </section>
    </main>
  );
}
