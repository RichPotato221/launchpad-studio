import { lazy, Suspense, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/useCurrentRole";

const TechnicalDashboard = lazy(() => import("@/components/technical/TechnicalDashboard"));
const ProductionPlanner = lazy(() => import("@/components/technical/ProductionPlanner"));
const AssetRegister = lazy(() => import("@/components/technical/AssetRegister"));
const StreamingModule = lazy(() => import("@/components/technical/StreamingModule"));
const TechTeamModule = lazy(() => import("@/components/technical/TechTeamModule"));
const TechRiskModule = lazy(() => import("@/components/technical/TechRiskModule"));
const TechnicalAnalytics = lazy(() => import("@/components/technical/TechnicalAnalytics"));
const TechnicalAssistant = lazy(() => import("@/components/technical/TechnicalAssistant"));

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];
const TECH_DEPTS = ["sound-technical", "sound-and-technical", "technical", "sound", "av", "media", "media-communications"];

/** Technical Operations Centre (TOC) — the sound & technical team command centre. */
export default function TechnicalCenter({ departmentSlug, currentUserId }: { departmentSlug?: string; currentUserId: string }) {
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
    TECH_DEPTS.includes(dept) ||
    (!!departmentSlug && dept === departmentSlug);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Technical Operations Centre</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “Let all things be done decently and in order.” (1 Corinthians 14:40) — service production, sound, visuals,
          livestreaming, the technical asset register, maintenance, crew development and technical risk in one place.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="productions">Service production</TabsTrigger>
          <TabsTrigger value="assets">Assets &amp; maintenance</TabsTrigger>
          <TabsTrigger value="streaming">Livestream</TabsTrigger>
          <TabsTrigger value="team">Crew &amp; training</TabsTrigger>
          <TabsTrigger value="risk">Risk register</TabsTrigger>
          <TabsTrigger value="analytics">Analytics &amp; reports</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6"><TechnicalDashboard /></TabsContent>
          <TabsContent value="productions" className="mt-6"><ProductionPlanner canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="assets" className="mt-6"><AssetRegister canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="streaming" className="mt-6"><StreamingModule canManage={canManage} /></TabsContent>
          <TabsContent value="team" className="mt-6"><TechTeamModule canManage={canManage} /></TabsContent>
          <TabsContent value="risk" className="mt-6"><TechRiskModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><TechnicalAnalytics /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><TechnicalAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
