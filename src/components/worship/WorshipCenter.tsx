import { lazy, Suspense, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/useCurrentRole";

const WorshipDashboard = lazy(() => import("@/components/worship/WorshipDashboard"));
const ServicePlanner = lazy(() => import("@/components/worship/ServicePlanner"));
const MusicLibrary = lazy(() => import("@/components/worship/MusicLibrary"));
const TeamModule = lazy(() => import("@/components/worship/TeamModule"));
const RehearsalsModule = lazy(() => import("@/components/worship/RehearsalsModule"));
const SchedulingModule = lazy(() => import("@/components/worship/SchedulingModule"));
const EquipmentModule = lazy(() => import("@/components/worship/EquipmentModule"));
const TrainingRiskModule = lazy(() => import("@/components/worship/TrainingRiskModule"));
const WorshipAnalytics = lazy(() => import("@/components/worship/WorshipAnalytics"));
const WorshipAssistant = lazy(() => import("@/components/worship/WorshipAssistant"));

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];
const WORSHIP_DEPTS = ["worship", "worship-music", "music", "praise-worship"];

/** Worship Operations Platform (WOP) — the worship & music ministry command centre. */
export default function WorshipCenter({ departmentSlug, currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const roles = role.data?.roles ?? [];
  const [dept, setDept] = useState("");

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("primary_department").eq("id", currentUserId).maybeSingle()
      .then(({ data }) => setDept((data as any)?.primary_department ?? ""));
  }, [currentUserId]);

  const canManage =
    roles.some((r) => LEADERSHIP.includes(r)) ||
    WORSHIP_DEPTS.includes(dept) ||
    (!!departmentSlug && dept === departmentSlug);

  const slug = departmentSlug || "worship";

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Worship Operations Platform</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “Sing to the LORD a new song; sing to the LORD, all the earth.” (Psalm 96:1) — service planning, set building,
          the song library, team rostering, rehearsals, equipment, training and worship analytics in one place.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="planner">Service planner</TabsTrigger>
          <TabsTrigger value="library">Music library</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="rehearsals">Rehearsals</TabsTrigger>
          <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="training">Training &amp; risk</TabsTrigger>
          <TabsTrigger value="analytics">Analytics &amp; reports</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6"><WorshipDashboard /></TabsContent>
          <TabsContent value="planner" className="mt-6"><ServicePlanner canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="library" className="mt-6"><MusicLibrary canManage={canManage} departmentSlug={slug} /></TabsContent>
          <TabsContent value="team" className="mt-6"><TeamModule canManage={canManage} /></TabsContent>
          <TabsContent value="rehearsals" className="mt-6"><RehearsalsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="scheduling" className="mt-6"><SchedulingModule canManage={canManage} /></TabsContent>
          <TabsContent value="equipment" className="mt-6"><EquipmentModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="training" className="mt-6"><TrainingRiskModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><WorshipAnalytics /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><WorshipAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
