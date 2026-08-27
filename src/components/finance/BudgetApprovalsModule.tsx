import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { fmtDate, money, titleCase, STATUS_CLASS, branchLabel } from "@/lib/finance";
import { BUDGET_STATUS_LABEL, waitingDays } from "@/lib/budgets";

const sb = supabase as any;

type Decision = { row: any; kind: "budget" | "adjustment"; mode: "approve" | "reject" } | null;

/**
 * Finance's queue for departmental budget requests and budget increase
 * requests. Approving here is what turns a request into spendable money.
 */
export default function BudgetApprovalsModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<Decision>(null);

  const budgets = useQuery({
    queryKey: ["budget-approval-queue"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("budgets")
        .select("*")
        .is("archived_at", null)
        .order("submitted_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const adjustments = useQuery({
    queryKey: ["budget-adjustment-queue"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("budget_adjustments")
        .select("*, budget:budgets(name, reference_number, total_amount)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["budget-approval-queue"] });
    qc.invalidateQueries({ queryKey: ["budget-adjustment-queue"] });
    qc.invalidateQueries({ queryKey: ["budget-positions"] });
    qc.invalidateQueries({ queryKey: ["church-finance-position"] });
    qc.invalidateQueries({ queryKey: ["budgets"] });
  };

  const all = budgets.data ?? [];
  const pending = all.filter((b) => ["submitted", "under_review"].includes(b.status));
  const decided = all.filter((b) => ["approved", "partially_approved", "rejected", "active", "locked"].includes(b.status));
  const adjPending = (adjustments.data ?? []).filter((a: any) => a.status === "submitted");
  const adjDecided = (adjustments.data ?? []).filter((a: any) => a.status !== "submitted");

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-xl">Budget approvals</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Departments submit their budgets here. Approved amounts become the department's spendable allocation, and every
          purchase request is checked against it.
        </p>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="increases">Increase requests ({adjPending.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-5 space-y-3">
          {pending.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">No budgets are waiting for approval.</Card>
          )}
          {pending.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{b.reference_number ?? "—"}</p>
                  <h4 className="font-serif text-lg">{b.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {titleCase(b.department_slug)} · {branchLabel(b.branch)} · {titleCase(b.period_label)} ·{" "}
                    {b.category ?? "Uncategorised"}
                  </p>
                  {b.purpose && <p className="mt-2 max-w-2xl text-sm">{b.purpose}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted {fmtDate(b.submitted_at)} · waiting {waitingDays(b.submitted_at)} day(s)
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl">{money(b.requested_amount ?? b.total_amount)}</p>
                  <Badge variant="outline" className={STATUS_CLASS[b.status] ?? ""}>
                    {BUDGET_STATUS_LABEL[b.status] ?? titleCase(b.status)}
                  </Badge>
                  {canManage && (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" onClick={() => setDecision({ row: b, kind: "budget", mode: "approve" })}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDecision({ row: b, kind: "budget", mode: "reject" })}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="increases" className="mt-5 space-y-3">
          {adjPending.length === 0 && (
            <Card className="p-10 text-center text-sm text-muted-foreground">No budget increase requests.</Card>
          )}
          {adjPending.map((a: any) => (
            <Card key={a.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg">{a.budget?.name ?? "Budget"}</h4>
                  <p className="text-sm text-muted-foreground">
                    {titleCase(a.department_slug)} · current allocation {money(a.budget?.total_amount)}
                  </p>
                  <p className="mt-2 max-w-2xl text-sm">{a.reason}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl">{money(a.requested_amount)}</p>
                  {canManage && (
                    <div className="mt-3 flex justify-end gap-2">
                      <Button size="sm" onClick={() => setDecision({ row: a, kind: "adjustment", mode: "approve" })}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDecision({ row: a, kind: "adjustment", mode: "reject" })}
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="completed" className="mt-5">
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[38rem] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="p-3">Reference</th>
                  <th className="p-3">Budget</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Requested</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {decided.map((b) => (
                  <tr key={b.id} className="border-b last:border-0">
                    <td className="p-3 text-xs text-muted-foreground">{b.reference_number ?? "—"}</td>
                    <td className="p-3">{b.name}</td>
                    <td className="p-3">{titleCase(b.department_slug)}</td>
                    <td className="p-3 whitespace-nowrap">{money(b.requested_amount)}</td>
                    <td className="p-3 whitespace-nowrap">{money(b.approved_amount ?? b.total_amount)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={STATUS_CLASS[b.status] ?? ""}>
                        {BUDGET_STATUS_LABEL[b.status] ?? titleCase(b.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {adjDecided.map((a: any) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3 text-xs text-muted-foreground">Increase</td>
                    <td className="p-3">{a.budget?.name ?? "Budget"}</td>
                    <td className="p-3">{titleCase(a.department_slug)}</td>
                    <td className="p-3 whitespace-nowrap">{money(a.requested_amount)}</td>
                    <td className="p-3 whitespace-nowrap">{money(a.approved_amount)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={STATUS_CLASS[a.status] ?? ""}>{titleCase(a.status)}</Badge>
                    </td>
                  </tr>
                ))}
                {decided.length === 0 && adjDecided.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-sm text-muted-foreground">
                      Nothing has been decided yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>

      <DecisionDialog decision={decision} currentUserId={currentUserId} onClose={() => setDecision(null)} onDone={refresh} />
    </div>
  );
}

function DecisionDialog({
  decision,
  currentUserId,
  onClose,
  onDone,
}: {
  decision: Decision;
  currentUserId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const requested = Number(decision?.row?.requested_amount ?? decision?.row?.total_amount ?? 0);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const approving = decision?.mode === "approve";

  const submit = async () => {
    if (!decision) return;
    const approved = Number(amount || requested);
    if (approving && approved <= 0) return toast.error("Enter the amount you are approving.");
    if (!approving && !reason.trim()) return toast.error("A reason is required when declining.");
    setSaving(true);
    const now = new Date().toISOString();

    if (decision.kind === "budget") {
      const status = approving ? (approved < requested ? "partially_approved" : "approved") : "rejected";
      const { error } = await sb
        .from("budgets")
        .update({
          status,
          approved_amount: approving ? approved : null,
          total_amount: approving ? approved : decision.row.total_amount,
          approved_by: approving ? currentUserId : null,
          approved_at: approving ? now : null,
          rejected_reason: approving ? null : reason.trim(),
          rejected_at: approving ? null : now,
        })
        .eq("id", decision.row.id);
      setSaving(false);
      if (error) return toast.error(error.message);
    } else {
      const budgetId = decision.row.budget_id;
      const { error } = await sb
        .from("budget_adjustments")
        .update({
          status: approving ? "approved" : "rejected",
          approved_amount: approving ? approved : null,
          decision_reason: reason.trim() || null,
          decided_by: currentUserId,
          decided_at: now,
        })
        .eq("id", decision.row.id);
      if (!error && approving) {
        const newTotal = Number(decision.row.budget?.total_amount ?? 0) + approved;
        await sb.from("budgets").update({ total_amount: newTotal, approved_amount: newTotal }).eq("id", budgetId);
      }
      setSaving(false);
      if (error) return toast.error(error.message);
    }

    toast.success(approving ? "Approved" : "Declined");
    setAmount("");
    setReason("");
    onClose();
    onDone();
  };

  return (
    <Dialog open={!!decision} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{approving ? "Approve request" : "Decline request"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Requested: {money(requested)}</p>
          {approving && (
            <div>
              <Label>Amount approved (R)</Label>
              <Input
                type="number"
                min="0"
                value={amount}
                placeholder={String(requested)}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to approve the full amount. A lower amount is recorded as a partial approval.
              </p>
            </div>
          )}
          <div>
            <Label>{approving ? "Note (optional)" : "Reason for declining"}</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button disabled={saving} onClick={submit}>{approving ? "Confirm approval" : "Confirm decline"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
