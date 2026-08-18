import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askDepartmentAssistant } from "@/lib/departmentAi.functions";

const PROMPTS = [
  "Which of our KPIs are red and what should we do about them?",
  "Summarise this department's performance for the leadership meeting.",
  "What tasks are overdue and who should action them?",
  "Draft this month's departmental report.",
  "How is our budget and spend tracking so far?",
  "Suggest priorities for the next 30 days based on our mandate.",
];

/** Advanced chat agent for departments without a specialised operations centre. */
export function DepartmentAssistant({ slug, name }: { slug: string; name: string }) {
  const ask = useServerFn(askDepartmentAssistant);
  return (
    <AgentChat
      key={slug}
      namespace={`dept.${slug}`}
      title={`${name} assistant`}
      description="Grounded in this department's live KPIs, tasks, reports, events, budgets and purchase requests."
      ask={ask as any}
      extra={{ slug }}
      suggestions={PROMPTS}
    />
  );
}
