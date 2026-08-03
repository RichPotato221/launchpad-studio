import { lazy, Suspense, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentRole } from "@/lib/useCurrentRole";

const StrategyDashboard = lazy(() => import("@/components/strategy/StrategyDashboard"));
const PlansModule = lazy(() => import("@/components/strategy/PlansModule"));
const PortfolioModule = lazy(() => import("@/components/strategy/PortfolioModule"));
const ScorecardModule = lazy(() => import("@/components/strategy/ScorecardModule"));
const DecisionsModule = lazy(() => import("@/components/strategy/DecisionsModule"));
const RiskInnovationModule = lazy(() => import("@/components/strategy/RiskInnovationModule"));
const StrategyAnalytics = lazy(() => import("@/components/strategy/StrategyAnalytics"));
const StrategyAssistant = lazy(() => import("@/components/strategy/StrategyAssistant"));

const LEADERSHIP = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor", "strategic_adviser"];
const STRATEGY_DEPTS = ["strategic-adviser", "strategic-adviser-planner", "strategy", "strategic-planning", "planning"];

/** Strategy Management Office (SMO) — Office of the Strategic Adviser & Planner. */
export default function StrategyCenter({ departmentSlug, currentUserId }: { departmentSlug?: string; currentUserId: string }) {
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
    STRATEGY_DEPTS.includes(dept) ||
    (!!departmentSlug && dept === departmentSlug);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-serif text-2xl">Strategy Management Office</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “Write the vision, and make it plain upon tables, that he may run that readeth it.” (Habakkuk 2:2) — strategic
          plans, objectives and OKRs, the project portfolio, the balanced scorecard, executive decisions, strategic risk
          and the innovation hub.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="plans">Strategic plans</TabsTrigger>
          <TabsTrigger value="portfolio">Project portfolio</TabsTrigger>
          <TabsTrigger value="scorecard">Scorecard &amp; KPIs</TabsTrigger>
          <TabsTrigger value="decisions">Decisions &amp; requests</TabsTrigger>
          <TabsTrigger value="risk">Risk &amp; innovation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics &amp; board report</TabsTrigger>
          <TabsTrigger value="assistant">AI assistant</TabsTrigger>
        </TabsList>

        <Suspense fallback={<Card className="mt-6 p-8 text-center text-sm text-muted-foreground">Loading…</Card>}>
          <TabsContent value="dashboard" className="mt-6"><StrategyDashboard /></TabsContent>
          <TabsContent value="plans" className="mt-6"><PlansModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="portfolio" className="mt-6"><PortfolioModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="scorecard" className="mt-6"><ScorecardModule canManage={canManage} /></TabsContent>
          <TabsContent value="decisions" className="mt-6"><DecisionsModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="risk" className="mt-6"><RiskInnovationModule canManage={canManage} currentUserId={currentUserId} /></TabsContent>
          <TabsContent value="analytics" className="mt-6"><StrategyAnalytics /></TabsContent>
          <TabsContent value="assistant" className="mt-6"><StrategyAssistant /></TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
