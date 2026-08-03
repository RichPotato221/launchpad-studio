import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate, money } from "@/lib/finance";
import { DECISION_IMPLEMENTATION, DECISION_TYPES, REQUEST_ROUTES, REQUEST_TYPES, titleish, today } from "@/lib/strategy";

const sb = supabase as any;

const EMPTY_DECISION = {
  title: "", decision_type: "strategic", decision_date: today(), owner: "", impact: "",
  affected_departments: "", action_items: "", deadline: "", vote_outcome: "",
  implementation_status: "pending", notes: "",
};
const EMPTY_REQUEST = {
  title: "", request_type: "strategic", description: "", department_slug: "", amount: "",
  route_to: "chairperson",
};

/** MODULES 10–11 — Executive decision log and department advisory requests. */
export default function DecisionsModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [decisions, setDecisions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [dForm, setDForm] = useState({ ...EMPTY_DECISION });
  const [rForm, setRForm] = useState({ ...EMPTY_REQUEST });

  const load = async () => {
    const [d, r] = await Promise.all([
      sb.from("smo_decisions").select("*").order("decision_date", { ascending: false }),
      sb.from("smo_requests").select("*").order("created_at", { ascending: false }),
    ]);
    setDecisions(d.data ?? []); setRequests(r.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const saveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dForm.title.trim()) return toast.error("Describe the decision");
    const { error } = await sb.from("smo_decisions").insert({
      ...dForm, deadline: dForm.deadline || null, created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Decision logged"); setDForm({ ...EMPTY_DECISION }); load();
  };

  const setImplementation = async (d: any, implementation_status: string) => {
    const { error } = await sb.from("smo_decisions").update({ implementation_status }).eq("id", d.id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.title.trim()) return toast.error("Describe the request");
    const { error } = await sb.from("smo_requests").insert({
      ...rForm,
      amount: rForm.amount ? Number(rForm.amount) : null,
      department_slug: rForm.department_slug || null,
      requested_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Request submitted"); setRForm({ ...EMPTY_REQUEST }); load();
  };

  const setRequestStatus = async (r: any, status: string) => {
    const { error } = await sb.from("smo_requests").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Log an executive decision</h3>
          <form onSubmit={saveDecision} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Decision</Label><Input value={dForm.title} onChange={(e) => setDForm({ ...dForm, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={dForm.decision_type} onChange={(e) => setDForm({ ...dForm, decision_type: e.target.value })}>
                {DECISION_TYPES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={dForm.decision_date} onChange={(e) => setDForm({ ...dForm, decision_date: e.target.value })} /></div>
            <div><Label>Owner</Label><Input value={dForm.owner} onChange={(e) => setDForm({ ...dForm, owner: e.target.value })} /></div>
            <div><Label>Deadline</Label><Input type="date" value={dForm.deadline} onChange={(e) => setDForm({ ...dForm, deadline: e.target.value })} /></div>
            <div><Label>Vote outcome</Label><Input value={dForm.vote_outcome} onChange={(e) => setDForm({ ...dForm, vote_outcome: e.target.value })} /></div>
            <div><Label>Affected departments</Label><Input value={dForm.affected_departments} onChange={(e) => setDForm({ ...dForm, affected_departments: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Impact</Label><Textarea rows={2} value={dForm.impact} onChange={(e) => setDForm({ ...dForm, impact: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Action items</Label><Textarea rows={2} value={dForm.action_items} onChange={(e) => setDForm({ ...dForm, action_items: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Log decision</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Executive decision log</h3>
        <ul className="mt-4 space-y-3 text-sm">
          {decisions.map((d) => (
            <li key={d.id} className="border-b border-border/60 pb-3 last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{d.title}</span>
                <span className="flex items-center gap-2">
                  <Badge variant="outline">{titleish(d.decision_type)}</Badge>
                  {canManage ? (
                    <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      value={d.implementation_status} onChange={(e) => setImplementation(d, e.target.value)}>
                      {DECISION_IMPLEMENTATION.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                    </select>
                  ) : (
                    <Badge variant="outline" className={RAG_CLASS[d.implementation_status === "implemented" ? "green" : d.implementation_status === "stalled" ? "red" : "amber"]}>
                      {titleish(d.implementation_status)}
                    </Badge>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtDate(d.decision_date)} · owner {d.owner ?? "—"}{d.deadline ? ` · deadline ${fmtDate(d.deadline)}` : ""}
              </p>
              {d.impact && <p className="mt-1">{d.impact}</p>}
              {d.action_items && <p className="mt-1 text-muted-foreground">Actions: {d.action_items}</p>}
            </li>
          ))}
          {!decisions.length && <li className="text-muted-foreground">No executive decisions logged yet.</li>}
        </ul>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">Department advisory requests</h3>
        <p className="text-sm text-muted-foreground">Any approved member may route a strategic, resource or policy request to the office.</p>
        <form onSubmit={saveRequest} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>Request</Label><Input value={rForm.title} onChange={(e) => setRForm({ ...rForm, title: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={rForm.request_type} onChange={(e) => setRForm({ ...rForm, request_type: e.target.value })}>
              {REQUEST_TYPES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
            </select>
          </div>
          <div>
            <Label>Route to</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={rForm.route_to} onChange={(e) => setRForm({ ...rForm, route_to: e.target.value })}>
              {REQUEST_ROUTES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
            </select>
          </div>
          <div><Label>Department</Label><Input value={rForm.department_slug} onChange={(e) => setRForm({ ...rForm, department_slug: e.target.value })} /></div>
          <div><Label>Amount (if any)</Label><Input type="number" step="0.01" value={rForm.amount} onChange={(e) => setRForm({ ...rForm, amount: e.target.value })} /></div>
          <div className="md:col-span-4"><Label>Description</Label><Textarea rows={2} value={rForm.description} onChange={(e) => setRForm({ ...rForm, description: e.target.value })} /></div>
          <div className="md:col-span-4"><Button type="submit">Submit request</Button></div>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
              <span>
                <span className="font-medium">{r.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {titleish(r.request_type)} · to {titleish(r.route_to)}{r.amount ? ` · ${money(r.amount)}` : ""} · {fmtDate(r.created_at)}
                </span>
              </span>
              {canManage ? (
                <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={r.status} onChange={(e) => setRequestStatus(r, e.target.value)}>
                  {["pending", "under_review", "approved", "declined", "actioned"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                </select>
              ) : <Badge variant="outline">{titleish(r.status)}</Badge>}
            </li>
          ))}
          {!requests.length && <li className="text-muted-foreground">No requests submitted yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
