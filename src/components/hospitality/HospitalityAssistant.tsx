import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askHospitalityAssistant } from "@/lib/hospitalityAi.functions";

const PROMPTS = [
  "How much coffee, tea and snacks do we need for Sunday's expected attendance?",
  "Which stock items are low or expiring and must be reordered now?",
  "Is our next event ready? List what is still outstanding.",
  "Which first-time guests still need follow-up?",
  "Roster our volunteers for the next event and flag anyone overloaded.",
  "Draft a hospitality report for the leadership meeting.",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function HospitalityAssistant() {
  const ask = useServerFn(askHospitalityAssistant);
  return (
    <AgentChat
      namespace="hospitality"
      title="Hospitality assistant"
      description="Guests, kitchen, events, inventory and volunteers."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
