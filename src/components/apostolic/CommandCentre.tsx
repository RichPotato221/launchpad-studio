import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { departmentHealth, ragForHealth, type DepartmentOversightRow } from "@/lib/governance";
import { money } from "@/lib/finance";
import { Dot, Empty } from "./shared";

const sb = supabase as any;

/** Offices tracked in the command centre in addition to registered departments. */
const OFFICES = [
  { slug: "lead-pastor", name: "Lead / Assistant Pastor Office" },
  { slug: "chairperson", name: "Chairperson Office" },
  { slug: "associate-pastor", name: "Associate Pastors" },
  { slug: "finance", name: "Finance Department" },
  { slug: "secretariat", name: "Secretariat" },
  { slug: "resource-administrator", name: "Resource Administrator" },
];

export function CommandCentre() {
  const { data, isLoading } = useQuery({
    queryKey: ["apo-command-centre"],
    queryFn: async () => {
      const [oversight, budgets, volunteers, projects] = await Promise.all([
        sb.rpc("get_department_oversight"),
        sb.rpc("get_budget_utilisation", { _fiscal_year: new Date().getFullYear() }),
        sb.from("volunteer_profiles").select("id, department_slug"),
        sb.from("apo_projects").select("*"),
      ]);
      return {
        oversight: (oversight.data ?? []) as DepartmentOversightRow[],
        budgets: budgets.data ?? [],
        volunteers: volunteers.data ?? [],
        projects: projects.data ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Loading the command centre…</Card>;
  }

  const rows: DepartmentOversightRow[] = [...data.oversight];
  for (const o of OFFICES) {
    if (!rows.some((r) => r.department_slug === o.slug)) {
      rows.push({
        department_slug: o.slug,
        department_name: o.name,
        kind: "office",
        kpi_avg_pct: null,
        kpi_count: 0,
        open_tasks: 0,
        overdue_tasks: 0,
        reports_90d: 0,
        open_risks: 0,
        critical_risks: 0,
        open_compliance: 0,
        open_decisions: 0,
        members: 0,
        last_activity: null,
      } as unknown as DepartmentOversightRow);
    }
  }

  const budgetFor = (slug: string) =>
    (data.budgets as any[]).filter((b) => b.department_slug === slug).reduce(
      (acc, b) => ({
        planned: acc.planned + Number(b.planned ?? 0),
        actual: acc.actual + Number(b.actual ?? 0),
      }),
      { planned: 0, actual: 0 },
    );

  const volunteersFor = (slug: string) => (data.volunteers as any[]).filter((v) => v.department_slug === slug).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Every office, department and ministry in one view — health, KPIs, budget, volunteers, risks, reports and open
        work.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((d) => {
          const health = departmentHealth(d);
          const rag = ragForHealth(health);
          const b = budgetFor(d.department_slug);
          const projects = (data.projects as any[]).filter((p) => p.status !== "completed").length;
          return (
            <Card key={d.department_slug} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Dot rag={rag} />
                  <p className="text-sm font-medium">{d.department_name}</p>
                </div>
                <span className="font-serif text-xl">{health}</span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <Row k="KPI performance" v={`${Math.round(Number(d.kpi_avg_pct ?? 0))}% (${d.kpi_count})`} />
                <Row k="Members" v={String(d.members ?? 0)} />
                <Row k="Volunteers" v={String(volunteersFor(d.department_slug))} />
                <Row k="Budget used" v={b.planned ? `${Math.round((b.actual / b.planned) * 100)}%` : "—"} />
                <Row k="Budget" v={b.planned ? money(b.planned) : "—"} />
                <Row k="Open risks" v={`${d.open_risks} (${d.critical_risks} critical)`} />
                <Row k="Reports (90d)" v={String(d.reports_90d ?? 0)} />
                <Row k="Open tasks" v={`${d.open_tasks} (${d.overdue_tasks} overdue)`} />
                <Row k="Open compliance" v={String(d.open_compliance ?? 0)} />
                <Row k="Live projects" v={String(projects)} />
              </dl>
              <p className="mt-3 text-xs">
                <span className="text-muted-foreground">AI indicator: </span>
                {rag === "green"
                  ? "Healthy — sustain current rhythm."
                  : rag === "amber"
                    ? "Watch — KPIs or reporting are slipping."
                    : "Intervene — overdue work and weak reporting."}
              </p>
            </Card>
          );
        })}
        {rows.length === 0 && <Empty>No oversight data available.</Empty>}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt>{k}</dt>
      <dd className="text-right text-foreground">{v}</dd>
    </>
  );
}
