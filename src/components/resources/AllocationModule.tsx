import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { money, fmtDate, exportRows, BRANCHES, branchLabel } from "@/lib/finance";
import { PRIORITIES, REQUESTABLE_ITEMS, REQUEST_STATUS_LABELS, titleish } from "@/lib/resources";
import { notifyPurchaseRequest } from "@/lib/activity.functions";


const sb = supabase as any;

const EMPTY = {
  title: "", purpose: "", event_name: "", department_slug: "", branch: "",
  responsible_officer: "", start_date: "", return_date: "", priority: "normal",
  budget_impact: "", notes: "",
};

/**
 * MODULE 4 — Resource Allocation & Request System.
 * Every department requests resources here; the Resource Administrator reviews,
 * the Chairperson approves high-impact requests, and issue/return is tracked.
 */
export default function AllocationModule({ canManage, isChair, currentUserId }: { canManage: boolean; isChair: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [filter, setFilter] = useState("open");

  const load = async () => {
    const [r, d, p] = await Promise.all([
      sb.from("res_requests").select("*").order("created_at", { ascending: false }),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setRows(r.data ?? []); setDepts(d.data ?? []); setMembers(p.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const deptName = (slug?: string | null) => depts.find((d) => d.slug === slug)?.name ?? slug ?? "—";
  const memberName = (id?: string | null) => members.find((m) => m.id === id)?.full_name ?? "—";

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "open") return rows.filter((r) => !["closed", "rejected"].includes(r.status));
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("res_requests").insert({
      title: form.title, purpose: form.purpose || null, event_name: form.event_name || null,
      department_slug: form.department_slug || null, branch: form.branch || null,
      requested_by: currentUserId, responsible_officer: form.responsible_officer || null,
      start_date: form.start_date || null, return_date: form.return_date || null,
      priority: form.priority, budget_impact: form.budget_impact === "" ? null : Number(form.budget_impact),
      notes: form.notes || null, status: "submitted",
    });
    if (error) return toast.error(error.message);
    setForm({ ...EMPTY }); toast.success("Resource request submitted"); load();
  };

  const advance = async (row: any, status: string) => {
    const patch: any = { status };
    const now = new Date().toISOString();
    if (status === "awaiting_chair") { patch.admin_reviewed_by = currentUserId; patch.admin_reviewed_at = now; }
    if (status === "approved") { patch.chair_approved_by = currentUserId; patch.chair_approved_at = now; }
    if (status === "issued") patch.issued_at = now;
    if (status === "returned") patch.returned_at = now;
    if (status === "inspected") patch.inspected_at = now;
    const { error } = await sb.from("res_requests").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`Request moved to ${REQUEST_STATUS_LABELS[status] ?? status}`); load();
  };

  const raisePurchase = async (row: any) => {
    const { data, error } = await sb.from("purchase_requests").insert({
      title: `Resource shortfall: ${row.title}`,
      department_slug: row.department_slug, branch: row.branch,
      justification: row.purpose ?? "Raised from a resource allocation request that cannot be met from stock.",
      amount_estimated: row.budget_impact, needed_by: row.start_date,
      requested_by: currentUserId, requester_id: currentUserId, status: "submitted",
    }).select("id").maybeSingle();
    if (error) return toast.error(error.message);
    await sb.from("res_requests").update({ procurement_request_id: data?.id }).eq("id", row.id);
    if (data?.id) {
      try {
        await notifyPurchaseRequest({ data: { requestId: data.id, stage: "submitted" } });
      } catch (err) {
        console.error("purchase request notification failed", err);
      }
    }
    toast.success("Procurement request raised for Finance"); load();
  };


  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Request resources</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Any department may request {REQUESTABLE_ITEMS.slice(0, 6).join(", ").toLowerCase()} and more.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>What is needed</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. 120 chairs and 2 speakers" /></div>
          <div><Label>Event / service</Label><Input value={form.event_name} onChange={(e) => setForm({ ...form, event_name: e.target.value })} /></div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{titleish(p)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsible officer</Label>
            <Select value={form.responsible_officer} onValueChange={(v) => setForm({ ...form, responsible_officer: v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Budget impact (R)</Label><Input type="number" step="0.01" value={form.budget_impact} onChange={(e) => setForm({ ...form, budget_impact: e.target.value })} /></div>
          <div><Label>Date needed</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><Label>Return date</Label><Input type="date" value={form.return_date} onChange={(e) => setForm({ ...form, return_date: e.target.value })} /></div>
          <div className="md:col-span-4"><Label>Purpose</Label><Textarea rows={2} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
          <div><Button type="submit">Submit request</Button></div>
        </form>
      </Card>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="w-56">
          <Label>Filter</Label>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open requests</SelectItem>
              <SelectItem value="all">All</SelectItem>
              {Object.keys(REQUEST_STATUS_LABELS).map((s) => <SelectItem key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => exportRows("resource-requests", ["Number", "Title", "Department", "Branch", "Needed", "Return", "Priority", "Status", "Budget"],
            visible.map((r) => [r.request_number, r.title, deptName(r.department_slug), r.branch, r.start_date, r.return_date, r.priority, r.status, r.budget_impact]))}
        >Export</Button>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="p-3">Ref</th><th className="p-3">Request</th><th className="p-3">Department</th>
              <th className="p-3">Needed</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b last:border-0 align-top">
                <td className="p-3 font-mono text-xs">{r.request_number}</td>
                <td className="p-3">
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.event_name ? `${r.event_name} · ` : ""}{r.purpose ?? ""}</p>
                  <p className="text-xs text-muted-foreground">Responsible: {memberName(r.responsible_officer)}{r.budget_impact ? ` · ${money(r.budget_impact)}` : ""}</p>
                </td>
                <td className="p-3">{deptName(r.department_slug)}<p className="text-xs text-muted-foreground">{r.branch ? branchLabel(r.branch) : ""}</p></td>
                <td className="p-3">{fmtDate(r.start_date)}<p className="text-xs text-muted-foreground">back {fmtDate(r.return_date)}</p></td>
                <td className="p-3">{titleish(r.priority)}</td>
                <td className="p-3"><Badge variant="secondary">{REQUEST_STATUS_LABELS[r.status] ?? r.status}</Badge></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    {canManage && r.status === "submitted" && <Button size="sm" variant="outline" onClick={() => advance(r, "under_review")}>Review</Button>}
                    {canManage && r.status === "under_review" && <Button size="sm" variant="outline" onClick={() => advance(r, "awaiting_chair")}>Send to Chair</Button>}
                    {isChair && r.status === "awaiting_chair" && <Button size="sm" onClick={() => advance(r, "approved")}>Approve</Button>}
                    {canManage && r.status === "approved" && <Button size="sm" variant="outline" onClick={() => advance(r, "issued")}>Issue</Button>}
                    {canManage && r.status === "issued" && <Button size="sm" variant="outline" onClick={() => advance(r, "returned")}>Returned</Button>}
                    {canManage && r.status === "returned" && <Button size="sm" variant="outline" onClick={() => advance(r, "inspected")}>Inspected</Button>}
                    {canManage && r.status === "inspected" && <Button size="sm" variant="outline" onClick={() => advance(r, "closed")}>Close</Button>}
                    {canManage && !["closed", "rejected"].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => advance(r, "rejected")}>Reject</Button>}
                    {canManage && !r.procurement_request_id && <Button size="sm" variant="ghost" onClick={() => raisePurchase(r)}>Raise purchase</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && <tr><td className="p-6 text-center text-muted-foreground" colSpan={7}>No requests.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
