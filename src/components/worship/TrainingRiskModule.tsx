import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { exportRows, fmtDate } from "@/lib/finance";
import { RAG_DOT } from "@/lib/governance";
import {
  COURSE_CATEGORIES, ESCALATION_LEVELS, labelFor, pct, ragForRisk, RISK_CATEGORIES,
  RISK_STATUSES, riskScore, SPIRITUAL_ACTIVITIES, today, TRAINING_STATUSES,
} from "@/lib/worship";

const sb = supabase as any;

/** MODULES 9, 10 & 12 — Training & competency, spiritual formation, and the worship risk register. */
export default function TrainingRiskModule({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [spiritual, setSpiritual] = useState<any[]>([]);

  const [course, setCourse] = useState({ title: "", category: "musical", description: "", duration_hours: "", certification: false, validity_months: "" });
  const [record, setRecord] = useState({ member_id: "", course_id: "", status: "enrolled", score: "", completed_on: "", expires_on: "" });
  const [risk, setRisk] = useState({ title: "", category: "spiritual", description: "", likelihood: "3", impact: "3", mitigation: "", owner: "", escalation_level: "department", review_date: "" });
  const [log, setLog] = useState({ member_id: "", activity: "personal_devotion", log_date: today(), notes: "" });

  const load = async () => {
    const [c, r, m, k, s] = await Promise.all([
      sb.from("worship_courses").select("*").order("title"),
      sb.from("worship_training_records").select("*"),
      sb.from("worship_team_members").select("id, full_name").order("full_name"),
      sb.from("worship_risks").select("*").order("created_at", { ascending: false }),
      sb.from("worship_spiritual_log").select("*").order("log_date", { ascending: false }).limit(200),
    ]);
    setCourses(c.data ?? []); setRecords(r.data ?? []); setMembers(m.data ?? []); setRisks(k.data ?? []); setSpiritual(s.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const name = (id: string) => members.find((m) => m.id === id)?.full_name ?? "—";
  const courseTitle = (id: string) => courses.find((c) => c.id === id)?.title ?? "—";

  const completion = useMemo(
    () => pct(records.filter((r) => r.status === "completed").length, Math.max(records.length, 1)),
    [records],
  );
  const expiring = useMemo(() => records.filter((r) => r.expires_on && r.expires_on <= today()), [records]);

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("worship_courses").insert({
      ...course,
      duration_hours: course.duration_hours ? Number(course.duration_hours) : null,
      validity_months: course.validity_months ? Number(course.validity_months) : null,
    });
    if (error) return toast.error(error.message);
    toast.success("Course added");
    setCourse({ title: "", category: "musical", description: "", duration_hours: "", certification: false, validity_months: "" });
    load();
  };

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record.member_id || !record.course_id) return toast.error("Pick a member and a course");
    const { error } = await sb.from("worship_training_records").insert({
      ...record,
      score: record.score ? Number(record.score) : null,
      completed_on: record.completed_on || null,
      expires_on: record.expires_on || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Training record saved");
    setRecord({ member_id: "", course_id: "", status: "enrolled", score: "", completed_on: "", expires_on: "" });
    load();
  };

  const addRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("worship_risks").insert({
      ...risk,
      likelihood: Number(risk.likelihood),
      impact: Number(risk.impact),
      review_date: risk.review_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Risk registered");
    setRisk({ title: "", category: "spiritual", description: "", likelihood: "3", impact: "3", mitigation: "", owner: "", escalation_level: "department", review_date: "" });
    load();
  };

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!log.member_id) return toast.error("Pick a team member");
    const { error } = await sb.from("worship_spiritual_log").insert(log);
    if (error) return toast.error(error.message);
    toast.success("Spiritual formation logged");
    setLog({ ...log, notes: "" });
    load();
  };

  return (
    <Tabs defaultValue="training">
      <TabsList className="flex h-auto w-full flex-wrap justify-start print:hidden">
        <TabsTrigger value="training">Training &amp; competency</TabsTrigger>
        <TabsTrigger value="spiritual">Spiritual formation</TabsTrigger>
        <TabsTrigger value="risk">Risk register</TabsTrigger>
      </TabsList>

      <TabsContent value="training" className="mt-6 space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Courses</p><p className="mt-2 font-serif text-2xl">{courses.length}</p></Card>
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Completion rate</p><p className="mt-2 font-serif text-2xl">{completion}%</p></Card>
          <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Expired certifications</p><p className="mt-2 font-serif text-2xl">{expiring.length}</p></Card>
        </div>

        {canManage && (
          <div className="grid gap-6 lg:grid-cols-2 print:hidden">
            <Card className="p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Add a course</p>
              <form onSubmit={addCourse} className="mt-4 grid gap-4">
                <div><Label>Title</Label><Input required value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
                <div>
                  <Label>Category</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={course.category} onChange={(e) => setCourse({ ...course, category: e.target.value })}>
                    {COURSE_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Duration (hours)</Label><Input type="number" value={course.duration_hours} onChange={(e) => setCourse({ ...course, duration_hours: e.target.value })} /></div>
                  <div><Label>Validity (months)</Label><Input type="number" value={course.validity_months} onChange={(e) => setCourse({ ...course, validity_months: e.target.value })} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={course.certification} onChange={(e) => setCourse({ ...course, certification: e.target.checked })} /> Leads to certification
                </label>
                <div><Label>Description</Label><Textarea rows={2} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} /></div>
                <div><Button type="submit">Add course</Button></div>
              </form>
            </Card>

            <Card className="p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Record training</p>
              <form onSubmit={addRecord} className="mt-4 grid gap-4">
                <div>
                  <Label>Team member</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={record.member_id} onChange={(e) => setRecord({ ...record, member_id: e.target.value })}>
                    <option value="">Select…</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Course</Label>
                  <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={record.course_id} onChange={(e) => setRecord({ ...record, course_id: e.target.value })}>
                    <option value="">Select…</option>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Status</Label>
                    <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={record.status} onChange={(e) => setRecord({ ...record, status: e.target.value })}>
                      {TRAINING_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                    </select>
                  </div>
                  <div><Label>Score (%)</Label><Input type="number" value={record.score} onChange={(e) => setRecord({ ...record, score: e.target.value })} /></div>
                  <div><Label>Completed on</Label><Input type="date" value={record.completed_on} onChange={(e) => setRecord({ ...record, completed_on: e.target.value })} /></div>
                  <div><Label>Expires on</Label><Input type="date" value={record.expires_on} onChange={(e) => setRecord({ ...record, expires_on: e.target.value })} /></div>
                </div>
                <div><Button type="submit">Save record</Button></div>
              </form>
            </Card>
          </div>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Competency matrix</p>
            <Button variant="outline" size="sm" onClick={() => exportRows("worship-training", ["Member", "Course", "Status", "Score", "Completed", "Expires"], records.map((r) => [name(r.member_id), courseTitle(r.course_id), r.status, r.score, r.completed_on, r.expires_on]))}>Export</Button>
          </div>
          <div className="mt-3 divide-y rounded-md border border-border">
            {records.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                <span>{name(r.member_id)} <span className="text-xs text-muted-foreground">· {courseTitle(r.course_id)}</span></span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {r.score != null ? `${r.score}%` : "—"} {r.expires_on ? `· expires ${fmtDate(r.expires_on)}` : ""}
                  <Badge variant={r.status === "completed" ? "default" : "outline"}>{r.status.replace(/_/g, " ")}</Badge>
                </span>
              </div>
            ))}
            {records.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No training records yet.</div>}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="spiritual" className="mt-6 space-y-6">
        <Card className="p-6 print:hidden">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Log spiritual formation</p>
          <form onSubmit={addLog} className="mt-4 grid gap-4 md:grid-cols-4">
            <div>
              <Label>Team member</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={log.member_id} onChange={(e) => setLog({ ...log, member_id: e.target.value })}>
                <option value="">Select…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Activity</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={log.activity} onChange={(e) => setLog({ ...log, activity: e.target.value })}>
                {SPIRITUAL_ACTIVITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
              </select>
            </div>
            <div><Label>Date</Label><Input type="date" value={log.log_date} onChange={(e) => setLog({ ...log, log_date: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={log.notes} onChange={(e) => setLog({ ...log, notes: e.target.value })} /></div>
            <div><Button type="submit">Log</Button></div>
          </form>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent spiritual formation</p>
          <div className="mt-3 divide-y rounded-md border border-border">
            {spiritual.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                <span>{name(s.member_id)} <span className="text-xs text-muted-foreground">· {labelFor(SPIRITUAL_ACTIVITIES, s.activity)}</span></span>
                <span className="text-xs text-muted-foreground">{fmtDate(s.log_date)} {s.notes ? `· ${s.notes}` : ""}</span>
              </div>
            ))}
            {spiritual.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nothing logged yet.</div>}
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="risk" className="mt-6 space-y-6">
        {canManage && (
          <Card className="p-6 print:hidden">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Register a risk</p>
            <form onSubmit={addRisk} className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2"><Label>Risk</Label><Input required value={risk.title} onChange={(e) => setRisk({ ...risk, title: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={risk.category} onChange={(e) => setRisk({ ...risk, category: e.target.value })}>
                  {RISK_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div><Label>Likelihood (1–5)</Label><Input type="number" min={1} max={5} value={risk.likelihood} onChange={(e) => setRisk({ ...risk, likelihood: e.target.value })} /></div>
              <div><Label>Impact (1–5)</Label><Input type="number" min={1} max={5} value={risk.impact} onChange={(e) => setRisk({ ...risk, impact: e.target.value })} /></div>
              <div><Label>Owner</Label><Input value={risk.owner} onChange={(e) => setRisk({ ...risk, owner: e.target.value })} /></div>
              <div>
                <Label>Escalation level</Label>
                <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={risk.escalation_level} onChange={(e) => setRisk({ ...risk, escalation_level: e.target.value })}>
                  {ESCALATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div><Label>Review date</Label><Input type="date" value={risk.review_date} onChange={(e) => setRisk({ ...risk, review_date: e.target.value })} /></div>
              <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={risk.description} onChange={(e) => setRisk({ ...risk, description: e.target.value })} /></div>
              <div className="md:col-span-3"><Label>Mitigation</Label><Textarea rows={2} value={risk.mitigation} onChange={(e) => setRisk({ ...risk, mitigation: e.target.value })} /></div>
              <div><Button type="submit">Register risk</Button></div>
            </form>
          </Card>
        )}

        <div className="space-y-3">
          {risks.map((r) => {
            const score = riskScore(Number(r.likelihood ?? 0), Number(r.impact ?? 0));
            return (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labelFor(RISK_CATEGORIES, r.category)} · owner {r.owner || "—"} · escalation {r.escalation_level}
                      {r.review_date ? ` · review ${fmtDate(r.review_date)}` : ""}
                    </p>
                    {r.description && <p className="mt-2 text-sm">{r.description}</p>}
                    {r.mitigation && <p className="mt-1 text-sm text-muted-foreground">Mitigation: {r.mitigation}</p>}
                  </div>
                  <div className="text-right">
                    <p className="flex items-center justify-end gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${RAG_DOT[ragForRisk(score)]}`} /> score {score}</p>
                    {canManage ? (
                      <select className="mt-2 h-9 rounded-md border border-input bg-background px-2 text-sm print:hidden"
                        value={r.status}
                        onChange={async (e) => { await sb.from("worship_risks").update({ status: e.target.value }).eq("id", r.id); load(); }}>
                        {RISK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <Badge variant="outline" className="mt-2">{r.status}</Badge>}
                  </div>
                </div>
              </Card>
            );
          })}
          {risks.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No risks registered.</Card>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
