import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate, exportRows, BRANCHES, branchLabel, RAG_CLASS } from "@/lib/finance";
import {
  RISK_CATEGORIES, TRAINING_COURSES, COMPETENCY_LEVELS,
  labelFor, titleish, riskScore, ragForRisk, daysUntil,
} from "@/lib/resources";

const sb = supabase as any;

const EMPTY_R = {
  title: "", category: "theft", description: "", likelihood: "3", impact: "3",
  mitigation: "", owner_name: "", review_date: "", status: "open", branch: "",
};

const EMPTY_T = {
  person_name: "", user_id: "", course: "Asset Management", competency_level: "foundation",
  completed_on: "", expiry_date: "", status: "completed", notes: "",
};

/** MODULES 13 & 14 — Resource Risk Register and Training & Competency. */
export default function RiskTrainingModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [risks, setRisks] = useState<any[]>([]);
  const [training, setTraining] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [r, setR] = useState({ ...EMPTY_R });
  const [t, setT] = useState({ ...EMPTY_T });

  const load = async () => {
    const [ri, tr, pr] = await Promise.all([
      sb.from("res_risks").select("*").order("created_at", { ascending: false }),
      sb.from("res_training_records").select("*").order("completed_on", { ascending: false }),
      sb.from("profiles").select("id, full_name").order("full_name"),
    ]);
    setRisks(ri.data ?? []); setTraining(tr.data ?? []); setMembers(pr.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const submitRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("res_risks").insert({
      title: r.title, category: r.category, description: r.description || null,
      likelihood: Number(r.likelihood), impact: Number(r.impact), mitigation: r.mitigation || null,
      owner_name: r.owner_name || null, review_date: r.review_date || null,
      status: r.status, branch: r.branch || null, created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    setR({ ...EMPTY_R }); toast.success("Risk added to the register"); load();
  };

  const submitTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("res_training_records").insert({
      person_name: t.person_name || members.find((m) => m.id === t.user_id)?.full_name || "—",
      user_id: t.user_id || null, course: t.course, competency_level: t.competency_level,
      completed_on: t.completed_on || null, expiry_date: t.expiry_date || null,
      status: t.status, notes: t.notes || null, created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    setT({ ...EMPTY_T }); toast.success("Training record captured"); load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Resource risk register</p>
        {canManage && (
          <form onSubmit={submitRisk} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Risk</Label><Input required value={r.title} onChange={(e) => setR({ ...r, title: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <Select value={r.category} onValueChange={(v) => setR({ ...r, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RISK_CATEGORIES.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={r.branch} onValueChange={(v) => setR({ ...r, branch: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((x) => <SelectItem key={x} value={x}>{branchLabel(x)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Likelihood (1–5)</Label>
              <Select value={r.likelihood} onValueChange={(v) => setR({ ...r, likelihood: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact (1–5)</Label>
              <Select value={r.impact} onValueChange={(v) => setR({ ...r, impact: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Owner</Label><Input value={r.owner_name} onChange={(e) => setR({ ...r, owner_name: e.target.value })} /></div>
            <div><Label>Review date</Label><Input type="date" value={r.review_date} onChange={(e) => setR({ ...r, review_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={r.description} onChange={(e) => setR({ ...r, description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Mitigation</Label><Textarea rows={2} value={r.mitigation} onChange={(e) => setR({ ...r, mitigation: e.target.value })} /></div>
            <div><Button type="submit">Add risk</Button></div>
          </form>
        )}
        <table className="mt-4 w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2">Risk</th><th className="p-2">Category</th><th className="p-2">L×I</th><th className="p-2">Rating</th><th className="p-2">Owner</th><th className="p-2">Review</th><th className="p-2">Status</th><th className="p-2"></th></tr>
          </thead>
          <tbody>
            {risks.map((x) => {
              const score = riskScore(x.likelihood, x.impact);
              return (
                <tr key={x.id} className="border-b last:border-0">
                  <td className="p-2">{x.title}<p className="text-xs text-muted-foreground">{x.mitigation}</p></td>
                  <td className="p-2">{labelFor(RISK_CATEGORIES, x.category)}</td>
                  <td className="p-2">{x.likelihood}×{x.impact}</td>
                  <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${RAG_CLASS[ragForRisk(score)]}`}>{score}</span></td>
                  <td className="p-2">{x.owner_name ?? "—"}</td>
                  <td className="p-2">{fmtDate(x.review_date)}</td>
                  <td className="p-2">{titleish(x.status)}</td>
                  <td className="p-2 text-right">
                    {canManage && x.status !== "closed" && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        await sb.from("res_risks").update({ status: "closed" }).eq("id", x.id); load();
                      }}>Close</Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {risks.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={8}>No risks recorded.</td></tr>}
          </tbody>
        </table>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => exportRows("resource-risks",
            ["Risk", "Category", "Likelihood", "Impact", "Score", "Owner", "Review", "Status"],
            risks.map((x) => [x.title, x.category, x.likelihood, x.impact, riskScore(x.likelihood, x.impact), x.owner_name, x.review_date, x.status]))}>Export</Button>
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Training &amp; competency</p>
        {canManage && (
          <form onSubmit={submitTraining} className="mt-4 grid gap-3 md:grid-cols-4">
            <div>
              <Label>Member</Label>
              <Select value={t.user_id} onValueChange={(v) => setT({ ...t, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Or name</Label><Input value={t.person_name} onChange={(e) => setT({ ...t, person_name: e.target.value })} /></div>
            <div>
              <Label>Course</Label>
              <Select value={t.course} onValueChange={(v) => setT({ ...t, course: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TRAINING_COURSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Competency</Label>
              <Select value={t.competency_level} onValueChange={(v) => setT({ ...t, competency_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COMPETENCY_LEVELS.map((c) => <SelectItem key={c} value={c}>{titleish(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Completed</Label><Input type="date" value={t.completed_on} onChange={(e) => setT({ ...t, completed_on: e.target.value })} /></div>
            <div><Label>Expires</Label><Input type="date" value={t.expiry_date} onChange={(e) => setT({ ...t, expiry_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Input value={t.notes} onChange={(e) => setT({ ...t, notes: e.target.value })} /></div>
            <div><Button type="submit">Record training</Button></div>
          </form>
        )}
        <table className="mt-4 w-full text-sm">
          <thead className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="p-2">Member</th><th className="p-2">Course</th><th className="p-2">Level</th><th className="p-2">Completed</th><th className="p-2">Expiry</th><th className="p-2">Status</th></tr>
          </thead>
          <tbody>
            {training.map((x) => {
              const d = daysUntil(x.expiry_date);
              return (
                <tr key={x.id} className="border-b last:border-0">
                  <td className="p-2">{x.person_name}</td>
                  <td className="p-2">{x.course}</td>
                  <td className="p-2">{titleish(x.competency_level)}</td>
                  <td className="p-2">{fmtDate(x.completed_on)}</td>
                  <td className="p-2">{fmtDate(x.expiry_date)}</td>
                  <td className="p-2">
                    {d != null && d < 0
                      ? <Badge variant="destructive">Expired</Badge>
                      : d != null && d < 60
                        ? <Badge variant="outline">Renew soon</Badge>
                        : <Badge variant="secondary">{titleish(x.status)}</Badge>}
                  </td>
                </tr>
              );
            })}
            {training.length === 0 && <tr><td className="p-4 text-muted-foreground" colSpan={6}>No training records.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
