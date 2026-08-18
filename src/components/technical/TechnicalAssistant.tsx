import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askTechnicalAssistant } from "@/lib/technicalAi.functions";

const PROMPTS = [
  "What must we complete before Sunday's service is technically ready?",
  "Our livestream keeps buffering — walk me through the likely causes from our data.",
  "Which assets should be replaced or serviced in the next quarter?",
  "Where are our crew skills gaps and what training plan do you recommend?",
  "Draft a technical operations report for the leadership meeting.",
  "What spares and consumables should we reorder now?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function TechnicalAssistant() {
  const ask = useServerFn(askTechnicalAssistant);
  return (
    <AgentChat
      namespace="technical"
      title="Sound & technical assistant"
      description="Productions, assets, faults, maintenance and streaming."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
