import { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { TEAM_CONFIG, teamFromSlug } from "@/lib/ministryTeams";

const TeamDashboard = lazy(() => import("@/components/teams/TeamDashboard"));
const TeamMembersModule = lazy(() => import("@/components/teams/TeamMembersModule"));
const TeamGroupsMentorshipModule = lazy(() => import("@/components/teams/TeamGroupsMentorshipModule"));
const TeamEventsModule = lazy(() => import("@/components/teams/TeamEventsModule"));
const TeamOutreachPrayerModule = lazy(() => import("@/components/teams/TeamOutreachPrayerModule"));
const TeamTasksModule = lazy(() => import("@/components/teams/TeamTasksModule"));
const TeamRiskTrainingModule = lazy(() => import("@/components/teams/TeamRiskTrainingModule"));
const TeamReportsModule = lazy(() => import("@/components/teams/TeamReportsModule"));
const TeamAssistant = lazy(() => import("@/components/teams/TeamAssistant"));

const sb = supabase as any;

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

const Loading = () => <Card className="p-10 text-center text-sm text-muted-foreground">Loading module…</Card>;

/**
 * Shared operations centre for the Youth, Women's and Men's ministry teams —
 * membership, discipleship pathway, small groups, mentorship, events, outreach,
 * prayer, tasks, risk, training, KPIs, reporting and an AI assistant.
 */
export default function MinistryTeamCenter({
  departmentSlug,
  currentUserId,
}: {
  departmentSlug: string;
  currentUserId: string;
}) {
  const team = teamFromSlug(departmentSlug);
  const cfg = TEAM_CONFIG[team];
  const role = useCurrentRole();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!currentUserId) return;
    sb.from("profiles").select("full_name, primary_department").eq("id", currentUserId).maybeSingle()
      .then(({ data }: any) => setProfile(data ?? null));
  }, [currentUserId]);

  const roles = role.data?.roles ?? [];
  const isLeadership = roles.some((r) => LEADERSHIP.includes(r));
  const canManage = isLeadership || profile?.primary_department === departmentSlug;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">{cfg.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{cfg.strapline}</p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Command centre</TabsTrigger>
          <TabsTrigger value="members">{cfg.tabs?.members ?? "Members & discipleship"}</TabsTrigger>
          <TabsTrigger value="groups">{cfg.tabs?.groups ?? "Groups & mentorship"}</TabsTrigger>
          <TabsTrigger value="events">{cfg.tabs?.events ?? "Events & attendance"}</TabsTrigger>
          <TabsTrigger value="outreach">{cfg.tabs?.outreach ?? "Outreach & prayer"}</TabsTrigger>
          <TabsTrigger value="tasks">{cfg.tabs?.tasks ?? "Tasks & projects"}</TabsTrigger>

          <TabsTrigger value="risk">Risk &amp; training</TabsTrigger>
          {team === "outreach" && <TabsTrigger value="souls">Souls-won register</TabsTrigger>}
          <TabsTrigger value="reports">KPIs &amp; reports</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>

        </TabsList>

        <Suspense fallback={<Loading />}>
          <TabsContent value="dashboard" className="mt-6"><TeamDashboard team={team} /></TabsContent>
          <TabsContent value="members" className="mt-6">
            <TeamMembersModule team={team} canManage={canManage} currentUserId={currentUserId} memberWord={cfg.memberWord} />
          </TabsContent>
          <TabsContent value="groups" className="mt-6">
            <TeamGroupsMentorshipModule team={team} canManage={canManage} currentUserId={currentUserId} groupWord={cfg.groupWord} />
          </TabsContent>
          <TabsContent value="events" className="mt-6">
            <TeamEventsModule team={team} canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="outreach" className="mt-6">
            <TeamOutreachPrayerModule team={team} canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="tasks" className="mt-6">
            <TeamTasksModule team={team} canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="risk" className="mt-6">
            <TeamRiskTrainingModule team={team} canManage={canManage} currentUserId={currentUserId} />
          </TabsContent>
          <TabsContent value="reports" className="mt-6"><TeamReportsModule team={team} /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><TeamAssistant team={team} /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
