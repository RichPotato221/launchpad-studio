import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askGovernanceAssistant } from "@/lib/governanceAi.functions";

const PROMPTS = [
  "Give me a one-page governance health briefing for the next council meeting.",
  "Which departments are underperforming on KPIs and what should I ask them?",
  "What compliance obligations are overdue or due in the next 30 days?",
  "Summarise our top risks and whether mitigation is adequate.",
  "Which decisions and resolutions are behind schedule, and who owns them?",
  "Draft an agenda for the next Chairperson's executive meeting.",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function GovernanceAssistant() {
  const ask = useServerFn(askGovernanceAssistant);
  return (
    <AgentChat
      namespace="governance"
      title="Governance assistant"
      description="Compliance, decisions, approvals, risk and accountability."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
