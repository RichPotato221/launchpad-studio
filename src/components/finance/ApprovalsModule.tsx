import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { branchLabel, exportRows, fmtDate, money, STATUS_CLASS, titleCase } from "@/lib/finance";
import FinanceApprovalsTable from "@/components/finance/FinanceApprovalsTable";


const sb = supabase as any;

const FLOW: Record<string, { next: string; label: string }> = {
  pending: { next: "chair_approved", label: "Chairperson approve" },
  chair_approved: { next: "senior_pastor_approved", label: "Senior Pastor authorise" },
  senior_pastor_approved: { next: "paid", label: "Mark as paid" },
};

export default function ApprovalsModule({
  canManage,
  currentUserId,
}: {
  canManage: boolean;
  currentUserId: string;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");

  const claims = useQuery({
    queryKey: ["finance-approvals", status],
    queryFn: async () => {
      let q = sb
        .from("expense_claims")
        .select("*, claimant:profiles!expense_claims_claimant_id_fkey(id, full_name, email)")
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (status === "open") q = q.in("status", ["pending", "chair_approved", "senior_pastor_approved"]);
      else if (status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rows = useMemo(() => {
    const list = claims.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter((r) =>
      [r.description, r.claim_type, r.department_slug, r.claimant?.full_name]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [claims.data, search]);

  const advance = useMutation({
    mutationFn: async ({ row, next }: { row: any; next: string }) => {
      const patch: any = { status: next };
      if (next === "chair_approved") patch.approved_by_chair = currentUserId;
      if (next === "senior_pastor_approved") patch.approved_by_senior = currentUserId;
      if (next === "paid") patch.paid_at = new Date().toISOString();
      const { error } = await sb.from("expense_claims").update(patch).eq("id", row.id);
      if (error) throw error;

      if (row.claimant_id) {
        await sb.from("notifications").insert({
          user_id: row.claimant_id,
          title:
            next === "rejected"
              ? "Expense claim rejected"
              : next === "paid"
                ? "Expense claim paid"
                : "Expense claim approved",
          message: `${money(row.amount)} — ${row.description}`,
          link: "/finance",
          type: "finance_claim",
          branch: row.branch ?? null,
        });
      }
    },
    onSuccess: () => {
      toast.success("Approval workflow updated and the claimant was notified.");
      qc.invalidateQueries({ queryKey: ["finance-approvals"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not update the claim"),
  });

  return (
    <div className="space-y-4">
      <FinanceApprovalsTable financeView title="Approvals & payments — purchase requests" />

      <Card className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Expense claim workflow</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Department submits → Finance reviews → Chairperson approves → Senior Pastor authorises → Payment processed.
          Every step is written to the audit trail and notifies the claimant.
        </p>
      </Card>


      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Input
          placeholder="Search claims…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open (awaiting action)</SelectItem>
            <SelectItem value="all">All claims</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => claims.refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportRows(
              "finance-approvals",
              ["Date", "Claimant", "Department", "Branch", "Type", "Description", "Amount", "Status"],
              rows.map((r) => [
                r.created_at?.slice(0, 10), r.claimant?.full_name, r.department_slug, r.branch,
                r.claim_type, r.description, r.amount, r.status,
              ]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Excel (CSV)
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>Print / PDF</Button>
      </div>

      {claims.isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Loading approvals…</Card>
      ) : claims.error ? (
        <Card className="p-10 text-center text-sm text-red-700">Could not load approvals.</Card>
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Nothing is awaiting approval. </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const step = FLOW[r.status];
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg">{money(r.amount)}</p>
                    <p className="text-sm">{r.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.claimant?.full_name ?? "Member"} · {titleCase(r.department_slug)} · {branchLabel(r.branch)} ·{" "}
                      {r.claim_type ?? "Uncategorised"} · {fmtDate(r.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={STATUS_CLASS[r.status] ?? ""}>{titleCase(r.status)}</Badge>
                    {r.receipt_url && (
                      <a className="text-xs underline" href={r.receipt_url} target="_blank" rel="noreferrer">
                        Supporting document
                      </a>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    {step && (
                      <Button size="sm" onClick={() => advance.mutate({ row: r, next: step.next })}>
                        {step.label}
                      </Button>
                    )}
                    {!["rejected", "paid"].includes(r.status) && (
                      <Button size="sm" variant="outline" onClick={() => advance.mutate({ row: r, next: "rejected" })}>
                        Reject
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
