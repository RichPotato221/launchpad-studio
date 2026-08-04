import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { Field, Picker, Stat } from "@/components/teams/TeamMembersModule";
import { TEAM_CONFIG, nice, pct, ragForRisk, riskScore, today, type TeamKey } from "@/lib/ministryTeams";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string };

/** Risk register + training / certification portal for a ministry team. */
export default function TeamRiskTrainingModule({ team, canManage, currentUserId }: Props) {
  const cfg = TEAM_CONFIG[team];
  const [risks, setRisks] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const emptyRisk = {
    title: "", category: cfg.riskCategories[0] ?? "operational", description: "",
    likelihood: "3", impact: "3", owner_name: "", mitigation: "", review_date: today(),
  };
  const emptyRecord = { member_name: "", course_id: "", completed_at: today(), score: "", progress_pct: "100" };
  const [rForm, setRForm] = useState({ ...emptyRisk });
  const [tForm, setTForm] = useState({ ...emptyRecord });

  const load = async () => {
    const [{ data: r }, { data: c }, { data: t }] = await Promise.all([
      sb.from("mt_risks").select("*").eq("team", team).order("created_at", { ascending: false }),
      sb.from("mt_courses").select("*").eq("team", team).order("title"),
      sb.from("mt_training_records").select("*").eq("team", team).order("completed_at", { ascending: false }),
    ]);
    setRisks(r ?? []);
    setCourses(c ?? []);
    setRecords(t ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const saveRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.title.trim()) return toast.error("Describe the risk");
    const { error } = await sb.from("mt_risks").insert({
      ...rForm,
      team,
      likelihood: Number(rForm.likelihood),
      impact: Number(rForm.impact),
      review_date: rForm.review_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Risk registered");
    setRForm({ ...emptyRisk });
    load();
  };

  const seedCourses = async () => {
    const have = new Set(courses.map((c) => c.title));
    const missing = cfg.courses.filter((t) => !have.has(t));
    if (!missing.length) return toast.info("Catalogue already loaded");
    const { error } = await sb.from("mt_courses").insert(missing.map((title) => ({ team, title, required: true, duration_hours: 2 })));
    if (error) return toast.error(error.message);
    toast.success(`${missing.length} courses added`);
    load();
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tForm.member_name.trim() || !tForm.course_id) return toast.error("Choose a member and a course");
    const { error } = await sb.from("mt_training_records").insert({
      ...tForm,
      team,
      score: tForm.score ? Number(tForm.score) : null,
      progress_pct: Number(tForm.progress_pct || 0),
      completed_at: tForm.completed_at || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Training record captured");
    setTForm({ ...emptyRecord });
    load();
  };

  const openRisks = risks.filter((r) => r.status !== "closed");
  const critical = openRisks.filter((r) => riskScore(r.likelihood, r.impact) >= 15);
  const overdueReviews = openRisks.filter((r) => r.review_date && r.review_date < today());
  const sorted = useMemo(
    () => [...risks].sort((a, b) => riskScore(b.likelihood, b.impact) - riskScore(a.likelihood, a.impact)),
    [risks],
  );
  const completed = records.filter((r) => Number(r.progress_pct) >= 100);
  const compliance = pct(completed.length, records.length || 1);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open risks" value={openRisks.length} />
        <Stat label="Critical" value={critical.length} rag={critical.length ? "red" : "green"} />
        <Stat label="Overdue reviews" value={overdueReviews.length} />
        <Stat label="Training completion" value={`${compliance}%`} />
      </div>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Risk register</h3>
        {canManage && (
          <form onSubmit={saveRisk} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Field label="Risk"><Input value={rForm.title} onChange={(e) => setRForm({ ...rForm, title: e.target.value })} /></Field></div>
            <Field label="Category">
              <Picker value={rForm.category} onChange={(v) => setRForm({ ...rForm, category: v })} options={cfg.riskCategories.map((c) => [c, nice(c)])} />
            </Field>
            <Field label="Owner"><Input value={rForm.owner_name} onChange={(e) => setRForm({ ...rForm, owner_name: e.target.value })} /></Field>
            <Field label="Likelihood (1-5)"><Input type="number" min={1} max={5} value={rForm.likelihood} onChange={(e) => setRForm({ ...rForm, likelihood: e.target.value })} /></Field>
            <Field label="Impact (1-5)"><Input type="number" min={1} max={5} value={rForm.impact} onChange={(e) => setRForm({ ...rForm, impact: e.target.value })} /></Field>
            <Field label="Review date"><Input type="date" value={rForm.review_date} onChange={(e) => setRForm({ ...rForm, review_date: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Mitigation plan"><Textarea rows={2} value={rForm.mitigation} onChange={(e) => setRForm({ ...rForm, mitigation: e.target.value })} /></Field></div>
            <div className="flex items-end"><Button type="submit">Register risk</Button></div>
          </form>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2">Risk</th><th>Category</th><th>Owner</th><th>L×I</th><th>Rating</th><th>Review</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const score = riskScore(r.likelihood, r.impact);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 font-medium">{r.title}{r.mitigation && <div className="text-xs text-muted-foreground">{r.mitigation}</div>}</td>
                    <td className="text-xs">{nice(r.category)}</td>
                    <td className="text-xs">{r.owner_name || "—"}</td>
                    <td>{r.likelihood}×{r.impact} = {score}</td>
                    <td><Badge variant="outline" className={RAG_CLASS[ragForRisk(score)]}>{ragForRisk(score)}</Badge></td>
                    <td className={`text-xs ${r.review_date && r.review_date < today() ? "font-medium text-red-700" : ""}`}>{r.review_date ? fmtDate(r.review_date) : "—"}</td>
                    <td className="text-xs">{nice(r.status)}</td>
                    <td>
                      {canManage && r.status !== "closed" && (
                        <Button size="sm" variant="ghost" onClick={async () => { await sb.from("mt_risks").update({ status: "closed" }).eq("id", r.id); load(); }}>Close</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {risks.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No risks registered yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Training &amp; certification portal</h3>
          {canManage && <Button size="sm" variant="outline" onClick={seedCourses}>Load course catalogue</Button>}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const recs = records.filter((r) => r.course_id === c.id);
            const rate = pct(recs.filter((r) => Number(r.progress_pct) >= 100).length, recs.length || 1);
            return (
              <Card key={c.id} className="p-3 text-sm">
                <p className="font-medium">{c.title}</p>
                <Progress value={rate} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">{recs.length} enrolled · {rate}% complete</p>
              </Card>
            );
          })}
          {courses.length === 0 && <p className="text-sm text-muted-foreground">Load the catalogue to begin.</p>}
        </div>

        {canManage && courses.length > 0 && (
          <form onSubmit={saveRecord} className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-5">
            <Field label="Member"><Input value={tForm.member_name} onChange={(e) => setTForm({ ...tForm, member_name: e.target.value })} /></Field>
            <Field label="Course">
              <Picker value={tForm.course_id} onChange={(v) => setTForm({ ...tForm, course_id: v })} options={[["", "Select…"], ...courses.map((c) => [c.id, c.title] as [string, string])]} />
            </Field>
            <Field label="Completed"><Input type="date" value={tForm.completed_at} onChange={(e) => setTForm({ ...tForm, completed_at: e.target.value })} /></Field>
            <Field label="Score"><Input type="number" value={tForm.score} onChange={(e) => setTForm({ ...tForm, score: e.target.value })} /></Field>
            <div className="flex items-end"><Button type="submit">Record</Button></div>
          </form>
        )}

        <div className="mt-5 space-y-1">
          {records.slice(0, 25).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
              <span>{r.member_name} — {courses.find((c) => c.id === r.course_id)?.title ?? "Course"}</span>
              <span className="text-xs text-muted-foreground">{r.progress_pct}% · {r.completed_at ? fmtDate(r.completed_at) : "in progress"}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
