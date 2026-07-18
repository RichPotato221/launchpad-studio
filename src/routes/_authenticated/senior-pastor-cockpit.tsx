import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllKpis, fetchDepartments, KPI_CATEGORIES, type KpiCategory } from "@/lib/portal";
import { useLeadershipAccess } from "@/lib/useLeadershipAccess";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/senior-pastor-cockpit")({
  head: () => ({ meta: [{ title: "Senior Pastor Cockpit — TRoGKC Portal" }] }),
  component: CockpitPage,
});

function CockpitPage() {
  const access = useLeadershipAccess();

  if (access.isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;

  if (!access.data?.hasAccess) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Restricted</p>
        <h1 className="mt-2 font-serif text-3xl">Senior Pastor Cockpit</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This dashboard is reserved for the Senior Apostle, the Chairperson of the Apostolic Council,
          and the Church Secretary, per the Governance Manual.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Governance-Level Oversight</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Senior Pastor Cockpit</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        A single view of what needs your attention this month — underperforming KPIs, claims awaiting
        your sign-off, departments that haven't reported, and a membership pulse.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <RedFlagKpis />
        <PendingApprovals />
        <ReportingCompliance />
        <MembershipPulse />
      </div>
    </div>
  );
}

/* -------------------- Red-Flag KPIs -------------------- */
function RedFlagKpis() {
  const kpis = useQuery({ queryKey: ["all-kpis"], queryFn: fetchAllKpis });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;
  const categoryLabel = (c: KpiCategory) => KPI_CATEGORIES.find((k) => k.key === c)?.label ?? c;

  const flags = useMemo(() => {
    if (!kpis.data) return [];
    const latest = new Map<string, (typeof kpis.data)[number]>();
    for (const row of kpis.data) {
      const key = `${row.department_slug}::${row.kpi_name}`;
      const existing = latest.get(key);
      if (!existing || row.period_date > existing.period_date) latest.set(key, row);
    }
    return Array.from(latest.values())
      .filter((r) => r.target != null && (r.actual == null || Number(r.actual) < Number(r.target)))
      .sort((a, b) => {
        const pctA = a.actual == null ? -1 : Number(a.actual) / Number(a.target);
        const pctB = b.actual == null ? -1 : Number(b.actual) / Number(b.target);
        return pctA - pctB;
      });
  }, [kpis.data]);

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Red-Flag KPIs</p>
      <p className="mt-1 text-xs text-muted-foreground">Most recent period per KPI, below target or not yet reported.</p>
      <div className="mt-4 space-y-3">
        {flags.map((r) => {
          const notReported = r.actual == null;
          const pct = notReported ? 0 : Math.round((Number(r.actual) / Number(r.target)) * 100);
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{r.kpi_name}</p>
                <p className="text-xs text-muted-foreground">
                  {deptName(r.department_slug)} · {categoryLabel(r.category)} · {r.period_date}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${notReported ? "bg-muted text-muted-foreground" : "bg-red-100 text-red-700"}`}>
                {notReported ? "Not reported" : `${pct}% of target`}
              </span>
            </div>
          );
        })}
        {kpis.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!kpis.isLoading && flags.length === 0 && (
          <p className="text-sm text-muted-foreground">No red flags — every reported KPI is on target. 🎉</p>
        )}
      </div>
    </Card>
  );
}

/* -------------------- Pending Approvals (expense claims awaiting Senior Pastor sign-off) -------------------- */
function PendingApprovals() {
  const qc = useQueryClient();
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const claims = useQuery({
    queryKey: ["cockpit-pending-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_claims")
        .select("*")
        .eq("status", "chair_approved")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;

  const advance = async (id: string, status: "senior_pastor_approved" | "rejected") => {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("expense_claims")
      .update(
        status === "senior_pastor_approved"
          ? { status, approved_by_senior: userRes.user?.id }
          : { status },
      )
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "senior_pastor_approved" ? "Approved" : "Rejected");
    qc.invalidateQueries({ queryKey: ["cockpit-pending-claims"] });
  };

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Pending Your Approval</p>
      <p className="mt-1 text-xs text-muted-foreground">Expense claims already chair-approved, awaiting final sign-off.</p>
      <div className="mt-4 space-y-3">
        {claims.data?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
            <div>
              <p className="text-sm font-medium">R {Number(r.amount).toFixed(2)} · {r.claim_type ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{deptName(r.department_slug)} · {r.description}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => advance(r.id, "senior_pastor_approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => advance(r.id, "rejected")}>Reject</Button>
            </div>
          </div>
        ))}
        {claims.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!claims.isLoading && (claims.data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">Nothing waiting on you right now.</p>
        )}
      </div>
    </Card>
  );
}

/* -------------------- Reporting Compliance -------------------- */
function ReportingCompliance() {
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const reports = useQuery({
    queryKey: ["cockpit-reports-this-month"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("report_entries")
        .select("department_slug, created_at")
        .gte("created_at", start.toISOString());
      if (error) throw error;
      return data;
    },
  });

  const reportedSlugs = new Set((reports.data ?? []).map((r) => r.department_slug));

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Reporting Compliance — This Month</p>
      <p className="mt-1 text-xs text-muted-foreground">Every department is expected to submit a monthly activity report.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {depts.data?.map((d) => {
          const reported = reportedSlugs.has(d.slug);
          return (
            <div key={d.slug} className={`rounded-md px-3 py-2 text-xs ${reported ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {d.name}
              <span className="block text-[0.65rem] uppercase tracking-widest opacity-80">{reported ? "Submitted" : "Missing"}</span>
            </div>
          );
        })}
        {depts.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      </div>
    </Card>
  );
}

/* -------------------- Membership Pulse -------------------- */
function MembershipPulse() {
  const stages = useQuery({
    queryKey: ["cockpit-membership-pulse"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_lifecycle").select("stage");
      if (error) throw error;
      return data;
    },
  });

  const STAGE_LABELS: Record<string, string> = {
    visitor: "Visitors",
    new_convert: "New Converts",
    member: "Members",
    serving: "Serving",
    leader: "Leaders",
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { visitor: 0, new_convert: 0, member: 0, serving: 0, leader: 0 };
    for (const row of stages.data ?? []) c[row.stage] = (c[row.stage] ?? 0) + 1;
    return c;
  }, [stages.data]);

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Membership Pulse</p>
      <p className="mt-1 text-xs text-muted-foreground">Current count by lifecycle stage.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <div key={key} className="rounded-md border border-border/60 p-3 text-center">
            <p className="font-serif text-2xl">{counts[key] ?? 0}</p>
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      {stages.isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
    </Card>
  );
}
