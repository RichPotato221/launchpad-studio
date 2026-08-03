import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { TECH_RISK_CATEGORIES, ragForRisk, riskScore, titleish, today } from "@/lib/technical";

const sb = supabase as any;

const EMPTY = {
  title: "", category: "equipment_failure", description: "", likelihood: "3", impact: "3",
  mitigation: "", owner: "", review_date: today(), status: "open", escalation_level: "department",
};

/** MODULE 11 — Technical risk register & business continuity. */
export default function TechRiskModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ ...EMPTY });

  const load = async () => {
    const { data } = await sb.from("tech_risks").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact)),
    [rows],
  );
  const open = rows.filter((r) => r.status !== "closed");
  const critical = open.filter((r) => riskScore(r.likelihood, r.impact) >= 15);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Describe the risk");
    const { error } = await sb.from("tech_risks").insert({
      ...form,
      likelihood: Number(form.likelihood),
      impact: Number(form.impact),
      review_date: form.review_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Risk registered"); setForm({ ...EMPTY }); load();
  };

  const setStatus = async (row: any, status: string) => {
    const { error } = await sb.from("tech_risks").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Open risks</p><p className="font-serif text-2xl">{open.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Critical (score ≥ 15)</p><p className="font-serif text-2xl">{critical.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Escalated to executive</p><p className="font-serif text-2xl">{open.filter((r) => r.escalation_level !== "department").length}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Register a technical risk</h3>
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Risk</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {TECH_RISK_CATEGORIES.map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
              </select>
            </div>
            <div><Label>Owner</Label><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
            <div>
              <Label>Likelihood (1–5)</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Impact (1–5)</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><Label>Review date</Label><Input type="date" value={form.review_date} onChange={(e) => setForm({ ...form, review_date: e.target.value })} /></div>
            <div>
              <Label>Escalation</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.escalation_level} onChange={(e) => setForm({ ...form, escalation_level: e.target.value })}>
                {["department", "chairperson", "senior_pastor", "board"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Mitigation / contingency</Label><Textarea rows={2} value={form.mitigation} onChange={(e) => setForm({ ...form, mitigation: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Register risk</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Risk register</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Risk</th><th>Category</th><th>L</th><th>I</th><th>Score</th><th>Owner</th><th>Review</th><th>Status</th></tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const score = riskScore(r.likelihood, r.impact);
                return (
                  <tr key={r.id} className="border-t border-border/60 align-top">
                    <td className="py-2">
                      <span className="font-medium">{r.title}</span>
                      {r.mitigation && <span className="block text-xs text-muted-foreground">Mitigation: {r.mitigation}</span>}
                    </td>
                    <td>{titleish(r.category)}</td>
                    <td>{r.likelihood}</td>
                    <td>{r.impact}</td>
                    <td><Badge variant="outline" className={RAG_CLASS[ragForRisk(score)]}>{score}</Badge></td>
                    <td>{r.owner ?? "—"}</td>
                    <td className="text-xs">{fmtDate(r.review_date)}</td>
                    <td>
                      {canManage ? (
                        <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={r.status} onChange={(e) => setStatus(r, e.target.value)}>
                          {["open", "monitoring", "mitigated", "closed"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                        </select>
                      ) : <Badge variant="outline">{titleish(r.status)}</Badge>}
                    </td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No technical risks registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
