import { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { PRAYER_COURSES, PRAYER_RISK_CATEGORIES } from "@/lib/intercession";

const PrayerDashboard = lazy(() => import("@/components/prayer/PrayerDashboard"));
const PrayerRequestsModule = lazy(() => import("@/components/prayer/PrayerRequestsModule"));
const PrayerChainsModule = lazy(() => import("@/components/prayer/PrayerChainsModule"));
const PrayerMeetingsModule = lazy(() => import("@/components/prayer/PrayerMeetingsModule"));
const FastingModule = lazy(() => import("@/components/prayer/FastingModule"));
const PrayerJournalModule = lazy(() => import("@/components/prayer/PrayerJournalModule"));
const IntercessorTeamModule = lazy(() => import("@/components/prayer/IntercessorTeamModule"));
const RiskRegisterModule = lazy(() => import("@/components/common/RiskRegisterModule"));
const TrainingModule = lazy(() => import("@/components/common/TrainingModule"));
const PrayerAssistant = lazy(() => import("@/components/prayer/PrayerAssistant"));
const PrayerReportsModule = lazy(() => import("@/components/prayer/PrayerReportsModule"));

const sb = supabase as any;

const PRAYER_LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

const Loading = () => <Card className="p-10 text-center text-sm text-muted-foreground">Loading module…</Card>;

/**
 * Intercession Department Digital Operations Centre — prayer requests, 24/7 chains,
 * meetings, fasting, journals, team, training, risk, reporting and an AI assistant.
 */
export default function PrayerCenter({ currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const [profile, setProfile] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUserId) return;
    sb.from("profiles").select("full_name, primary_department").eq("id", currentUserId).maybeSingle()
      .then(({ data }: any) => setProfile(data ?? null));
  }, [currentUserId]);

  const loadTeam = () => {
    sb.from("int_team_members").select("*").order("full_name").then(({ data }: any) => setTeam(data ?? []));
  };
  useEffect(loadTeam, []);

  const roles = role.data?.roles ?? [];
  const isLeadership = roles.some((r) => PRAYER_LEADERSHIP.includes(r));
  const isDeptMember = ["prayer-intercession", "intercession", "prayer"].includes(profile?.primary_department ?? "");
  const canManage = isLeadership || isDeptMember;
  const currentUserName = profile?.full_name ?? "Member";

  const trainingMembers = team.map((t) => ({ id: t.user_id ?? null, name: t.full_name as string }));

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Intercession Digital Operations Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “The effectual fervent prayer of a righteous man availeth much.” — James 5:16. Every prayer request is numbered,
          triaged, prayed over and followed up until it is answered. Confidential requests stay with prayer leadership only.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Prayer command</TabsTrigger>
          <TabsTrigger value="requests">Prayer requests</TabsTrigger>
          <TabsTrigger value="chains">24/7 prayer chains</TabsTrigger>
          <TabsTrigger value="meetings">Meetings & calendar</TabsTrigger>
          <TabsTrigger value="fasting">Fasting programmes</TabsTrigger>
          <TabsTrigger value="journal">Spiritual journal</TabsTrigger>
          <TabsTrigger value="team">Intercessor team</TabsTrigger>
          <TabsTrigger value="training">Training & competency</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Loading />}>
          <TabsContent value="dashboard" className="mt-6"><PrayerDashboard /></TabsContent>
          <TabsContent value="requests" className="mt-6">
            <PrayerRequestsModule canManage={canManage} isLeadership={isLeadership} currentUserId={currentUserId} team={team} />
          </TabsContent>
          <TabsContent value="chains" className="mt-6">
            <PrayerChainsModule canManage={canManage} currentUserId={currentUserId} team={team} />
          </TabsContent>
          <TabsContent value="meetings" className="mt-6">
            <PrayerMeetingsModule canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="fasting" className="mt-6">
            <FastingModule canManage={canManage} currentUserId={currentUserId} currentUserName={currentUserName} />
          </TabsContent>
          <TabsContent value="journal" className="mt-6">
            <PrayerJournalModule currentUserId={currentUserId} isLeadership={isLeadership} />
          </TabsContent>
          <TabsContent value="team" className="mt-6">
            <IntercessorTeamModule canManage={canManage} onChanged={loadTeam} />
          </TabsContent>
          <TabsContent value="training" className="mt-6">
            <TrainingModule
              courseTable="int_courses"
              recordTable="int_training_records"
              members={trainingMembers}
              seedCourses={PRAYER_COURSES}
              canManage={canManage}
            />
          </TabsContent>
          <TabsContent value="risk" className="mt-6">
            <RiskRegisterModule
              table="int_risks"
              categories={PRAYER_RISK_CATEGORIES}
              canManage={canManage}
              currentUserId={currentUserId}
              title="Intercession risk register"
            />
          </TabsContent>
          <TabsContent value="assistant" className="mt-6"><PrayerAssistant /></TabsContent>
          <TabsContent value="reports" className="mt-6"><PrayerReportsModule /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
