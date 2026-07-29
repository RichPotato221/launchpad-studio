import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";


type CompRow = { period_label: string; current_avg_pct: number | null; previous_avg_pct: number | null };

export function PeriodComparison() {
  const comparison = useQuery({
    queryKey: ["kpi-period-comparison"],
    queryFn: async (): Promise<CompRow[]> => {
      const { data, error } = await supabase.rpc("get_kpi_period_comparison");
      if (error) throw error;
      return (data ?? []) as CompRow[];
    },
  });

  const rows = comparison.data ?? [];

  return (
    <Card className="p-6 lg:col-span-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">Period Comparison</p>,
      import { PeriodComparison } from "@/components/PeriodComparison";
      <p className="mt-1 text-xs text-muted-foreground">Average KPI achievement vs. the prior equivalent period.</p>

      {comparison.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {comparison.isError && <p className="mt-4 text-sm text-red-600">Couldn't load comparison. Try refreshing.</p>}

      {!comparison.isLoading && !comparison.isError && (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {rows.map((r) => {
            const current = r.current_avg_pct;
            const previous = r.previous_avg_pct;
            const hasBoth = current != null && previous != null;
            const delta = hasBoth ? Number(current) - Number(previous) : null;

            const Arrow = delta == null || Math.abs(delta) < 0.5 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
            const arrowColor =
              delta == null || Math.abs(delta) < 0.5
                ? "text-muted-foreground"
                : delta > 0
                ? "text-emerald-600"
                : "text-red-600";

            return (
              <div key={r.period_label} className="rounded-md border border-border/60 p-4 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">This {r.period_label}</p>
                <p className="mt-2 font-serif text-3xl">
                  {current != null ? `${current}%` : "—"}
                </p>
                <div className={`mt-1 flex items-center justify-center gap-1 text-xs ${arrowColor}`}>
                  <Arrow className="h-3.5 w-3.5" />
                  {hasBoth ? (
                    <span>
                      {delta! > 0 ? "+" : ""}
                      {delta!.toFixed(1)} pts vs last {r.period_label.toLowerCase()}
                    </span>
                  ) : (
                    <span>No prior data</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

