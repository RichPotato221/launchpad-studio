import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askStrategyAssistant } from "@/lib/strategyAi.functions";

const PROMPTS = [
  "How far are we from completing the vision, and what is blocking us?",
  "Which strategic objectives are off track and what should we do this quarter?",
  "Review our project portfolio and flag the projects at risk of failing.",
  "Draft a board-ready strategy update for the next leadership meeting.",
  "Where is our biggest strategic risk and what mitigation do you recommend?",
  "Which departments are least aligned to the strategic plan?",
];

/** Advanced chat agent for this ministry — threaded, data-grounded, able to act. */
export default function StrategyAssistant() {
  const ask = useServerFn(askStrategyAssistant);
  return (
    <AgentChat
      namespace="strategy"
      title="Strategy office assistant"
      description="Objectives, scorecards, portfolio, risk and decisions."
      ask={ask as any}
      suggestions={PROMPTS}
    />
  );
}
