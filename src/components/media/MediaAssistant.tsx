import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askMediaAssistant } from "@/lib/mediaAi.functions";

const PROMPTS = [
  "Which department requests are overdue or at risk of missing their deadline?",
  "Where is our production pipeline bottlenecked right now?",
  "Draft a week of social captions from our scheduled posts.",
  "How are our platforms growing and where should we focus?",
  "What technical issues keep recurring in our livestreams?",
  "Which media volunteers need training or are over-committed?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function MediaAssistant() {
  const ask = useServerFn(askMediaAssistant);
  return (
    <AgentChat
      namespace="media"
      title="Media team assistant"
      description="Production, livestream, archive, social and analytics."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
