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
import { IDEA_STAGES, IDEA_TYPES, STRATEGY_RISK_CATEGORIES, ragForRisk, riskScore, titleish, today } from "@/lib/strategy";

const sb = supabase as any;

const EMPTY_RISK = {
  title: "", category: "vision", description: "", likelihood: "3", impact: "3",
  mitigation: "", owner: "", review_date: today(), status: "open", escalation_level: "executive",
};
const EMPTY_IDEA = { title: "", idea_type: "ministry", description: "", department_slug: "", submitter_name: "" };

/** MODULES 12–13 — Strategic risk register and the innovation hub. */
export default function RiskInnovationModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [risks, setRisks] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [rForm, setRForm] = useState({ ...EMPTY_RISK });
  const [iForm, setIForm] = useState({ ...EMPTY_IDEA });

  const load = async () => {
    const [r, i] = await Promise.all([
      sb.from("smo_risks").select("*").order("created_at", { ascending: false }),
      sb.from("smo_ideas").select("*").order("created_at", { ascending: false }),
    ]);
    setRisks(r.data ?? []); setIdeas(i.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const sorted = useMemo(
    () => [...risks].sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact)),
    [risks],
  );

  const saveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.title.trim()) return toast.error("Describe the risk");
    const { error } = await sb.from("smo_risks").insert({
      ...rForm,
      likelihood: Number(rForm.likelihood),
      impact: Number(rForm.impact),
      review_date: rForm.review_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Strategic risk registered"); setRForm({ ...EMPTY_RISK }); load();
  };

  const setRiskStatus = async (r: any, status: string) => {
    const { error } = await sb.from("smo_risks").update({ status }).eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  };

  const saveIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!iForm.title.trim()) return toast.error("Describe the idea");
    const { error } = await sb.from("smo_ideas").insert({
      ...iForm, department_slug: iForm.department_slug || null, submitted_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Idea submitted to the innovation hub"); setIForm({ ...EMPTY_IDEA }); load();
  };

  const setStage = async (i: any, stage: string) => {
    const { error } = await sb.from("smo_ideas").update({ stage }).eq("id", i.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Register a strategic risk</h3>
          <form onSubmit={saveRisk} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Risk</Label><Input value={rForm.title} onChange={(e) => setRForm({ ...rForm, title: e.target.value })} /></div>
            <div>
              <Label>Category</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rForm.category} onChange={(e) => setRForm({ ...rForm, category: e.target.value })}>
                {STRATEGY_RISK_CATEGORIES.map((c) => <option key={c} value={c}>{titleish(c)}</option>)}
              </select>
            </div>
            <div><Label>Owner</Label><Input value={rForm.owner} onChange={(e) => setRForm({ ...rForm, owner: e.target.value })} /></div>
            <div>
              <Label>Likelihood (1–5)</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rForm.likelihood} onChange={(e) => setRForm({ ...rForm, likelihood: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Impact (1–5)</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rForm.impact} onChange={(e) => setRForm({ ...rForm, impact: e.target.value })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><Label>Review date</Label><Input type="date" value={rForm.review_date} onChange={(e) => setRForm({ ...rForm, review_date: e.target.value })} /></div>
            <div>
              <Label>Escalation</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={rForm.escalation_level} onChange={(e) => setRForm({ ...rForm, escalation_level: e.target.value })}>
                {["department", "executive", "chairperson", "senior_pastor", "board"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={rForm.description} onChange={(e) => setRForm({ ...rForm, description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Mitigation</Label><Textarea rows={2} value={rForm.mitigation} onChange={(e) => setRForm({ ...rForm, mitigation: e.target.value })} /></div>
            <div className="md:col-span-4"><Button type="submit">Register risk</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Strategic risk register</h3>
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
                          value={r.status} onChange={(e) => setRiskStatus(r, e.target.value)}>
                          {["open", "monitoring", "mitigated", "closed"].map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                        </select>
                      ) : <Badge variant="outline">{titleish(r.status)}</Badge>}
                    </td>
                  </tr>
                );
              })}
              {!risks.length && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No strategic risks registered.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-serif text-lg">Innovation hub</h3>
        <p className="text-sm text-muted-foreground">Any approved member may submit a kingdom idea for screening, feasibility and piloting.</p>
        <form onSubmit={saveIdea} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2"><Label>Idea</Label><Input value={iForm.title} onChange={(e) => setIForm({ ...iForm, title: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={iForm.idea_type} onChange={(e) => setIForm({ ...iForm, idea_type: e.target.value })}>
              {IDEA_TYPES.map((t) => <option key={t} value={t}>{titleish(t)}</option>)}
            </select>
          </div>
          <div><Label>Department</Label><Input value={iForm.department_slug} onChange={(e) => setIForm({ ...iForm, department_slug: e.target.value })} /></div>
          <div className="md:col-span-4"><Label>Description</Label><Textarea rows={2} value={iForm.description} onChange={(e) => setIForm({ ...iForm, description: e.target.value })} /></div>
          <div className="md:col-span-4"><Button type="submit">Submit idea</Button></div>
        </form>
        <ul className="mt-4 space-y-2 text-sm">
          {ideas.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0">
              <span>
                <span className="font-medium">{i.title}</span>
                <span className="block text-xs text-muted-foreground">{titleish(i.idea_type)} · {fmtDate(i.created_at)}</span>
              </span>
              {canManage ? (
                <select className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  value={i.stage} onChange={(e) => setStage(i, e.target.value)}>
                  {IDEA_STAGES.map((s) => <option key={s} value={s}>{titleish(s)}</option>)}
                </select>
              ) : <Badge variant="outline">{titleish(i.stage)}</Badge>}
            </li>
          ))}
          {!ideas.length && <li className="text-muted-foreground">No ideas submitted yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
