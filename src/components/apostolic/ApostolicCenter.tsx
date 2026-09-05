import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApostolicDashboard } from "./ApostolicDashboard";
import { CommandCentre } from "./CommandCentre";
import { VisionModule } from "./VisionModule";
import { FivefoldModule } from "./FivefoldModule";
import { AppointmentsModule } from "./AppointmentsModule";
import { DecisionCentre, ProjectsModule, ExecutiveRiskModule, CommunicationsModule, ExecutiveReports } from "./ExecutiveModules";
import ExecutiveCockpit from "@/components/chairperson/ExecutiveCockpit";
import GovernanceAssistant from "@/components/chairperson/GovernanceAssistant";
import LeadershipFinancialCommand from "@/components/finance/LeadershipFinancialCommand";

const TABS = [
  { key: "dashboard", label: "Executive dashboard" },
  { key: "command", label: "Command centre" },
  { key: "vision", label: "Vision" },
  { key: "fivefold", label: "Fivefold ministry" },
  { key: "appointments", label: "Appointments" },
  { key: "decisions", label: "Decision centre" },
  { key: "financial", label: "Financial command" },
  { key: "projects", label: "Development projects" },
  { key: "governance", label: "Governance & finance" },
  { key: "risks", label: "Risk & crisis" },
  { key: "comms", label: "Communication hub" },
  { key: "reports", label: "Executive reporting" },
  { key: "ai", label: "AI apostolic insights" },
];


export function ApostolicCenter() {
  return (
    <Tabs defaultValue="dashboard" className="mt-8">
      <TabsList className="flex h-auto flex-wrap justify-start gap-1 print:hidden">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="text-xs">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="dashboard" className="mt-6"><ApostolicDashboard /></TabsContent>
      <TabsContent value="command" className="mt-6"><CommandCentre /></TabsContent>
      <TabsContent value="vision" className="mt-6"><VisionModule /></TabsContent>
      <TabsContent value="fivefold" className="mt-6"><FivefoldModule /></TabsContent>
      <TabsContent value="appointments" className="mt-6"><AppointmentsModule /></TabsContent>
      <TabsContent value="decisions" className="mt-6"><DecisionCentre /></TabsContent>
      <TabsContent value="financial" className="mt-6">
        <LeadershipFinancialCommand />
      </TabsContent>

      <TabsContent value="projects" className="mt-6"><ProjectsModule /></TabsContent>
      <TabsContent value="governance" className="mt-6"><ExecutiveCockpit /></TabsContent>
      <TabsContent value="risks" className="mt-6"><ExecutiveRiskModule /></TabsContent>
      <TabsContent value="comms" className="mt-6"><CommunicationsModule /></TabsContent>
      <TabsContent value="reports" className="mt-6"><ExecutiveReports /></TabsContent>
      <TabsContent value="ai" className="mt-6"><GovernanceAssistant /></TabsContent>
    </Tabs>
  );
}
