import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askMinistryAssistant } from "@/lib/ministryAi.functions";

const PROMPTS = [
  "Which departments are struggling and what pastoral intervention do you recommend?",
  "Who is ready for promotion into leadership, and who still needs training?",
  "Which volunteers are at risk of burnout and how should we rotate them?",
  "Summarise the pastoral care load and any follow-ups that are overdue.",
  "Draft next quarter's ministry objectives based on our current performance.",
  "Where are the gaps in our succession pipeline?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function MinistryAssistant() {
  const ask = useServerFn(askMinistryAssistant);
  return (
    <AgentChat
      namespace="pastoral"
      title="Pastoral oversight assistant"
      description="Cases, care follow-up, leader health and shepherding reports."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
