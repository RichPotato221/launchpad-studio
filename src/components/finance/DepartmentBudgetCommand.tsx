import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, TrendingUp } from "lucide-react";
import { fmtDate, money, titleCase, STATUS_CLASS } from "@/lib/finance";
import {
  BUDGET_CATEGORIES,
  BUDGET_PERIODS,
  BUDGET_PRIORITIES,
  BUDGET_STATUS_LABEL,
  sumPositions,
  useBudgetPositions,
  utilisationBand,
  type BudgetPosition,
} from "@/lib/budgets";

const sb = supabase as any;

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-xl md:text-2xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

/**
 * A department's own Financial Command: what it was allocated, what it has
 * spent, committed and requested, and what it may still spend. Every figure is
 * calculated in the database from real purchase requests and payments.
 */
export default function DepartmentBudgetCommand({
  slug,
  currentUserId,
  canManage,
}: {
  slug: string;
  currentUserId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const positions = useBudgetPositions(slug);
  const [openBudget, setOpenBudget] = useState(false);
  const [increaseFor, setIncreaseFor] = useState<BudgetPosition | null>(null);

  const rows = positions.data ?? [];
  const totals = useMemo(() => sumPositions(rows.filter((r) => ["approved", "active", "locked"].includes(r.status))), [rows]);
  const band = utilisationBand(totals.utilisation);

  const activity = useQuery({
    queryKey: ["dept-budget-activity", slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from("purchase_requests")
        .select("id, pr_number, title, category, amount_estimated, amount_actual, status, payment_status, created_at, budget_id")
        .eq("department_slug", slug)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const adjustments = useQuery({
    queryKey: ["budget-adjustments", slug],
    queryFn: async () => {
      const { data, error } = await sb
        .from("budget_adjustments")
        .select("*")
        .eq("department_slug", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["budget-positions"] });
    qc.invalidateQueries({ queryKey: ["budget-adjustments", slug] });
    qc.invalidateQueries({ queryKey: ["church-finance-position"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Figure label="Allocated budget" value={money(totals.allocated)} />
        <Figure label="Spent" value={money(totals.spent)} hint="Actually paid" />
        <Figure label="Committed" value={money(totals.committed)} hint="Approved, not yet paid" />
        <Figure label="Pending approval" value={money(totals.pending)} />
        <Figure label="Available" value={money(totals.available)} hint="Still spendable" />
        <Card className="p-4">
          <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">Utilisation</p>
          <p className="mt-1 font-serif text-xl md:text-2xl">{totals.utilisation.toFixed(1)}%</p>
          <Badge variant="outline" className={`mt-1 ${band.className}`}>{band.label}</Badge>
        </Card>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, totals.utilisation)}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl">Budget management</h3>
          <p className="text-sm text-muted-foreground">
            Every budget this department has requested, and how much of it is left.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenBudget(true)}>
          <Plus className="mr-1 h-4 w-4" /> Create budget
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
              <th className="p-3">Reference</th>
              <th className="p-3">Budget</th>
              <th className="p-3">Period</th>
              <th className="p-3">Allocated</th>
              <th className="p-3">Spent</th>
              <th className="p-3">Committed</th>
              <th className="p-3">Available</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const rb = utilisationBand(Number(b.utilisation_pct ?? 0));
              return (
                <tr key={b.budget_id} className="border-b last:border-0 align-top">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">{b.reference_number ?? "—"}</td>
                  <td className="p-3">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.category ?? titleCase(b.budget_type)}</p>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {titleCase(b.period_label)}
                    <br />
                    {b.period_start ? `${fmtDate(b.period_start)} → ${fmtDate(b.period_end)}` : b.fiscal_year}
                  </td>
                  <td className="p-3 whitespace-nowrap">{money(b.allocated)}</td>
                  <td className="p-3 whitespace-nowrap">{money(b.spent)}</td>
                  <td className="p-3 whitespace-nowrap">{money(b.committed)}</td>
                  <td className="p-3 whitespace-nowrap font-medium">{money(b.available)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_CLASS[b.status] ?? ""}>
                      {BUDGET_STATUS_LABEL[b.status] ?? titleCase(b.status)}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Number(b.utilisation_pct ?? 0).toFixed(1)}% · {rb.label}
                    </p>
                  </td>
                  <td className="p-3">
                    {["approved", "active", "locked"].includes(b.status) && (
                      <Button size="sm" variant="outline" onClick={() => setIncreaseFor(b)}>
                        <TrendingUp className="mr-1 h-3.5 w-3.5" /> Increase
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                  No budgets yet. Create one to request funding for this department.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {(adjustments.data ?? []).length > 0 && (
        <Card className="p-5">
          <h4 className="font-serif text-lg">Budget increase requests</h4>
          <div className="mt-3 space-y-2 text-sm">
            {(adjustments.data ?? []).map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                <span>
                  {money(a.requested_amount)} — {a.reason}
                </span>
                <Badge variant="outline" className={STATUS_CLASS[a.status] ?? ""}>
                  {titleCase(a.status)}
                  {a.approved_amount != null ? ` · ${money(a.approved_amount)}` : ""}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="font-serif text-2xl">Budget activity</h3>
        <Card className="mt-3 overflow-x-auto p-0">
          <table className="w-full min-w-[38rem] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-3">Date</th>
                <th className="p-3">Request</th>
                <th className="p-3">Category</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(activity.data ?? []).map((r: any) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="p-3">
                    {r.title}
                    <span className="block text-xs text-muted-foreground">{r.pr_number}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.category ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{money(r.amount_actual ?? r.amount_estimated)}</td>
                  <td className="p-3">
                    <Badge variant="outline" className={STATUS_CLASS[r.payment_status === "paid" ? "paid" : r.status] ?? ""}>
                      {r.payment_status === "paid" ? "Paid" : titleCase(r.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
              {(activity.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                    No spending activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <CreateBudgetDialog
        open={openBudget}
        onOpenChange={setOpenBudget}
        slug={slug}
        currentUserId={currentUserId}
        canApproveImmediately={canManage}
        onSaved={refresh}
      />
      <IncreaseDialog budget={increaseFor} onClose={() => setIncreaseFor(null)} onSaved={refresh} />
    </div>
  );
}

function CreateBudgetDialog({
  open,
  onOpenChange,
  slug,
  currentUserId,
  canApproveImmediately,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  currentUserId: string;
  canApproveImmediately: boolean;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    period_label: "annual",
    category: "Equipment",
    period_start: "",
    period_end: "",
    requested_amount: "",
    priority: "normal",
    purpose: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (asDraft: boolean) => {
    if (!form.name.trim() || !Number(form.requested_amount)) {
      toast.error("A budget name and a requested amount are required.");
      return;
    }
    setSaving(true);
    const { data: inserted, error } = await sb.from("budgets").insert({
      name: form.name.trim(),
      department_slug: slug,
      budget_type: "department",
      fiscal_year: new Date(form.period_start || Date.now()).getFullYear(),
      period_label: form.period_label,
      category: form.category,
      period_start: form.period_start || null,
      period_end: form.period_end || null,
      requested_amount: Number(form.requested_amount),
      total_amount: Number(form.requested_amount),
      priority: form.priority,
      purpose: form.purpose.trim() || null,
      notes: form.notes.trim() || null,
      responsible_user_id: currentUserId,
      created_by: currentUserId,
      status: asDraft ? "draft" : "submitted",
      submitted_by: asDraft ? null : currentUserId,
      submitted_at: asDraft ? null : new Date().toISOString(),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(asDraft ? "Budget saved as draft" : "Budget submitted to Finance for approval");
    onOpenChange(false);
    setForm({ ...form, name: "", requested_amount: "", purpose: "", notes: "" });
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a department budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Budget name</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Media Equipment 2026" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Budget period</Label>
              <Select value={form.period_label} onValueChange={(v) => set("period_label", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_PERIODS.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={form.period_end} onChange={(e) => set("period_end", e.target.value)} />
            </div>
            <div>
              <Label>Requested amount (R)</Label>
              <Input
                type="number"
                min="0"
                value={form.requested_amount}
                onChange={(e) => set("requested_amount", e.target.value)}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUDGET_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>What is this budget for?</Label>
            <Textarea
              rows={3}
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="e.g. Purchase 4 wireless microphones and 2 monitor speakers for Sunday services and conferences."
            />
          </div>
          <div>
            <Label>Supporting notes (quotations, suppliers, plans)</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">
            A submitted budget is not spendable money until Finance approves it. Quotations and documents can be attached
            to each purchase request raised against this budget.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" disabled={saving} onClick={() => submit(true)}>Save draft</Button>
            <Button disabled={saving} onClick={() => submit(false)}>
              {canApproveImmediately ? "Submit for approval" : "Submit to Finance"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IncreaseDialog({
  budget,
  onClose,
  onSaved,
}: {
  budget: BudgetPosition | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!budget || !Number(amount) || !reason.trim()) {
      toast.error("An amount and a reason are required.");
      return;
    }
    setSaving(true);
    const { error } = await sb.from("budget_adjustments").insert({
      budget_id: budget.budget_id,
      department_slug: budget.department_slug,
      requested_amount: Number(amount),
      reason: reason.trim(),
      status: "submitted",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Budget increase request sent to Finance");
    setAmount("");
    setReason("");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={!!budget} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a budget increase</DialogTitle>
        </DialogHeader>
        {budget && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {budget.name} — currently {money(budget.allocated)}, {money(budget.available)} available.
            </p>
            <div>
              <Label>Additional amount (R)</Label>
              <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Reason</Label>
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button disabled={saving} onClick={submit}>Send to Finance</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
