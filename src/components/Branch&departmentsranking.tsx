import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportToCsv } from "@/lib/exportCsv";

type PerfRow = { department_slug: string; branch: string; avg_pct: number; kpi_count: number };
type ActivityRow = { branch: string; total_present: number };

export function DepartmentAndBranchRankings() {
  const perf = useQuery({
    queryKey: ["department-performance"],
    queryFn: async (): Promise<PerfRow[]> => {
      const { data, error } = await supabase.rpc("get_department_performance");
      if (error) throw error;
      return (data ?? []) as PerfRow[];
    },
  });

  const activity = useQuery({
    queryKey: ["branch-activity"],
    queryFn: async (): Promise<ActivityRow[]> => {
      const { data, error } = await supabase.rpc("get_branch_activity", { _days: 30 });
      if (error) throw error;
      return (data ?? []) as ActivityRow[];
    },
  });

  const depts = useQuery({
    queryKey: ["departments-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("slug, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const deptName = (slug: string) => depts.data?.find((d) => d.slug === slug)?.name ?? slug;

  const rows = perf.data ?? [];
  const top = rows.slice(0, 3);
  const bottom = rows.slice(-3).reverse();

  const activityRows = activity.data ?? [];
  const most = activityRows[0];
  const least = activityRows[activityRows.length - 1];

  const isLoading = perf.isLoading || activity.isLoading;
  const isError = perf.isError || activity.isError;

  const handleExport = () => {
    exportToCsv(
      "department-branch-rankings",
      ["Department", "Branch", "Avg % of Target", "KPI Count"],
      rows.map((r) => [deptName(r.department_slug), r.branch, r.avg_pct, r.kpi_count]),
    );
  };

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Department &amp; Branch Rankings</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Based on the most recent KPI entries (90 days) and attendance (30 days).
          </p>
        </div>
        {rows.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleExport} className="print:hidden">
            Export CSV
          </Button>
        )}
      </div>


      {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {isError && <p className="mt-4 text-sm text-red-600">Couldn't load rankings. Try refreshing.</p>}

      {!isLoading && !isError && (
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-emerald-700">Top Performing Departments</p>
            {top.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No KPI data yet.</p>}
            <div className="mt-2 space-y-2">
              {top.map((r) => (
                <div
                  key={`${r.department_slug}-${r.branch}`}
                  className="flex items-center justify-between rounded border border-border/60 px-3 py-2 text-sm"
                >
                  <span>
                    {deptName(r.department_slug)} <span className="text-xs text-muted-foreground">· {r.branch}</span>
                  </span>
                  <span className="font-medium text-emerald-700">{r.avg_pct}%</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-red-700">Lowest Performing Departments</p>
            {bottom.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No KPI data yet.</p>}
            <div className="mt-2 space-y-2">
              {bottom.map((r) => (
                <div
                  key={`${r.department_slug}-${r.branch}`}
                  className="flex items-center justify-between rounded border border-border/60 px-3 py-2 text-sm"
                >
                  <span>
                    {deptName(r.department_slug)} <span className="text-xs text-muted-foreground">· {r.branch}</span>
                  </span>
                  <span className="font-medium text-red-700">{r.avg_pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mt-6 grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-2">
          <div className="rounded-md border border-border/60 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Most Active Branch</p>
            {most ? (
              <>
                <p className="mt-1 font-serif text-2xl">{most.branch}</p>
                <p className="text-xs text-muted-foreground">{most.total_present} present (30 days)</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No attendance data yet.</p>
            )}
          </div>
          <div className="rounded-md border border-border/60 p-4 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Least Active Branch</p>
            {least ? (
              <>
                <p className="mt-1 font-serif text-2xl">{least.branch}</p>
                <p className="text-xs text-muted-foreground">{least.total_present} present (30 days)</p>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No attendance data yet.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

