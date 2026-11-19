import { financeAction } from "@/lib/financeData";
import FinanceAttachment from "@/components/finance/FinanceAttachment";
import { canApprovePurchase, canMarkPurchasePaid, isFinanceReviewer } from "@/lib/financeRules";
import { notifyPurchaseRequest } from "@/lib/activity.functions";
import { useBranchScope, filterByBranch } from "@/lib/useBranchScope";
import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, RefreshCw } from "lucide-react";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";

const sb = supabase as any;

/** Offices that form the leadership approval queue (step 2). */
export const LEADERSHIP_ROLES = ["lead_pastor", "associate_pastor", "senior_apostle", "chairperson"];
/**
 * Only the Finance Administration team performs step 1. Chairpersons and
 * pastors sign off afterwards — they may never clear the Finance review
 * themselves, so no leadership office belongs in this list.
 */
const FINANCE_ROLES: string[] = [];

const PAYMENT_STATUSES = [
  { value: "waiting_finance_review", label: "Waiting for Finance Review" },
  { value: "waiting_leadership_approval", label: "Waiting for Leadership Approval" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "not_paid", label: "Not Paid" },
];

const paymentLabel = (v: string) => PAYMENT_STATUSES.find((p) => p.value === v)?.label ?? titleCase(v);

const approvalLabel = (status: string) => {
  switch (status) {
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
      return titleCase(status);
  }
};

const statusTone = (status: string) =>
  status === "senior_pastor_approved" || status === "received"
    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
    : status === "rejected"
      ? "border-red-300 bg-red-50 text-red-800"
      : status === "returned"
        ? "border-amber-300 bg-amber-50 text-amber-800"
        : "border-border bg-muted text-muted-foreground";

type Props = {
  /** When true the Finance Administrator controls (step 1 + payment status) are shown. */
  financeView?: boolean;
  title?: string;
};

/**
 * Approvals & Payments queue for every purchase request raised anywhere in the
 * church. Finance reviews first, then Assistant / Senior Pastors and
 * Chairpersons. Every decision is kept forever in the evaluations trail.
 */
export default function FinanceApprovalsTable({ financeView = true, title = "Purchase request approvals" }: Props) {
  const role = useCurrentRole();
  const myRoles = role.data?.roles ?? [];
  const { data: scope } = useBranchScope();
  const [memberships, setMemberships] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [paymentAccounts, setPaymentAccounts] = useState<Record<string, string>>({});
  const userId = role.data?.userId ?? null;

  const [rows, setRows] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<Record<string, any[]>>({});
  const [people, setPeople] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("open");
  const [openRow, setOpenRow] = useState<string | null>(null);

  const [profileName, setProfileName] = useState<string>("");
  const [primaryDept, setPrimaryDept] = useState<string | null>(null);

  const isFinanceAdmin =
    financeView &&
    (myRoles.includes("finance_officer") || memberships.some(d => ["finance", "finance-administration"].includes(d)) ||
      ["finance", "finance-administration"].includes(primaryDept ?? ""));
  const isLeadership = myRoles.some((r) => LEADERSHIP_ROLES.includes(r));
  const myRoleLabel = myRoles[0] ? titleCase(myRoles[0]) : "Member";

  useEffect(() => {
    if (!userId) return;
    sb.from("user_roles").select("department_slug").eq("user_id", userId).then(({ data }: any) => setMemberships((data ?? []).map((r: any) => r.department_slug).filter(Boolean)));
    sb.from("bank_accounts").select("id, name").eq("is_active", true).is("archived_at", null).then(({ data }: any) => setAccounts(data ?? []));
    sb.from("profiles")
      .select("full_name, primary_department")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }: any) => {
        setProfileName(data?.full_name ?? "");
        setPrimaryDept(data?.primary_department ?? null);
      });
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data: prs, error } = await sb
      .from("purchase_requests")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message ?? "Could not load requests");
    // Requests raised before the two-step workflow used the old "chair_approved"
    // stage — treat them as Finance-approved so they join the leadership queue.
    const list = ((prs ?? []) as any[]).map((r) =>
      r.status === "chair_approved"
        ? {
            ...r,
            status: "finance_approved",
            finance_approved_by: r.finance_approved_by ?? r.approved_by_chair,
            finance_approved_at: r.finance_approved_at ?? r.chair_approved_at,
            payment_status: r.payment_status ?? "waiting_leadership_approval",
          }
        : r,
    );

    const ids = Array.from(
      new Set(list.flatMap((r) => [r.requester_id, r.finance_approved_by, r.approved_by_senior]).filter(Boolean)),
    );
    let map: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("id, full_name, email").in("id", ids);
      map = Object.fromEntries(((profs ?? []) as any[]).map((p) => [p.id, p]));
    }

    let byRequest: Record<string, any[]> = {};
    if (list.length) {
      const { data: decs } = await sb
        .from("finance_approval_decisions")
        .select("*")
        .in("request_id", list.map((r) => r.id))
        .order("created_at", { ascending: true });
      for (const d of (decs ?? []) as any[]) {
        (byRequest[d.request_id] ||= []).push(d);
      }
    }

    setPeople(map);
    setDecisions(byRequest);
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actor = { userId: userId ?? "", roles: myRoles, departments: [...memberships, primaryDept ?? ""] };
  const runDecision = async (row: any, decision: "approved" | "rejected" | "returned") => {
    if (!canApprovePurchase(actor, row)) return toast.error("This approval requires a different authorised person.");
    const reason = decision === "approved" ? (window.prompt("Approval note (optional)") ?? "") : (window.prompt("Reason (required)") ?? "");
    if (decision !== "approved" && !reason.trim()) return toast.error("A reason is required.");
    try {
      await financeAction("purchase_requests", row.id, decision === "approved" ? "approve" : decision === "returned" ? "return" : "reject", undefined, reason);
      try { await notifyPurchaseRequest({ data: { requestId: row.id, stage: decision === "rejected" ? "rejected" : row.status === "finance_approved" ? "approved" : "department_approved", comment: reason } }); }
      catch { toast.warning("Decision saved; email notification could not be sent. The in-portal notice remains recorded."); }
      toast.success("Decision recorded"); load();
    } catch (e: any) { toast.error(e.message ?? "Decision failed"); }
  };
  const financeDecision = runDecision;
  const leadershipDecision = runDecision;
  const setPaymentStatus = async (row: any, value: string) => {
    if (value !== "paid" || !canMarkPurchasePaid(row)) return toast.error("Payment cannot be reset or bypass approval.");
    const account = paymentAccounts[row.id] ?? row.bank_account_id;
    if (!account) return toast.error("Choose the bank or cash account first.");
    try { await financeAction("purchase_requests", row.id, "pay", undefined, undefined, account); toast.success("Payment posted once"); load(); }
    catch (e: any) { toast.error(e.message ?? "Payment failed"); }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return filterByBranch(rows, scope).filter((r) => {
      // Requests raised before the two-step workflow used "chair_approved".
      if (filter === "open" && !["submitted", "finance_approved", "returned"].includes(r.status)) return false;
      if (filter === "finance" && r.status !== "submitted") return false;
      if (filter === "leadership" && r.status !== "finance_approved") return false;
      if (filter === "approved" && r.status !== "senior_pastor_approved" && r.payment_status !== "approved") return false;
      if (filter === "paid" && r.payment_status !== "paid") return false;
      if (filter === "rejected" && r.status !== "rejected") return false;
      if (!term) return true;
      return `${r.pr_number ?? ""} ${r.title ?? ""} ${r.department_slug ?? ""} ${r.description ?? ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [rows, filter, search, scope]);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Finance Administrator reviews first, then Assistant Pastors, Senior Pastors or the Chairperson. A request is
            fully approved once Finance and at least one of those offices have approved it. Every decision is kept.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Input
            placeholder="Search requests…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-52"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open (awaiting action)</SelectItem>
              <SelectItem value="finance">Waiting for Finance review</SelectItem>
              <SelectItem value="leadership">Waiting for Leadership</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All requests</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "finance-approvals-register",
                ["Request ID", "Title", "Department", "Requested by", "Description", "Amount", "Submitted", "Approval status", "Payment status"],
                filtered.map((r) => [
                  r.pr_number ?? r.id,
                  r.title,
                  r.department_slug ?? "",
                  people[r.requester_id]?.full_name ?? "",
                  r.description ?? "",
                  Number(r.amount_estimated ?? 0),
                  fmtDate(r.created_at),
                  approvalLabel(r.status),
                  paymentLabel(r.payment_status ?? "waiting_finance_review"),
                ]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (.xlsx)
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[0.68rem] uppercase tracking-widest text-muted-foreground">
              <th className="py-2 pr-3">Request ID</th>
              <th className="py-2 pr-3">Title</th>
              <th className="py-2 pr-3">Department</th>
              <th className="py-2 pr-3">Requested by</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Submitted</th>
              <th className="py-2 pr-3">Approval status</th>
              <th className="py-2 pr-3">Payment status</th>
              <th className="py-2 pr-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">Loading requests…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No requests match this filter.</td></tr>
            )}
            {filtered.map((r) => {
              const trail = decisions[r.id] ?? [];
              const expanded = openRow === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="border-b border-border/60 align-top">
                    <td className="py-3 pr-3 font-mono text-xs">{r.pr_number ?? String(r.id).slice(0, 8)}</td>
                    <td className="py-3 pr-3">
                      <button className="text-left font-medium hover:underline" onClick={() => setOpenRow(expanded ? null : r.id)}>
                        {r.title}
                      </button>
                      <p className="text-xs text-muted-foreground">{branchLabel(r.branch)} · {titleCase(r.priority ?? "normal")} priority</p>
                    </td>
                    <td className="py-3 pr-3">{titleCase((r.department_slug ?? "").replace(/-/g, " "))}</td>
                    <td className="py-3 pr-3">{people[r.requester_id]?.full_name ?? people[r.requester_id]?.email ?? "—"}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{money(r.amount_actual ?? r.amount_estimated)}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                    <td className="py-3 pr-3">
                      <Badge variant="outline" className={statusTone(r.status)}>{approvalLabel(r.status)}</Badge>
                    </td>
                    <td className="py-3 pr-3">
                      {isFinanceAdmin && canMarkPurchasePaid(r) ? (
                        <div className="space-y-2">
                          <Select value={paymentAccounts[r.id] ?? r.bank_account_id ?? ""} onValueChange={v => setPaymentAccounts(prev => ({ ...prev, [r.id]: v }))}>
                            <SelectTrigger className="w-[215px]"><SelectValue placeholder="Payment account" /></SelectTrigger>
                            <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => setPaymentStatus(r, "paid")}>Mark paid</Button>
                        </div>
                      ) : <span className="text-xs">{paymentLabel(r.payment_status ?? "waiting_finance_review")}</span>}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <div className="flex flex-wrap justify-end gap-1 print:hidden">
                        {isFinanceAdmin && canApprovePurchase(actor, r) && ["submitted", "returned"].includes(r.status) && (
                          <>
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "rejected")}>Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "returned")}>Return</Button>
                          </>
                        )}
                        {isLeadership && canApprovePurchase(actor, r) && r.status === "finance_approved" && (
                          <>
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => leadershipDecision(r, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => leadershipDecision(r, "rejected")}>Reject</Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpenRow(expanded ? null : r.id)}>
                          {expanded ? "Hide" : "Details"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-border/60 bg-muted/40">
                      <td colSpan={9} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Description</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">{r.description || "No motivation captured."}</p>
                            {r.quote_url && (
                              <FinanceAttachment value={r.quote_url} label={r.quote_name ?? "Quotation"} />
                            )}
                            {r.rejection_reason && <p className="mt-2 text-xs text-red-700">Reason: {r.rejection_reason}</p>}
                            {r.finance_comment && <p className="mt-2 text-xs text-amber-700">Finance note: {r.finance_comment}</p>}
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Evaluations &amp; approval history</p>
                            {trail.length === 0 ? (
                              <p className="mt-1 text-sm text-muted-foreground">No decisions recorded yet.</p>
                            ) : (
                              <ul className="mt-2 space-y-2">
                                {trail.map((d) => (
                                  <li key={d.id} className="rounded border border-border bg-background p-2 text-xs">
                                    <span className="font-medium">{d.decider_name ?? "Leader"}</span> · {d.decider_role ?? "—"} ·{" "}
                                    {titleCase(d.stage)} stage
                                    <Badge variant="outline" className={`ml-2 ${statusTone(d.decision === "approved" ? "senior_pastor_approved" : d.decision === "rejected" ? "rejected" : "returned")}`}>
                                      {titleCase(d.decision)}
                                    </Badge>
                                    <p className="mt-1 text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                                    {d.reason && <p className="mt-1">Reason: {d.reason}</p>}
                                    {d.comment && <p className="mt-1">Comment: {d.comment}</p>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
