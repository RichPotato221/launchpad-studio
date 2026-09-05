import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { BRANCHES, STATUS_CLASS, branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import { BUDGET_STATUS_LABEL } from "@/lib/budgets";
import { useBranchScope, filterByBranch } from "@/lib/useBranchScope";
import FinanceApprovalsTable from "@/components/finance/FinanceApprovalsTable";

const sb = supabase as any;

const prStatusLabel = (s: string) => {
  switch (s) {
    case "submitted":
      return "Awaiting Finance review";
    case "chair_approved":
    case "finance_approved":
      return "Awaiting leadership approval";
    case "senior_pastor_approved":
      return "Fully approved";
    case "returned":
      return "Returned for revision";
    default:
      return titleCase(s);
  }
};

function Pill({ status, label }: { status: string; label: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[0.65rem] uppercase tracking-widest ${STATUS_CLASS[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {label}
    </span>
  );
}

/**
 * Financial Command for the executive offices (Chairpersons, Senior Pastors,
 * Assistant / Associate Pastors): every transaction on one screen, plus the
 * two approval queues side by side — purchase requests and budgets.
 */
export default function LeadershipFinancialCommand() {
  const { data: scope } = useBranchScope();
  const [kind, setKind] = useState("all");
  const [branch, setBranch] = useState("all");
  const [search, setSearch] = useState("");

  const entries = useQuery({
    queryKey: ["leadership-finance-entries"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("finance_entries")
        .select("*")
        .is("archived_at", null)
        .order("entry_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const purchases = useQuery({
    queryKey: ["leadership-pr-queue"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("purchase_requests")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const budgets = useQuery({
    queryKey: ["leadership-budget-queue"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("budgets")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const claims = useQuery({
    queryKey: ["leadership-expense-claims"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("expense_claims")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) return [] as any[];
      return (data ?? []) as any[];
    },
  });

  const prRows = useMemo(() => filterByBranch(purchases.data ?? [], scope), [purchases.data, scope]);
  const budgetRows = useMemo(() => filterByBranch(budgets.data ?? [], scope), [budgets.data, scope]);

  /**
   * Every money movement on record, not just the general-ledger entries:
   * ledger transactions, purchase requests, department budgets and expense
   * claims are folded into one register so nothing is missing from this view.
   */
  const allRows = useMemo(() => {
    const ledger = filterByBranch(entries.data ?? [], scope).map((r: any) => ({
      id: `fe-${r.id}`,
      date: r.entry_date ?? r.created_at,
      title: r.title,
      reference: r.reference_number,
      kind: r.kind ?? "journal",
      department: r.department_slug,
      branch: r.branch,
      amount: Number(r.amount ?? 0),
      status: r.status ?? "recorded",
      statusLabel: titleCase(r.status ?? "recorded"),
    }));
    const prs = prRows.map((r: any) => ({
      id: `pr-${r.id}`,
      date: r.created_at,
      title: r.title ?? r.item_description ?? "Purchase request",
      reference: r.request_number ?? r.pr_number,
      kind: "purchase_request",
      department: r.department_slug,
      branch: r.branch,
      amount: Number(r.total_amount ?? r.estimated_cost ?? r.amount ?? 0),
      status: r.status,
      statusLabel: prStatusLabel(r.status),
    }));
    const buds = budgetRows.map((b: any) => ({
      id: `bg-${b.id}`,
      date: b.submitted_at ?? b.created_at,
      title: b.name,
      reference: b.reference_number,
      kind: "budget",
      department: b.department_slug,
      branch: b.branch,
      amount: Number(b.total_amount ?? b.requested_amount ?? 0),
      status: b.status,
      statusLabel: BUDGET_STATUS_LABEL[b.status] ?? titleCase(b.status),
    }));
    const cl = filterByBranch(claims.data ?? [], scope).map((c: any) => ({
      id: `ec-${c.id}`,
      date: c.claim_date ?? c.created_at,
      title: c.description ?? c.title ?? "Expense claim",
      reference: c.claim_number ?? c.reference_number,
      kind: "expense_claim",
      department: c.department_slug,
      branch: c.branch,
      amount: Number(c.amount ?? c.total_amount ?? 0),
      status: c.status ?? "submitted",
      statusLabel: titleCase(c.status ?? "submitted"),
    }));
    return [...ledger, ...prs, ...buds, ...cl].sort(
      (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime(),
    );
  }, [entries.data, prRows, budgetRows, claims.data, scope]);

  const rows = useMemo(() => {
    let list = allRows;
    if (kind !== "all") list = list.filter((r) => r.kind === kind);
    if (branch !== "all") list = list.filter((r) => r.branch === branch);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter((r) =>
        [r.title, r.reference, r.department].some((v) => String(v ?? "").toLowerCase().includes(q)),
      );
    return list;
  }, [allRows, kind, branch, search]);

  const totals = useMemo(() => {
    const income = rows
      .filter((r) => !["procurement", "journal", "other", "purchase_request", "budget", "expense_claim"].includes(r.kind))
      .reduce((s, r) => s + r.amount, 0);
    const spend = rows
      .filter((r) => ["procurement", "purchase_request", "expense_claim"].includes(r.kind))
      .reduce((s, r) => s + r.amount, 0);
    return { income, spend, count: rows.length };
  }, [rows]);

  const kinds = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.kind).filter(Boolean))) as string[],
    [allRows],
  );

  const exportTransactions = () =>
    exportRows(
      "financial-command-transactions",
      ["Date", "Reference", "Title", "Type", "Department", "Branch", "Amount", "Status"],
      rows.map((r) => [
        fmtDate(r.date),
        r.reference ?? "",
        r.title,
        titleCase(r.kind),
        r.department ?? "",
        branchLabel(r.branch),
        r.amount ?? 0,
        r.statusLabel,
      ]),
    );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Financial Command</p>
        <h3 className="mt-2 font-serif text-2xl">Transactions & approvals</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Every recorded transaction, together with the two approval queues — purchase requests and department budgets.
          The Financial Administrator reviews first; leadership sign-off follows.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Transactions listed" value={String(totals.count)} />
        <Stat label="Income recorded" value={money(totals.income)} />
        <Stat label="Procurement spend" value={money(totals.spend)} />
      </div>

      {/* Approvals — purchase requests one side, budgets the other */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="font-serif text-lg">Purchase request approvals</h4>
            <span className="text-xs text-muted-foreground">{prRows.length} on record</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Request</th>
                  <th className="py-2">Department</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2">Stage</th>
                </tr>
              </thead>
              <tbody>
                {purchases.isLoading && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!purchases.isLoading && prRows.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No purchase requests yet.</td></tr>
                )}
                {prRows.slice(0, 25).map((r: any) => (
                  <tr key={r.id} className="border-t border-border/60 align-top">
                    <td className="py-2 pr-2">
                      <p className="font-medium">{r.title ?? r.item_description ?? "Request"}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.request_number ?? "—"} · {fmtDate(r.created_at)} · {branchLabel(r.branch)}
                      </p>
                    </td>
                    <td className="py-2 pr-2 text-xs">{r.department_slug ?? "—"}</td>
                    <td className="py-2 pr-2 text-right">{money(r.total_amount ?? r.estimated_cost ?? r.amount)}</td>
                    <td className="py-2"><Pill status={r.status} label={prStatusLabel(r.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h4 className="font-serif text-lg">Budget approvals</h4>
            <span className="text-xs text-muted-foreground">{budgetRows.length} on record</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Budget</th>
                  <th className="py-2">Department</th>
                  <th className="py-2 text-right">Requested</th>
                  <th className="py-2">Stage</th>
                </tr>
              </thead>
              <tbody>
                {budgets.isLoading && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Loading…</td></tr>
                )}
                {!budgets.isLoading && budgetRows.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No budget requests yet.</td></tr>
                )}
                {budgetRows.slice(0, 25).map((b: any) => (
                  <tr key={b.id} className="border-t border-border/60 align-top">
                    <td className="py-2 pr-2">
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.reference_number ?? "—"} · {fmtDate(b.submitted_at ?? b.created_at)} · {branchLabel(b.branch)}
                      </p>
                    </td>
                    <td className="py-2 pr-2 text-xs">{b.department_slug ?? "—"}</td>
                    <td className="py-2 pr-2 text-right">{money(b.total_amount ?? b.requested_amount)}</td>
                    <td className="py-2">
                      <Pill status={b.status} label={BUDGET_STATUS_LABEL[b.status] ?? titleCase(b.status)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* All transactions */}
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label className="text-xs">Search</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, reference, department" />
          </div>
          <div className="w-48">
            <Label className="text-xs">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {kinds.map((k) => <SelectItem key={k} value={k}>{titleCase(k)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className="text-xs">Branch</Label>
            <Select value={branch} onValueChange={setBranch}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={exportTransactions}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Date</th>
                <th className="py-2">Transaction</th>
                <th className="py-2">Type</th>
                <th className="py-2">Department</th>
                <th className="py-2">Branch</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(entries.isLoading || purchases.isLoading || budgets.isLoading) && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading transactions…</td></tr>
              )}
              {!entries.isLoading && !purchases.isLoading && !budgets.isLoading && rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No transactions match this view.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="py-2 pr-2">
                    <p className="font-medium">{r.title}</p>
                    {r.reference && <p className="text-xs text-muted-foreground">{r.reference}</p>}
                  </td>
                  <td className="py-2 pr-2 text-xs">{titleCase(r.kind)}</td>
                  <td className="py-2 pr-2 text-xs">{r.department ?? "—"}</td>
                  <td className="py-2 pr-2 text-xs">{branchLabel(r.branch)}</td>
                  <td className="py-2 pr-2 text-right">{money(r.amount)}</td>
                  <td className="py-2"><Pill status={r.status} label={r.statusLabel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Full actioning queue for leadership sign-off */}
      <FinanceApprovalsTable financeView={false} title="Purchase request sign-off" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </Card>
  );
}
