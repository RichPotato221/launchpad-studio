import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askResourceAssistant } from "@/lib/resourcesAi.functions";

const PROMPTS = [
  "Which assets are due for replacement in the next 12 months and what will it cost?",
  "Which equipment is under-used and could be redistributed between branches?",
  "What maintenance is overdue and what is the risk if we delay it further?",
  "Which stock items should we reorder now, and what should we budget?",
  "Which facilities are not ready for Sunday service?",
  "Where are our biggest resource risks and what should we do about them?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function ResourceAssistant() {
  const ask = useServerFn(askResourceAssistant);
  return (
    <AgentChat
      namespace="resources"
      title="Resource assistant"
      description="Assets, maintenance, facilities, stock, bookings and projects."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
