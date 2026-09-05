import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";

const ExecutiveCockpit = lazy(() => import("@/components/chairperson/ExecutiveCockpit"));
const DepartmentOversight = lazy(() => import("@/components/chairperson/DepartmentOversight"));
const DecisionsModule = lazy(() => import("@/components/chairperson/DecisionsModule"));
const RiskRegisterModule = lazy(() => import("@/components/chairperson/RiskRegisterModule"));
const ExecutiveApprovalsModule = lazy(() => import("@/components/chairperson/ExecutiveApprovalsModule"));
const GovernanceReports = lazy(() => import("@/components/chairperson/GovernanceReports"));
const ComplianceCentre = lazy(() => import("@/components/chairperson/ComplianceCentre"));
const CommunicationsCentre = lazy(() => import("@/components/chairperson/CommunicationsCentre"));
const AccountabilityTracker = lazy(() => import("@/components/chairperson/AccountabilityTracker"));
const LeadershipFinancialCommand = lazy(() => import("@/components/finance/LeadershipFinancialCommand"));
const GovernanceAssistant = lazy(() => import("@/components/chairperson/GovernanceAssistant"));

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

/**
 * The Executive Governance Command Centre — the Office of the Chairperson,
 * rendered inside the Chairperson department portal as its workspace.
 */
export default function ChairpersonCenter({ currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const roles = role.data?.roles ?? [];
  const canManage = roles.some((r) => LEADERSHIP.includes(r));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Executive Governance Command Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The Office of the Chairperson — a single source of truth for governance, departmental performance,
          decisions, risk, compliance and executive reporting across every branch and office of the ministry.
        </p>
      </header>

      <Tabs defaultValue="cockpit">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="cockpit">Executive cockpit</TabsTrigger>
          <TabsTrigger value="oversight">Department oversight</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & statutory</TabsTrigger>
          <TabsTrigger value="accountability">Accountability tracker</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="financial">Financial command</TabsTrigger>
          <TabsTrigger value="approvals">Executive approvals</TabsTrigger>
          <TabsTrigger value="reports">Reporting & analytics</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="cockpit" className="mt-6"><ExecutiveCockpit /></TabsContent>
          <TabsContent value="oversight" className="mt-6"><DepartmentOversight /></TabsContent>
          <TabsContent value="decisions" className="mt-6">
            <DecisionsModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="risk" className="mt-6">
            <RiskRegisterModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="compliance" className="mt-6">
            <ComplianceCentre canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="accountability" className="mt-6"><AccountabilityTracker /></TabsContent>
          <TabsContent value="communications" className="mt-6">
            <CommunicationsCentre canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="financial" className="mt-6"><LeadershipFinancialCommand /></TabsContent>
          <TabsContent value="approvals" className="mt-6">
            <ExecutiveApprovalsModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="reports" className="mt-6"><GovernanceReports /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><GovernanceAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
