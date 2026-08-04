import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MediaDashboard from "@/components/media/MediaDashboard";
import MedRequestsModule from "@/components/media/MedRequestsModule";
import MedProductionModule from "@/components/media/MedProductionModule";
import MedSocialModule from "@/components/media/MedSocialModule";
import MedLivestreamModule from "@/components/media/MedLivestreamModule";
import MedArchiveModule from "@/components/media/MedArchiveModule";
import MedTeamModule from "@/components/media/MedTeamModule";
import MedAnalyticsModule from "@/components/media/MedAnalyticsModule";
import MediaAssistant from "@/components/media/MediaAssistant";
import MediaWorkspace from "@/components/workspaces/MediaWorkspace";
import RiskRegisterModule from "@/components/common/RiskRegisterModule";
import TrainingModule from "@/components/common/TrainingModule";
import { useIsDepartmentMember } from "@/lib/useIsDepartmentMember";
import { MED_COURSES, MED_RISK_CATEGORIES } from "@/lib/media";

/** Media Team — Kingdom Media Operations Centre. */
export default function MediaCenter({
  departmentSlug = "media",
  currentUserId,
}: { departmentSlug?: string; currentUserId: string }) {
  const membership = useIsDepartmentMember(departmentSlug);
  const canManage = membership.data?.isMember === true;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Kingdom Media Operations Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Department requests, content production, social calendars, livestreams, archive and brand governance,
          analytics, team development, training and risk — one operating picture for the storytelling ministry.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="requests">Department requests</TabsTrigger>
          <TabsTrigger value="production">Content production</TabsTrigger>
          <TabsTrigger value="social">Social & campaigns</TabsTrigger>
          <TabsTrigger value="livestream">Livestream</TabsTrigger>
          <TabsTrigger value="archive">Archive & brand</TabsTrigger>
          <TabsTrigger value="editorial">Editorial calendar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & reports</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6"><MediaDashboard /></TabsContent>
        <TabsContent value="requests" className="mt-6"><MedRequestsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="production" className="mt-6"><MedProductionModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="social" className="mt-6"><MedSocialModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="livestream" className="mt-6"><MedLivestreamModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="archive" className="mt-6"><MedArchiveModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="editorial" className="mt-6">
          <MediaWorkspace departmentSlug={departmentSlug} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-6"><MedAnalyticsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="team" className="mt-6"><MedTeamModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
        <TabsContent value="training" className="mt-6">
          <TrainingModule
            canManage={canManage}
            courseTable="med_courses"
            recordTable="med_training_records"
            members={[]}
            seedCourses={MED_COURSES}
          />
        </TabsContent>
        <TabsContent value="risk" className="mt-6">
          <RiskRegisterModule
            canManage={canManage}
            currentUserId={currentUserId}
            table="med_risks"
            categories={[...MED_RISK_CATEGORIES]}
            title="Media risk register"
          />
        </TabsContent>
        <TabsContent value="assistant" className="mt-6"><MediaAssistant /></TabsContent>
      </Tabs>
    </div>
  );
}
