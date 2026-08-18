import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askKidsAssistant } from "@/lib/kidsAi.functions";

const PROMPTS = [
  "Suggest an age-appropriate lesson plan with scripture for our beginners class.",
  "Which safeguarding risks should we address before Sunday?",
  "How should we schedule volunteers given our current clearances?",
  "Interpret our attendance trend and suggest follow-up actions.",
  "Draft a parent communication summarising this month in kids church.",
  "Which children need discipleship follow-up?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function KidsAssistant() {
  const ask = useServerFn(askKidsAssistant);
  return (
    <AgentChat
      namespace="kids"
      title="Children's ministry assistant"
      description="Lessons, safeguarding, volunteers, attendance and families."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
