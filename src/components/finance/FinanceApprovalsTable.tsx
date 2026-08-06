import { useEffect, useMemo, useState } from "react";
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
/** Offices that act as the Finance Administrator (step 1). */
const FINANCE_ROLES = ["finance_officer", "chairperson"];

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
    (myRoles.some((r) => FINANCE_ROLES.includes(r)) ||
      ["finance", "finance-administration"].includes(primaryDept ?? ""));
  const isLeadership = myRoles.some((r) => LEADERSHIP_ROLES.includes(r));
  const myRoleLabel = myRoles[0] ? titleCase(myRoles[0]) : "Member";

  useEffect(() => {
    if (!userId) return;
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
    const list = (prs ?? []) as any[];

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

  const notify = async (userIds: string[], heading: string, message: string, link: string, branch: string | null) => {
    const unique = Array.from(new Set(userIds.filter(Boolean)));
    if (!unique.length) return;
    await sb.from("notifications").insert(
      unique.map((id) => ({
        user_id: id,
        title: heading,
        message,
        link,
        type: "procurement",
        branch: branch ?? null,
      })),
    );
  };

  const recordDecision = async (row: any, stage: string, decision: string, reason: string | null, comment: string | null) => {
    await sb.from("finance_approval_decisions").insert({
      request_type: "purchase_request",
      request_id: row.id,
      request_ref: row.pr_number ?? null,
      stage,
      decision,
      reason,
      comment,
      decided_by: userId,
      decider_role: myRoleLabel,
      decider_name: profileName || null,
    });
    await sb.rpc("log_audit", {
      _action: `finance_${decision}`,
      _entity: "purchase_requests",
      _entity_id: String(row.id),
      _details: { stage, reason, comment, role: myRoleLabel, pr_number: row.pr_number ?? null },
    });
  };

  /** Finance Administrator — step 1. */
  const financeDecision = async (row: any, decision: "approved" | "rejected" | "returned") => {
    let reason: string | null = null;
    if (decision !== "approved") {
      reason = window.prompt(decision === "rejected" ? "Reason for rejection (required)" : "What must be revised? (required)");
      if (!reason || !reason.trim()) return toast.error("A reason is required.");
      reason = reason.trim();
    }
    const patch: any =
      decision === "approved"
        ? {
            status: "finance_approved",
            payment_status: "waiting_leadership_approval",
            finance_approved_by: userId,
            finance_approved_at: new Date().toISOString(),
          }
        : decision === "rejected"
          ? { status: "rejected", payment_status: "not_paid", rejection_reason: reason }
          : { status: "returned", payment_status: "waiting_finance_review", finance_comment: reason };

    const { error } = await sb.from("purchase_requests").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    await recordDecision(row, "finance", decision, reason, null);

    if (decision === "approved") {
      const { data: leaders } = await sb.from("user_roles").select("user_id").in("role", LEADERSHIP_ROLES);
      await notify(
        ((leaders ?? []) as any[]).map((l) => l.user_id),
        `Approval required — ${row.pr_number ?? "purchase request"}`,
        `${row.title} · ${money(row.amount_estimated)}`,
        "/senior-pastor-cockpit",
        row.branch ?? null,
      );
    }
    await notify(
      [row.requester_id],
      `Purchase request ${row.pr_number ?? ""} — Finance ${decision}`,
      reason ?? row.title,
      "/departments/finance",
      row.branch ?? null,
    );
    toast.success(`Finance decision recorded: ${titleCase(decision)}`);
    load();
  };

  /** Assistant / Senior Pastor or Chairperson — step 2. */
  const leadershipDecision = async (row: any, decision: "approved" | "rejected") => {
    let reason: string | null = null;
    if (decision === "rejected") {
      reason = window.prompt("Reason for rejection (required)");
      if (!reason || !reason.trim()) return toast.error("A reason is required.");
      reason = reason.trim();
    }
    const comment = decision === "approved" ? window.prompt("Approval comment (optional)") : null;

    const patch: any =
      decision === "approved"
        ? {
            status: "senior_pastor_approved",
            payment_status: "approved",
            approved_by_senior: userId,
            senior_approved_at: new Date().toISOString(),
            senior_comment: comment || null,
          }
        : { status: "rejected", payment_status: "not_paid", rejection_reason: reason };

    const { error } = await sb.from("purchase_requests").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    await recordDecision(row, "leadership", decision, reason, comment || null);
    await notify(
      [row.requester_id, row.finance_approved_by],
      `Purchase request ${row.pr_number ?? ""} — ${titleCase(decision)}`,
      reason ?? row.title,
      "/departments/finance",
      row.branch ?? null,
    );
    toast.success(`Decision recorded: ${titleCase(decision)}`);
    load();
  };

  const setPaymentStatus = async (row: any, value: string) => {
    const patch: any = { payment_status: value };
    if (value === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await sb.from("purchase_requests").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    await sb.rpc("log_audit", {
      _action: "finance_payment_status",
      _entity: "purchase_requests",
      _entity_id: String(row.id),
      _details: { payment_status: value, role: myRoleLabel },
    });
    toast.success(`Payment status set to ${paymentLabel(value)}`);
    load();
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
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
  }, [rows, filter, search]);

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
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
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
                <>
                  <tr key={r.id} className="border-b border-border/60 align-top">
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
                      {isFinanceAdmin ? (
                        <Select value={r.payment_status ?? "waiting_finance_review"} onValueChange={(v) => setPaymentStatus(r, v)}>
                          <SelectTrigger className="h-8 w-[215px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PAYMENT_STATUSES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{paymentLabel(r.payment_status ?? "waiting_finance_review")}</span>
                      )}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      <div className="flex flex-wrap justify-end gap-1 print:hidden">
                        {isFinanceAdmin && ["submitted", "returned"].includes(r.status) && (
                          <>
                            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "approved")}>Approve</Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "rejected")}>Reject</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => financeDecision(r, "returned")}>Return</Button>
                          </>
                        )}
                        {isLeadership && r.status === "finance_approved" && (
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
                    <tr key={`${r.id}-detail`} className="border-b border-border/60 bg-muted/40">
                      <td colSpan={9} className="p-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Description</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm">{r.description || "No motivation captured."}</p>
                            {r.quote_url && (
                              <a href={r.quote_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">
                                📎 {r.quote_name ?? "Quotation"}
                              </a>
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
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
