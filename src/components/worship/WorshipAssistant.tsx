import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askWorshipAssistant } from "@/lib/worshipAi.functions";

const PROMPTS = [
  "Suggest a worship set for this Sunday that flows from praise into intimacy.",
  "Which songs have we over-used and what should we rotate in?",
  "Draft a rehearsal plan for the upcoming service.",
  "Who on the team is at risk of burnout and how should we rotate the roster?",
  "What technical or equipment risks should we resolve before Sunday?",
  "Summarise our worship ministry health for the pastoral report.",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function WorshipAssistant() {
  const ask = useServerFn(askWorshipAssistant);
  return (
    <AgentChat
      namespace="worship"
      title="Worship & music assistant"
      description="Repertoire, rehearsals, scheduling, training and service planning."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
