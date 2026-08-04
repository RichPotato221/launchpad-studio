import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";

const MinistryDashboard = lazy(() => import("@/components/pastoral/MinistryDashboard"));
const ExecutiveOversight = lazy(() => import("@/components/pastoral/ExecutiveOversight"));
const DepartmentReviewCentre = lazy(() => import("@/components/pastoral/DepartmentReviewCentre"));
const PastoralCareModule = lazy(() => import("@/components/pastoral/PastoralCareModule"));
const VolunteerModule = lazy(() => import("@/components/pastoral/VolunteerModule"));
const LeadershipAcademy = lazy(() => import("@/components/pastoral/LeadershipAcademy"));
const CoachingModule = lazy(() => import("@/components/pastoral/CoachingModule"));
const MinistryPlanningModule = lazy(() => import("@/components/pastoral/MinistryPlanningModule"));
const GrowthAndKpiCentre = lazy(() => import("@/components/pastoral/GrowthAndKpiCentre"));
const MinistryReports = lazy(() => import("@/components/pastoral/MinistryReports"));
const MinistryAssistant = lazy(() => import("@/components/pastoral/MinistryAssistant"));
const RiskRegisterModule = lazy(() => import("@/components/chairperson/RiskRegisterModule"));

/** Roles allowed to act (not merely view) inside the pastoral offices. */
const PASTORAL_ROLES = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

/**
 * The two pastoral offices share one shell but NOT one set of duties:
 *
 *  • Office of the Lead / Assistant Pastor — executive oversight of every
 *    ministry, the Associate Pastor & Elder line, department report review,
 *    church-wide health, succession and escalation to the Senior Pastor.
 *  • Office of the Associate Pastor — hands-on operations of the ministries
 *    assigned to them: volunteers, ministry planning, growth & KPI delivery.
 *
 * Shared pastoral disciplines (care, coaching, risk, reports, AI insight) are
 * defined once and reused, so no module is duplicated between the offices.
 */
export default function PastoralCenter({ departmentSlug, currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const roles = role.data?.roles ?? [];
  const canManage = roles.some((r) => PASTORAL_ROLES.includes(r));
  const isLead = departmentSlug === "lead-pastor";

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">
          {isLead ? "Executive Ministry Command Centre" : "Ministry Operations & Shepherding Centre"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLead
            ? "The Office of the Lead / Assistant Pastor — church-wide ministry health, oversight of Associate Pastors and Elders, department report review, leadership development, succession and escalation to the Senior Pastor."
            : "The Office of the Associate Pastor — shepherding and operating the ministries assigned to this office: volunteers, ministry plans, KPI delivery, pastoral care and leader coaching."}
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">{isLead ? "Executive dashboard" : "Ministry dashboard"}</TabsTrigger>
          {isLead && <TabsTrigger value="review">Department review centre</TabsTrigger>}
          <TabsTrigger value="care">Pastoral care &amp; prayer</TabsTrigger>
          {!isLead && <TabsTrigger value="volunteers">Volunteers</TabsTrigger>}
          <TabsTrigger value="academy">Leadership &amp; succession</TabsTrigger>
          <TabsTrigger value="coaching">Coaching &amp; mentorship</TabsTrigger>
          {!isLead && <TabsTrigger value="planning">Ministry planning</TabsTrigger>}
          <TabsTrigger value="growth">Growth &amp; KPIs</TabsTrigger>
          <TabsTrigger value="risk">Ministry risk</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6">
            {isLead ? <ExecutiveOversight /> : <MinistryDashboard />}
          </TabsContent>
          {isLead && (
            <TabsContent value="review" className="mt-6">
              <DepartmentReviewCentre canManage={canManage} currentUserId={currentUserId} />
            </TabsContent>
          )}
          <TabsContent value="care" className="mt-6">
            <PastoralCareModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          {!isLead && (
            <TabsContent value="volunteers" className="mt-6">
              <VolunteerModule canManage={canManage} currentUserId={currentUserId} />
            </TabsContent>
          )}
          <TabsContent value="academy" className="mt-6">
            <LeadershipAcademy canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="coaching" className="mt-6">
            <CoachingModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          {!isLead && (
            <TabsContent value="planning" className="mt-6">
              <MinistryPlanningModule canManage={canManage} currentUserId={currentUserId} />
            </TabsContent>
          )}
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
