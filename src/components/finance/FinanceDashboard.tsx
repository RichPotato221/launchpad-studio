import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import {
  branchLabel,
  exportRows,
  fmtDate,
  money,
  RAG_CLASS,
  ragForBacklog,
  ragForUtilisation,
  titleCase,
  trendArrow,
} from "@/lib/finance";

const sb = supabase as any;

type Summary = {
  total_income: number;
  total_expense: number;
  cash_position: number;
  income_this_month: number;
  expense_this_month: number;
  giving_today: number;
  giving_this_month: number;
  outstanding_payments: number;
  pending_approvals: number;
};

export default function FinanceDashboard() {
  const summary = useQuery({
    queryKey: ["finance-summary"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_finance_summary", { _months: 12 });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) as Summary | undefined;
    },
  });

  const trend = useQuery({
    queryKey: ["finance-trend"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_financial_trend", { _months: 6 });
      if (error) throw error;
      return (data ?? []) as { period: string; income: number; expense: number }[];
    },
  });

  const budgets = useQuery({
    queryKey: ["budget-utilisation"],
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_budget_utilisation", {
        _fiscal_year: new Date().getFullYear(),
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const activity = useQuery({
    queryKey: ["finance-activity"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("finance_entries")
        .select("id, transaction_no, title, kind, amount, entry_date, status, department_slug, branch")
        .is("archived_at", null)
        .order("entry_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const isLoading = summary.isLoading || trend.isLoading;
  const error = summary.error || trend.error;

  if (isLoading) {
    return <Card className="p-10 text-center text-sm text-muted-foreground">Loading financial position…</Card>;
  }
  if (error) {
    return (
      <Card className="p-10 text-center text-sm">
        <p className="text-red-700">Could not load the financial dashboard.</p>
        <Button className="mt-4" variant="outline" onClick={() => summary.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </Card>
    );
  }

  const s = summary.data;
  const series = trend.data ?? [];
  const prev = series.length > 1 ? series[series.length - 2] : undefined;
  const curr = series.length ? series[series.length - 1] : undefined;
  const max = Math.max(1, ...series.flatMap((r) => [Number(r.income), Number(r.expense)]));

  const cards = [
    { label: "Total income (12m)", value: money(s?.total_income), sub: "All giving streams" },
    { label: "Total expenditure (12m)", value: money(s?.total_expense), sub: "Paid claims" },
    {
      label: "Cash position",
      value: money(s?.cash_position),
      sub: `${trendArrow(Number(curr?.income ?? 0), Number(prev?.income ?? 0))} vs last month`,
    },
    { label: "Available funds", value: money(Number(s?.cash_position ?? 0) - Number(s?.outstanding_payments ?? 0)), sub: "Cash less commitments" },
    { label: "Outstanding payments", value: money(s?.outstanding_payments), sub: "Claims not yet paid" },
    { label: "Giving today", value: money(s?.giving_today), sub: "Captured today" },
    { label: "Giving this month", value: money(s?.giving_this_month), sub: "Month to date" },
    { label: "Pending approvals", value: String(s?.pending_approvals ?? 0), sub: "Awaiting a decision" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Executive summary — last 12 months</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { summary.refetch(); trend.refetch(); budgets.refetch(); activity.refetch(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            Print / PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows("finance-executive-summary", ["Metric", "Value"], cards.map((c) => [c.label, c.value]))
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-serif text-2xl">{c.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Income vs expenditure (6 months)</p>
            <Button
              size="sm"
              variant="ghost"
              className="print:hidden"
              onClick={() =>
                exportRows(
                  "finance-trend",
                  ["Period", "Income", "Expense"],
                  series.map((r) => [r.period, r.income, r.expense]),
                )
              }
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          {series.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No financial activity captured yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {series.map((r) => (
                <div key={r.period}>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{r.period}</span>
                    <span>
                      {money(r.income)} in · {money(r.expense)} out
                    </span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    <div className="h-2 rounded bg-emerald-500" style={{ width: `${(Number(r.income) / max) * 100}%` }} />
                  </div>
                  <div className="mt-1 flex gap-1">
                    <div className="h-2 rounded bg-red-400" style={{ width: `${(Number(r.expense) / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Budget utilisation — {new Date().getFullYear()}</p>
          {(budgets.data ?? []).length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              No budgets captured for this financial year yet. Create one on the Budgets tab.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {(budgets.data ?? []).slice(0, 6).map((b) => {
                const pct = Number(b.utilisation_pct ?? 0);
                return (
                  <div key={b.budget_id}>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>
                        {b.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          {titleCase(b.department_slug)} · {branchLabel(b.branch)}
                        </span>
                      </span>
                      <Badge variant="outline" className={RAG_CLASS[ragForUtilisation(pct)]}>
                        {pct}%
                      </Badge>
                    </div>
                    <div className="mt-1 h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {money(b.actual)} spent of {money(b.planned)} planned
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent financial activity</p>
          <Badge variant="outline" className={RAG_CLASS[ragForBacklog(Number(summary.data?.pending_approvals ?? 0))]}>
            {Number(summary.data?.pending_approvals ?? 0)} pending approvals
          </Badge>
        </div>
        {(activity.data ?? []).length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">No transactions captured yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-4">Transaction</th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(activity.data ?? []).map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{r.transaction_no ?? "—"}</td>
                    <td className="py-2 pr-4">{r.title}</td>
                    <td className="py-2 pr-4">{titleCase(r.kind)}</td>
                    <td className="py-2 pr-4">{fmtDate(r.entry_date)}</td>
                    <td className="py-2 pr-4 text-right">{money(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
