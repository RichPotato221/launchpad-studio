import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";

const MinistryDashboard = lazy(() => import("@/components/pastoral/MinistryDashboard"));
const PastoralCareModule = lazy(() => import("@/components/pastoral/PastoralCareModule"));
const VolunteerModule = lazy(() => import("@/components/pastoral/VolunteerModule"));
const LeadershipAcademy = lazy(() => import("@/components/pastoral/LeadershipAcademy"));
const CoachingModule = lazy(() => import("@/components/pastoral/CoachingModule"));
const MinistryPlanningModule = lazy(() => import("@/components/pastoral/MinistryPlanningModule"));
const GrowthAndKpiCentre = lazy(() => import("@/components/pastoral/GrowthAndKpiCentre"));
const MinistryReports = lazy(() => import("@/components/pastoral/MinistryReports"));
const MinistryAssistant = lazy(() => import("@/components/pastoral/MinistryAssistant"));
const RiskRegisterModule = lazy(() => import("@/components/chairperson/RiskRegisterModule"));

const PASTORAL_ROLES = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

/**
 * The Ministry Operations & Shepherding Command Centre — the Office of the
 * Associate / Lead Pastor, rendered as the workspace of the pastoral departments.
 */
export default function PastoralCenter({ currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const roles = role.data?.roles ?? [];
  const canManage = roles.some((r) => PASTORAL_ROLES.includes(r));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Ministry Operations &amp; Shepherding Command Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The Office of the Associate &amp; Lead Pastors — spiritual health, flock care, volunteer wellbeing,
          leadership development, coaching, planning and succession across every branch of the ministry.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Ministry dashboard</TabsTrigger>
          <TabsTrigger value="care">Pastoral care &amp; prayer</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="academy">Leadership &amp; succession</TabsTrigger>
          <TabsTrigger value="coaching">Coaching &amp; mentorship</TabsTrigger>
          <TabsTrigger value="planning">Ministry planning</TabsTrigger>
          <TabsTrigger value="growth">Growth &amp; KPIs</TabsTrigger>
          <TabsTrigger value="risk">Ministry risk</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6"><MinistryDashboard /></TabsContent>
          <TabsContent value="care" className="mt-6">
            <PastoralCareModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="volunteers" className="mt-6">
            <VolunteerModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="academy" className="mt-6">
            <LeadershipAcademy canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="coaching" className="mt-6">
            <CoachingModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="planning" className="mt-6">
            <MinistryPlanningModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="growth" className="mt-6"><GrowthAndKpiCentre /></TabsContent>
          <TabsContent value="risk" className="mt-6">
            <RiskRegisterModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="reports" className="mt-6"><MinistryReports /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><MinistryAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
