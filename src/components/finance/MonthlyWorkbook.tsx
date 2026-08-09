import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Download, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { exportRows, money, RAG_CLASS, titleCase } from "@/lib/finance";

const sb = supabase as any;

type Line = {
  id: string;
  period_id: string;
  section: string;
  category: string;
  target: number;
  actual: number;
  notes: string | null;
  sort_order: number;
};

const SECTIONS = [
  { key: "income", label: "Money coming in (income)", positive: true },
  { key: "expense", label: "Money going out (expenses)", positive: false },
  { key: "outstanding", label: "Outstanding payments", positive: false },
  { key: "pledge", label: "Pledges", positive: true },
  { key: "project", label: "Projects & budgets", positive: false },
] as const;

/** The template a brand-new month starts from when there is no prior month to copy. */
const DEFAULT_TEMPLATE: { section: string; category: string }[] = [
  { section: "income", category: "Sunday contributions" },
  { section: "income", category: "Tithes" },
  { section: "income", category: "Offerings" },
  { section: "income", category: "First fruits" },
  { section: "income", category: "Seed" },
  { section: "income", category: "Other income" },
  { section: "expense", category: "Rent & venue" },
  { section: "expense", category: "Utilities" },
  { section: "expense", category: "Ministry supplies" },
  { section: "expense", category: "Equipment & tech" },
  { section: "expense", category: "Travel & transport" },
  { section: "expense", category: "Hospitality" },
  { section: "expense", category: "Honorarium / stipend" },
  { section: "expense", category: "Missions & outreach" },
  { section: "expense", category: "Administration" },
  { section: "outstanding", category: "Unpaid supplier invoices" },
  { section: "outstanding", category: "Approved claims not yet paid" },
  { section: "pledge", category: "Building fund pledges" },
  { section: "pledge", category: "Missions pledges" },
  { section: "project", category: "Project 1" },
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

function prevMonth(iso: string) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() - 1);
  return monthKey(d);
}

/**
 * The central monthly financial workbook — an Excel-style sheet that is
 * pre-created every month so nothing has to be rebuilt from scratch.
 */
export default function MonthlyWorkbook({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [period, setPeriod] = useState<string>(monthKey(new Date()));
  const [saving, setSaving] = useState(false);

  const head = useQuery({
    queryKey: ["fin-month", period],
    queryFn: async () => {
      const { data, error } = await sb
        .from("fin_month_periods")
        .select("*")
        .eq("period_month", period)
        .is("branch", null)
        .maybeSingle();
      if (error) throw error;
      return data as any | null;
    },
  });

  const lines = useQuery({
    enabled: !!head.data?.id,
    queryKey: ["fin-month-lines", head.data?.id],
    queryFn: async () => {
      const { data, error } = await sb
        .from("fin_month_lines")
        .select("*")
        .eq("period_id", head.data.id)
        .order("section")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Line[];
    },
  });

  /** Creates the month sheet — carrying last month's categories & targets forward. */
  const createMonth = async () => {
    setSaving(true);
    const { data: created, error } = await sb
      .from("fin_month_periods")
      .insert({ period_month: period, created_by: currentUserId })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      return toast.error(error.message);
    }

    const { data: prior } = await sb
      .from("fin_month_periods")
      .select("id")
      .eq("period_month", prevMonth(period))
      .is("branch", null)
      .maybeSingle();

    let template: { section: string; category: string; target: number }[] = DEFAULT_TEMPLATE.map((t, i) => ({
      ...t,
      target: 0,
      sort_order: i,
    })) as any;

    if (prior?.id) {
      const { data: priorLines } = await sb
        .from("fin_month_lines")
        .select("section, category, target, sort_order")
        .eq("period_id", prior.id);
      if (priorLines && priorLines.length) template = priorLines as any;
    }

    const { error: linesErr } = await sb.from("fin_month_lines").insert(
      template.map((t: any, i: number) => ({
        period_id: created.id,
        section: t.section,
        category: t.category,
        target: Number(t.target ?? 0),
        actual: 0,
        sort_order: t.sort_order ?? i,
      })),
    );
    setSaving(false);
    if (linesErr) return toast.error(linesErr.message);
    toast.success(`${monthLabel(period)} sheet created`);
    head.refetch();
  };

  const saveLine = async (id: string, patch: Partial<Line>) => {
    const { error } = await sb.from("fin_month_lines").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    lines.refetch();
  };

  const addLine = async (section: string) => {
    const { error } = await sb.from("fin_month_lines").insert({
      period_id: head.data.id,
      section,
      category: "New line",
      sort_order: (lines.data ?? []).filter((l) => l.section === section).length,
    });
    if (error) return toast.error(error.message);
    lines.refetch();
  };

  const removeLine = async (id: string) => {
    const { error } = await sb.from("fin_month_lines").delete().eq("id", id);
    if (error) return toast.error(error.message);
    lines.refetch();
  };

  const rows = lines.data ?? [];
  const totals = useMemo(() => {
    const by: Record<string, { target: number; actual: number }> = {};
    for (const s of SECTIONS) by[s.key] = { target: 0, actual: 0 };
    for (const r of rows) {
      by[r.section] ??= { target: 0, actual: 0 };
      by[r.section].target += Number(r.target ?? 0);
      by[r.section].actual += Number(r.actual ?? 0);
    }
    const income = by.income ?? { target: 0, actual: 0 };
    const expense = by.expense ?? { target: 0, actual: 0 };
    return {
      by,
      netTarget: income.target - expense.target,
      netActual: income.actual - expense.actual,
      closing: Number(head.data?.opening_balance ?? 0) + income.actual - expense.actual,
    };
  }, [rows, head.data]);

  const pct = (actual: number, target: number) => (target > 0 ? Math.round((actual / target) * 100) : 0);

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div>
          <Label>Month</Label>
          <Input
            type="month"
            className="mt-1 w-48"
            value={period.slice(0, 7)}
            onChange={(e) => setPeriod(`${e.target.value}-01`)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Every month gets its own ready-made sheet — categories and targets carry over automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={() => { head.refetch(); lines.refetch(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>Print / PDF</Button>
          <Button
            size="sm"
            variant="outline"
            disabled={rows.length === 0}
            onClick={() =>
              exportRows(
                `financial-workbook-${period.slice(0, 7)}`,
                ["Section", "Category", "Target", "Actual", "Variance", "% of target", "Notes"],
                rows.map((r) => [
                  titleCase(r.section),
                  r.category,
                  Number(r.target),
                  Number(r.actual),
                  Number(r.actual) - Number(r.target),
                  `${pct(Number(r.actual), Number(r.target))}%`,
                  r.notes ?? "",
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
      </Card>

      {head.isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading {monthLabel(period)}…</Card>
      ) : !head.data ? (
        <Card className="p-10 text-center text-sm">
          <p className="text-muted-foreground">
            No sheet for {monthLabel(period)} yet. Create it and last month's categories and targets are copied across
            with actuals starting at zero.
          </p>
          {canManage && (
            <Button className="mt-4" disabled={saving} onClick={createMonth}>
              <Plus className="mr-2 h-4 w-4" /> {saving ? "Creating…" : `Open ${monthLabel(period)} sheet`}
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Opening balance" value={money(head.data.opening_balance)} sub="Carried into the month" />
            <Summary
              label="Income vs target"
              value={money(totals.by.income?.actual)}
              sub={`${pct(totals.by.income?.actual ?? 0, totals.by.income?.target ?? 0)}% of ${money(totals.by.income?.target)}`}
            />
            <Summary
              label="Expenditure vs budget"
              value={money(totals.by.expense?.actual)}
              sub={`${pct(totals.by.expense?.actual ?? 0, totals.by.expense?.target ?? 0)}% of ${money(totals.by.expense?.target)}`}
            />
            <Summary
              label="Closing position"
              value={money(totals.closing)}
              sub={`Net ${money(totals.netActual)} this month`}
            />
          </div>

          <Card className="grid gap-4 p-5 md:grid-cols-3">
            <div>
              <Label>Opening balance</Label>
              <Input
                type="number"
                step="any"
                className="mt-1"
                disabled={!canManage}
                defaultValue={head.data.opening_balance}
                onBlur={async (e) => {
                  const { error } = await sb
                    .from("fin_month_periods")
                    .update({ opening_balance: Number(e.target.value || 0) })
                    .eq("id", head.data.id);
                  if (error) return toast.error(error.message);
                  head.refetch();
                }}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Month notes / commentary</Label>
              <Textarea
                rows={2}
                className="mt-1"
                disabled={!canManage}
                defaultValue={head.data.notes ?? ""}
                placeholder="What is outstanding, and what must happen to reach target this month?"
                onBlur={async (e) => {
                  const { error } = await sb
                    .from("fin_month_periods")
                    .update({ notes: e.target.value })
                    .eq("id", head.data.id);
                  if (error) return toast.error(error.message);
                }}
              />
            </div>
          </Card>

          {SECTIONS.map((s) => {
            const sectionRows = rows.filter((r) => r.section === s.key);
            const t = totals.by[s.key] ?? { target: 0, actual: 0 };
            const achieved = pct(t.actual, t.target);
            const rag = s.positive
              ? achieved >= 90 ? "green" : achieved >= 60 ? "amber" : "red"
              : achieved > 100 ? "red" : achieved > 85 ? "amber" : "green";
            return (
              <Card key={s.key} className="overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                  <p className="font-serif text-lg">{s.label}</p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={RAG_CLASS[rag as "green" | "amber" | "red"]}>
                      {money(t.actual)} of {money(t.target)} · {achieved}%
                    </Badge>
                    {canManage && (
                      <Button size="sm" variant="outline" className="print:hidden" onClick={() => addLine(s.key)}>
                        <Plus className="mr-1 h-3 w-3" /> Row
                      </Button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Target</th>
                        <th className="p-3 text-right">Actual</th>
                        <th className="p-3 text-right">Still to go</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3 print:hidden" />
                      </tr>
                    </thead>
                    <tbody>
                      {sectionRows.map((r) => {
                        const gap = Number(r.target) - Number(r.actual);
                        return (
                          <tr key={r.id} className="border-b last:border-0">
                            <td className="p-2">
                              <Input
                                className="h-8 border-transparent hover:border-input"
                                disabled={!canManage}
                                defaultValue={r.category}
                                onBlur={(e) => e.target.value !== r.category && saveLine(r.id, { category: e.target.value })}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 border-transparent text-right hover:border-input"
                                disabled={!canManage}
                                defaultValue={Number(r.target)}
                                onBlur={(e) => saveLine(r.id, { target: Number(e.target.value || 0) })}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                className="h-8 border-transparent text-right hover:border-input"
                                disabled={!canManage}
                                defaultValue={Number(r.actual)}
                                onBlur={(e) => saveLine(r.id, { actual: Number(e.target.value || 0) })}
                              />
                            </td>
                            <td className={`p-3 text-right font-mono ${gap > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                              {money(Math.max(0, gap))}
                            </td>
                            <td className="p-2">
                              <Input
                                className="h-8 border-transparent hover:border-input"
                                disabled={!canManage}
                                defaultValue={r.notes ?? ""}
                                onBlur={(e) => saveLine(r.id, { notes: e.target.value })}
                              />
                            </td>
                            <td className="p-2 text-right print:hidden">
                              {canManage && (
                                <Button size="icon" variant="ghost" onClick={() => removeLine(r.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {sectionRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                            No lines in this section yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="p-5">
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}
