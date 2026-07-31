import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import FinanceDashboard from "@/components/finance/FinanceDashboard";
import LedgerModule from "@/components/finance/LedgerModule";
import BudgetsModule from "@/components/finance/BudgetsModule";
import ApprovalsModule from "@/components/finance/ApprovalsModule";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { exportRows, fmtDate, titleCase } from "@/lib/finance";

const sb = supabase as any;

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Financial Command Centre — TRoGKC Leadership Portal" },
      {
        name: "description",
        content:
          "Enterprise financial management for TRoGKC: executive dashboard, general ledger, budgets, approval workflows and a complete finance audit trail.",
      },
      { property: "og:title", content: "Financial Command Centre — TRoGKC Leadership Portal" },
      {
        property: "og:description",
        content: "Stewardship, treasury, giving, budgeting and financial governance in one command centre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

const FINANCE_LEADERS = ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"];

function FinancePage() {
  const role = useCurrentRole();
  const [userId, setUserId] = useState("");
  const [primaryDept, setPrimaryDept] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? "";
      setUserId(uid);
      if (uid) {
        const { data: p } = await sb.from("profiles").select("primary_department").eq("id", uid).maybeSingle();
        setPrimaryDept(p?.primary_department ?? null);
      }
    });
  }, []);

  const canManage =
    (role.data?.roles ?? []).some((r) => FINANCE_LEADERS.includes(r)) ||
    ["finance", "finance-administration"].includes(primaryDept ?? "");

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 md:px-6">
      <nav className="mb-2 text-xs text-muted-foreground print:hidden">Portal · Finance · Command Centre</nav>
      <header className="mb-6">
        <h1 className="font-serif text-3xl">Financial Command Centre</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stewardship, treasury, giving, budgeting and financial governance. Every transaction carries a unique number,
          status and full audit history — nothing is ever deleted, only archived.
        </p>
      </header>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex w-full flex-wrap justify-start print:hidden">
          <TabsTrigger value="dashboard">Executive dashboard</TabsTrigger>
          <TabsTrigger value="ledger">General ledger</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="approvals">Approvals & payments</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <FinanceDashboard />
        </TabsContent>
        <TabsContent value="ledger" className="mt-6">
          <LedgerModule canManage={canManage} currentUserId={userId} />
        </TabsContent>
        <TabsContent value="budgets" className="mt-6">
          <BudgetsModule canManage={canManage} currentUserId={userId} />
        </TabsContent>
        <TabsContent value="approvals" className="mt-6">
          <ApprovalsModule canManage={canManage} currentUserId={userId} />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <FinanceAudit />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FinanceAudit() {
  const audit = useQuery({
    queryKey: ["finance-audit"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("audit_log")
        .select("id, action, entity, entity_id, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)")
        .in("entity", ["finance_entries", "expense_claims", "budgets"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (audit.isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading audit trail…</Card>;
  if (audit.error) return <Card className="p-10 text-center text-sm text-red-700">Could not load the audit trail.</Card>;
  const rows = audit.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportRows(
              "finance-audit-trail",
              ["When", "Actor", "Action", "Record", "Record ID"],
              rows.map((r) => [r.created_at, r.actor?.full_name ?? "System", r.action, r.entity, r.entity_id]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Excel (CSV)
        </Button>
      </div>
      {rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No finance activity recorded yet.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-3">When</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Record</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="p-3">{r.actor?.full_name ?? "System"}</td>
                  <td className="p-3">{titleCase(r.action)}</td>
                  <td className="p-3">{titleCase(r.entity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
