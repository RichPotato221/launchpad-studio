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
import UshProtocolModule from "@/components/ushers/UshProtocolModule";
import { useIsDepartmentMember } from "@/lib/useIsDepartmentMember";
import { USH_COURSES, USH_RISK_CATEGORIES } from "@/lib/ushering";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SECTIONS = [
  ["dashboard", "Dashboard"],
  ["services", "Service Operations"],
  ["ushering", "Ushering"],
  ["protocol", "Protocol"],
  ["roster", "Duty Roster"],
  ["volunteers", "Volunteers"],
  ["visitors", "Visitor Experience"],
  ["guest-protocol", "Leadership & Guest Protocol"],
  ["analytics", "Attendance & Reports"],
  ["safety", "Safety & Incidents"],
  ["care", "Care & Communications"],
  ["training", "Training"],
  ["risk", "Risk Register"],
  ["assistant", "AI Assistant"],
] as const;

/** Ushering Ministry — Church Operations, Hospitality & Congregational Care Management System. */
export default function UsheringCenter({
  departmentSlug = "ushers",
  currentUserId,
}: { departmentSlug?: string; currentUserId: string }) {
  const membership = useIsDepartmentMember(departmentSlug);
  const canManage = membership.data?.isMember === true;
  const [section, setSection] = useState("dashboard");

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Ushering &amp; Protocol</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One coordinated ministry for welcoming, seating, service readiness, congregation flow, leadership and guest protocol, safety and care.
        </p>
      </header>

      <Tabs value={section} onValueChange={setSection}>
        <div className="md:hidden print:hidden">
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{SECTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <TabsList className="hidden h-auto w-full flex-wrap justify-start md:flex print:hidden">
          {SECTIONS.map(([value, label]) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><UsheringDashboard /></TabsContent>
        <TabsContent value="services" className="mt-6"><UshServicesModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="ushering" className="mt-6"><UshServicesModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="protocol" className="mt-6"><UshProtocolModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="roster" className="mt-6"><UshRosterModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="volunteers" className="mt-6"><UshVolunteersModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="visitors" className="mt-6"><UshVisitorsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="guest-protocol" className="mt-6"><UshProtocolModule canManage={canManage} currentUserId={currentUserId} initialArea="leadership_protocol" /></TabsContent>
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
            title="Ushering & Protocol risk register"
          />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6"><UsheringAssistant /></TabsContent>
      </Tabs>
    </div>
  );
}
