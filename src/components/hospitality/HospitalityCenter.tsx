import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HospitalityEventsModule from "@/components/hospitality/HospitalityEventsModule";
import GuestCareModule from "@/components/hospitality/GuestCareModule";
import KitchenModule from "@/components/hospitality/KitchenModule";
import HospitalityInventoryModule from "@/components/hospitality/HospitalityInventoryModule";
import VolunteersTasksModule from "@/components/hospitality/VolunteersTasksModule";
import HospitalityAssistant from "@/components/hospitality/HospitalityAssistant";
import RiskRegisterModule from "@/components/common/RiskRegisterModule";
import TrainingModule from "@/components/common/TrainingModule";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { HOS_COURSES, HOS_RISK_CATEGORIES } from "@/lib/hospitality";

const LEADERS = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

export default function HospitalityCenter({ currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const canManage =
    (role.data?.roles ?? []).some((r) => LEADERS.includes(r)) || role.data?.canViewCheckupWatch === true;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Hospitality Digital Operations Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Event readiness, guest care, kitchen compliance, stock control, volunteers and risk — one operating picture for
          the ministry of welcome.
        </p>
      </header>

      <Tabs defaultValue="events">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="events">Events & readiness</TabsTrigger>
          <TabsTrigger value="guests">Guest care</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen & catering</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="team">Volunteers & tasks</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-6">
          <HospitalityEventsModule canManage={canManage} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="guests" className="mt-6">
          <GuestCareModule canManage={canManage} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="kitchen" className="mt-6">
          <KitchenModule canManage={canManage} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-6">
          <HospitalityInventoryModule canManage={canManage} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="team" className="mt-6">
          <VolunteersTasksModule canManage={canManage} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="training" className="mt-6">
          <TrainingModule
            canManage={canManage}
            currentUserId={currentUserId}
            table="hos_training_records"
            courses={HOS_COURSES}
            title="Hospitality training & competency"
          />
        </TabsContent>
        <TabsContent value="risk" className="mt-6">
          <RiskRegisterModule
            canManage={canManage}
            currentUserId={currentUserId}
            table="hos_risks"
            categories={HOS_RISK_CATEGORIES}
            title="Hospitality risk register"
          />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6">
          <HospitalityAssistant />
        </TabsContent>
      </Tabs>
    </div>
  );
}
