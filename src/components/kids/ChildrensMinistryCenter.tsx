import { lazy, Suspense, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/useCurrentRole";

const KidsDashboard = lazy(() => import("@/components/kids/KidsDashboard"));
const ChildrenRegister = lazy(() => import("@/components/kids/ChildrenRegister"));
const CheckInModule = lazy(() => import("@/components/kids/CheckInModule"));
const ClassroomsModule = lazy(() => import("@/components/kids/ClassroomsModule"));
const CurriculumModule = lazy(() => import("@/components/kids/CurriculumModule"));
const KidsVolunteersModule = lazy(() => import("@/components/kids/KidsVolunteersModule"));
const SafeguardingModule = lazy(() => import("@/components/kids/SafeguardingModule"));
const FamilyEngagementModule = lazy(() => import("@/components/kids/FamilyEngagementModule"));
const KidsAnalytics = lazy(() => import("@/components/kids/KidsAnalytics"));
const KidsReports = lazy(() => import("@/components/kids/KidsReports"));
const KidsAssistant = lazy(() => import("@/components/kids/KidsAssistant"));
const ParentPortal = lazy(() => import("@/components/kids/ParentPortal"));

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];
const KIDS_DEPTS = ["childrens-ministry", "youth-ministry", "children", "kids"];

/** Children's Ministry Management System (CMMS) — the children's ministry command centre. */
export default function ChildrensMinistryCenter({ departmentSlug, currentUserId }: { departmentSlug?: string; currentUserId: string }) {
  const role = useCurrentRole();
  const roles = role.data?.roles ?? [];
  const [dept, setDept] = useState<string>("");

  useEffect(() => {
    if (!currentUserId) return;
    supabase.from("profiles").select("primary_department").eq("id", currentUserId).maybeSingle()
      .then(({ data }) => setDept((data as any)?.primary_department ?? ""));
  }, [currentUserId]);

  const canManage =
    roles.some((r) => LEADERSHIP.includes(r)) ||
    KIDS_DEPTS.includes(dept) ||
    (!!departmentSlug && dept === departmentSlug);


  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Children's Ministry Management System</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “Train up a child in the way he should go; even when he is old he will not depart from it.” (Proverbs 22:6) —
          secure check-in, classroom oversight, curriculum, safeguarding, discipleship tracking and family engagement.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="checkin">Check-in / out</TabsTrigger>
          <TabsTrigger value="register">Children register</TabsTrigger>
          <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="volunteers">Volunteers &amp; training</TabsTrigger>
          <TabsTrigger value="safeguarding">Safeguarding</TabsTrigger>
          <TabsTrigger value="families">Family engagement</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="parent">Parent view</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6"><KidsDashboard /></TabsContent>
          <TabsContent value="checkin" className="mt-6"><CheckInModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="register" className="mt-6"><ChildrenRegister canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="classrooms" className="mt-6"><ClassroomsModule canManage={canManage} /></TabsContent>
          <TabsContent value="curriculum" className="mt-6"><CurriculumModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="volunteers" className="mt-6"><KidsVolunteersModule canManage={canManage} /></TabsContent>
          <TabsContent value="safeguarding" className="mt-6"><SafeguardingModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="families" className="mt-6"><FamilyEngagementModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><KidsAnalytics /></TabsContent>
          <TabsContent value="reports" className="mt-6"><KidsReports /></TabsContent>
          <TabsContent value="parent" className="mt-6"><ParentPortal /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><KidsAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
