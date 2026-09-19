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
  "Show outstanding leadership and guest protocol preparations.",
  "Create a protocol checklist for the next special service.",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function UsheringAssistant() {
  const ask = useServerFn(askUsheringAssistant);
  return (
    <AgentChat
      namespace="ushering-protocol"
      title="Ushering & Protocol Assistant"
      description="Service preparation, duty allocation, guest and leadership coordination, safety, training and reporting."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
