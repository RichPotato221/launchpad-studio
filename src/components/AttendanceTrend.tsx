import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

const BRANCH_COLORS: Record<string, string> = {
  twatwa: "bg-teal-600",
  joburg_north: "bg-amber-500",
  joburg_south: "bg-indigo-500",
};

type TrendRow = { period: string; branch: string; total_present: number };

export function AttendanceTrend() {
  const trend = useQuery({
    queryKey: ["attendance-trend"],
    queryFn: async (): Promise<TrendRow[]> => {
      const { data, error } = await supabase.rpc("get_attendance_trend", { _months: 6 });
      if (error) throw error;
      return (data ?? []) as TrendRow[];
    },
  });

  const rows = trend.data ?? [];
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort();
  const branches = Array.from(new Set(rows.map((r) => r.branch)));
  const maxVal = Math.max(1, ...rows.map((r) => r.total_present));

  return (
    <Card className="p-6 lg:col-span-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance Trend — Last 6 Months</p>
      <p className="mt-1 text-xs text-muted-foreground">Total present per branch, by month.</p>

      {trend.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {trend.isError && <p className="mt-4 text-sm text-red-600">Couldn't load attendance trend. Try refreshing.</p>}

      {!trend.isLoading && !trend.isError && periods.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No attendance recorded in this period yet.</p>
      )}

      {periods.length > 0 && (
        <>
          <div className="mt-6 flex items-end gap-4 overflow-x-auto pb-2">
            {periods.map((period) => (
              <div key={period} className="flex shrink-0 flex-col items-center gap-1">
                <div className="flex items-end gap-1" style={{ height: "10rem" }}>
                  {branches.map((b) => {
                    const row = rows.find((r) => r.period === period && r.branch === b);
                    const val = row?.total_present ?? 0;
                    const heightPct = Math.round((val / maxVal) * 100);
                    return (
                      <div key={b} className="flex h-full flex-col items-center justify-end">
                        <span className="mb-1 text-[0.65rem] text-muted-foreground">{val || ""}</span>
                        <div
                          className={`w-4 rounded-t ${BRANCH_COLORS[b] ?? "bg-muted-foreground"}`}
                          style={{ height: `${heightPct}%`, minHeight: val > 0 ? "2px" : "0" }}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">{period}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {branches.map((b) => (
              <div key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-sm ${BRANCH_COLORS[b] ?? "bg-muted-foreground"}`} />
                {b}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
