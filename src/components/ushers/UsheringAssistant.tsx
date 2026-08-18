import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askUsheringAssistant } from "@/lib/usheringAi.functions";

const PROMPTS = [
  "Which duties are uncovered for the next service and who should we assign?",
  "Which first-time visitors have not been followed up yet?",
  "What do our incident records suggest we should improve on safety?",
  "Which ushers are over-serving and at risk of burnout?",
  "Summarise attendance and seating pressure over recent services.",
  "Which volunteers have training or certifications that need refreshing?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function UsheringAssistant() {
  const ask = useServerFn(askUsheringAssistant);
  return (
    <AgentChat
      namespace="ushering"
      title="Ushering assistant"
      description="Rosters, services, visitors, incidents and care."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
