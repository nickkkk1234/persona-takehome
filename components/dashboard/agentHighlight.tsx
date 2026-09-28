import { ContactAvatar } from "@/components/chat/contactAvatar"
import { DashboardComposer } from "@/components/dashboard/dashboardComposer"

type AgentHighlightProps = { agentName: string; userName: string | null; highlight: string | null }

export const AgentHighlight = ({ agentName, userName, highlight }: AgentHighlightProps) => (
  <section className="flex flex-col gap-(--space-7)">
    <div className="flex items-start gap-(--space-4)">
      <ContactAvatar className="size-10" />
      <p className="pt-(--space-2) text-body whitespace-pre-line text-text-primary">
        {highlight ?? `Nothing new for you${userName ? ` ${userName}` : ""}. Text or call me anytime!`}
      </p>
    </div>
    <DashboardComposer agentName={agentName} />
  </section>
)
