import { useServerFn } from "@tanstack/react-start";
import AgentChat from "@/components/ai/AgentChat";
import { askMinistryTeamAssistant } from "@/lib/ministryTeamAi.functions";
import { TEAM_CONFIG, type TeamKey } from "@/lib/ministryTeams";

const PROMPTS = [
  "Who needs pastoral follow-up this week and why?",
  "Draft this month's ministry report for leadership.",
  "Which members are ready for the leadership pipeline?",
  "Suggest mentors for members without one, based on the data.",
  "Plan a four-week Bible study series for our small groups.",
  "Where are our biggest volunteer and training gaps?",
];

/** Advanced chat agent for the ministry team workspace. */
export default function TeamAssistant({ team }: { team: TeamKey }) {
  const ask = useServerFn(askMinistryTeamAssistant);
  return (
    <AgentChat
      key={team}
      namespace={`team.${team}`}
      title={`${TEAM_CONFIG[team].label} assistant`}
      description="Grounded in this department's live data. Confidential prayer requests and pastoral notes are never shared with the model."
      ask={ask as any}
      extra={{ team }}
      suggestions={PROMPTS}
    />
  );
}
