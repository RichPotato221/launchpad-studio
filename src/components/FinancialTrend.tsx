import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type TrendRow = { period: string; income: number; expense: number };

export function FinancialTrend() {
  const trend = useQuery({
    queryKey: ["financial-trend"],
    queryFn: async (): Promise<TrendRow[]> => {
      const { data, error } = await supabase.rpc("get_financial_trend", { _months: 6 });
      if (error) throw error;
      return (data ?? []) as TrendRow[];
    },
  });

  const rows = trend.data ?? [];
  const maxVal = Math.max(1, ...rows.flatMap((r) => [Number(r.income), Number(r.expense)]));
  const netTotal = rows.reduce((s, r) => s + Number(r.income) - Number(r.expense), 0);

  return (
    <Card className="p-6 lg:col-span-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Financial Trend — Last 6 Months</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Income (tithes, offerings, contributions) vs. paid expense claims.
          </p>
        </div>
        {rows.length > 0 && (
          <p className={`font-serif text-2xl ${netTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            Net R {netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        )}
      </div>

      {trend.isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}
      {trend.isError && <p className="mt-4 text-sm text-red-600">Couldn't load financial trend. Try refreshing.</p>}
      {!trend.isLoading && !trend.isError && rows.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">No income or paid expenses recorded in this period yet.</p>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-6 flex items-end gap-4 overflow-x-auto pb-2">
            {rows.map((r) => (
              <div key={r.period} className="flex shrink-0 flex-col items-center gap-1">
                <div className="flex items-end gap-1" style={{ height: "10rem" }}>
                  <div className="flex h-full flex-col items-center justify-end">
                    <span className="mb-1 text-[0.65rem] text-muted-foreground">
                      {r.income ? Math.round(Number(r.income)) : ""}
                    </span>
                    <div
                      className="w-4 rounded-t bg-emerald-600"
                      style={{
                        height: `${Math.round((Number(r.income) / maxVal) * 100)}%`,
                        minHeight: Number(r.income) > 0 ? "2px" : "0",
                      }}
                    />
                  </div>
                  <div className="flex h-full flex-col items-center justify-end">
                    <span className="mb-1 text-[0.65rem] text-muted-foreground">
                      {r.expense ? Math.round(Number(r.expense)) : ""}
                    </span>
                    <div
                      className="w-4 rounded-t bg-red-500"
                      style={{
                        height: `${Math.round((Number(r.expense) / maxVal) * 100)}%`,
                        minHeight: Number(r.expense) > 0 ? "2px" : "0",
                      }}
                    />
                  </div>
                </div>
                <span className="mt-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">{r.period}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Income
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> Expenses (paid)
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
