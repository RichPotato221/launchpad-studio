import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askPrayerAssistant } from "@/lib/prayerAi.functions";

const PROMPTS = [
  "Which prayer requests need urgent attention this week?",
  "Where are the gaps in our current prayer chain and how should we fill them?",
  "Give me scripture-based prayer points for our open requests.",
  "Summarise the answered prayers and testimonies for the leadership report.",
  "Which intercessors are at risk of burnout?",
  "Draft a plan for our next corporate fast.",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function PrayerAssistant() {
  const ask = useServerFn(askPrayerAssistant);
  return (
    <AgentChat
      namespace="prayer"
      title="Prayer assistant"
      description="Requests, chains, fasting, intercessors and testimonies."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
