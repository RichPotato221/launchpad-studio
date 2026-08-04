import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsheringDashboard from "@/components/ushers/UsheringDashboard";
import UshServicesModule from "@/components/ushers/UshServicesModule";
import UshVolunteersModule from "@/components/ushers/UshVolunteersModule";
import UshRosterModule from "@/components/ushers/UshRosterModule";
import UshVisitorsModule from "@/components/ushers/UshVisitorsModule";
import UshAnalyticsModule from "@/components/ushers/UshAnalyticsModule";
import UshIncidentsModule from "@/components/ushers/UshIncidentsModule";
import UshCareModule from "@/components/ushers/UshCareModule";
import UsheringAssistant from "@/components/ushers/UsheringAssistant";
import RiskRegisterModule from "@/components/common/RiskRegisterModule";
import TrainingModule from "@/components/common/TrainingModule";
import { useIsDepartmentMember } from "@/lib/useIsDepartmentMember";
import { USH_COURSES, USH_RISK_CATEGORIES } from "@/lib/ushering";

/** Ushering Ministry — Church Operations, Hospitality & Congregational Care Management System. */
export default function UsheringCenter({
  departmentSlug = "ushers",
  currentUserId,
}: { departmentSlug?: string; currentUserId: string }) {
  const membership = useIsDepartmentMember(departmentSlug);
  const canManage = membership.data?.isMember === true;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Church Operations, Hospitality & Congregational Care</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Service readiness, duty rosters, visitor experience, seating and crowd flow, safety, care, training and risk —
          one operating picture for the ministry of the door.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="services">Service operations</TabsTrigger>
          <TabsTrigger value="roster">Duty roster</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
          <TabsTrigger value="visitors">Visitor experience</TabsTrigger>
          <TabsTrigger value="analytics">Attendance & reports</TabsTrigger>
          <TabsTrigger value="safety">Safety & incidents</TabsTrigger>
          <TabsTrigger value="care">Care & communications</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><UsheringDashboard /></TabsContent>
        <TabsContent value="services" className="mt-6"><UshServicesModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="roster" className="mt-6"><UshRosterModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="volunteers" className="mt-6"><UshVolunteersModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="visitors" className="mt-6"><UshVisitorsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="analytics" className="mt-6"><UshAnalyticsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="safety" className="mt-6"><UshIncidentsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="care" className="mt-6"><UshCareModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="training" className="mt-6">
          <TrainingModule
            canManage={canManage}
            courseTable="ush_courses"
            recordTable="ush_training_records"
            members={[]}
            seedCourses={USH_COURSES}
          />
        </TabsContent>
        <TabsContent value="risk" className="mt-6">
          <RiskRegisterModule
            canManage={canManage}
            currentUserId={currentUserId}
            table="ush_risks"
            categories={[...USH_RISK_CATEGORIES]}
            title="Ushering risk register"
          />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6"><UsheringAssistant /></TabsContent>
      </Tabs>
    </div>
  );
}
