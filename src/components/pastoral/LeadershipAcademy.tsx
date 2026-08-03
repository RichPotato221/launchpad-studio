import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, titleCase } from "@/lib/finance";
import { PROMOTION_READINESS, READINESS_BANDS, RISK_CLASS, RISK_LEVELS, SUCCESSION_STATUSES, TRAINING_STATUSES, labelOf } from "@/lib/ministry";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULES 3 & 15 — Leadership Development Academy and the Succession Pipeline. */
export default function LeadershipAcademy({ canManage, currentUserId }: Props) {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [succession, setSuccession] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [enrolments, setEnrolments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const emptyLeader = {
    user_id: "",
    department_slug: "",
    branch: "",
    leadership_role: "",
    spiritual_gifts: "",
    calling_assessment: "",
    training_history: "",
    mentor_id: "",
    mentorship_plan: "",
    readiness_score: "50",
  };
  const emptySuccession = {
    position_title: "",
    department_slug: "",
    branch: "",
    incumbent_id: "",
    candidate_id: "",
    readiness_score: "40",
    readiness_band: "long_term",
    training_status: "not_started",
    competency_assessment: "",
    delegated_responsibilities: "",
    recommendation: "",
    target_date: "",
  };
  const [lf, setLf] = useState<any>(emptyLeader);
  const [sf, setSf] = useState<any>(emptySuccession);

  const load = async () => {
    setLoading(true);
    const [l, s, p, d, e] = await Promise.all([
      sb.from("leader_profiles").select("*").order("readiness_score", { ascending: false }),
      sb.from("succession_candidates").select("*").order("readiness_score", { ascending: false }),
      sb.from("profiles").select("id, full_name, primary_department, branch").eq("approval_status", "approved").order("full_name"),
      sb.from("departments").select("slug, name").order("name"),
      sb.from("enrollments").select("id, user_id, status"),
    ]);
    setLeaders(l.data ?? []);
    setSuccession(s.data ?? []);
    setMembers(p.data ?? []);
    setDepartments(d.data ?? []);
    setEnrolments(e.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.full_name ?? "—";

  const addLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lf.user_id) return toast.error("Choose the leader.");
    const completed = enrolments.filter((x) => x.user_id === lf.user_id && x.status === "completed").length;
    const { error } = await sb.from("leader_profiles").insert({
      user_id: lf.user_id,
      department_slug: lf.department_slug || null,
      branch: lf.branch || null,
      leadership_role: lf.leadership_role || null,
      spiritual_gifts: lf.spiritual_gifts || null,
      calling_assessment: lf.calling_assessment || null,
      training_history: lf.training_history || null,
      mentor_id: lf.mentor_id || null,
      mentorship_plan: lf.mentorship_plan || null,
      readiness_score: Number(lf.readiness_score),
      courses_completed: completed,
    });
    if (error) return toast.error(error.message);
    toast.success("Leadership profile created");
    setLf(emptyLeader);
    load();
  };

  const updateLeader = async (row: any, patch: any) => {
    const { error } = await sb.from("leader_profiles").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  /** Recompute a leader's academy record from live course completions. */
  const syncTraining = async (row: any) => {
    const completed = enrolments.filter((x) => x.user_id === row.user_id && x.status === "completed").length;
    const readiness = Math.min(100, 30 + completed * 15);
    await updateLeader(row, {
      courses_completed: completed,
      certificates: completed,
      readiness_score: Math.max(row.readiness_score, readiness),
      promotion_readiness: readiness >= 85 ? "ready" : readiness >= 60 ? "emerging" : "developing",
      succession_status: readiness >= 85 ? "ready" : readiness >= 60 ? "in_pipeline" : "not_ready",
    });
    toast.success("Leadership profile synced with completed training");
  };

  const addSuccession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sf.position_title.trim()) return toast.error("Name the position.");
    const { error } = await sb.from("succession_candidates").insert({
      position_title: sf.position_title.trim(),
      department_slug: sf.department_slug || null,
      branch: sf.branch || null,
      incumbent_id: sf.incumbent_id || null,
      candidate_id: sf.candidate_id || null,
      candidate_name: nameOf(sf.candidate_id),
      readiness_score: Number(sf.readiness_score),
      readiness_band: sf.readiness_band,
      training_status: sf.training_status,
      competency_assessment: sf.competency_assessment || null,
      delegated_responsibilities: sf.delegated_responsibilities || null,
      recommendation: sf.recommendation || null,
      target_date: sf.target_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Successor added to the pipeline");
    setSf(emptySuccession);
    load();
  };

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading the academy…</Card>;

  const exportLeaders = () =>
    exportRows(
      "leadership-development-register",
      ["Leader", "Role", "Department", "Branch", "Gifts", "Mentor", "Courses", "Certificates", "Readiness", "Promotion", "Succession", "Burnout"],
      leaders.map((l) => [
        nameOf(l.user_id),
        l.leadership_role ?? "",
        departments.find((d) => d.slug === l.department_slug)?.name ?? "",
        l.branch ? branchLabel(l.branch) : "",
        l.spiritual_gifts ?? "",
        nameOf(l.mentor_id),
        l.courses_completed,
        l.certificates,
        l.readiness_score,
        l.promotion_readiness,
        l.succession_status,
        l.burnout_risk,
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Leaders in the academy", leaders.length],
          ["Promotion ready", leaders.filter((l) => l.promotion_readiness === "ready").length],
          ["Successors in pipeline", succession.length],
          ["Ready-now successors", succession.filter((s) => s.readiness_band === "ready_now").length],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p>
            <p className="mt-1 font-serif text-2xl">{v}</p>
          </Card>
        ))}
      </div>

      {canManage && (
        <Card className="p-5">
          <h3 className="font-serif text-lg">Create a leadership profile</h3>
          <form onSubmit={addLeader} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Leader</Label>
              <Select value={lf.user_id} onValueChange={(v) => setLf({ ...lf, user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leadership role</Label>
              <Input value={lf.leadership_role} onChange={(e) => setLf({ ...lf, leadership_role: e.target.value })} />
            </div>
            <div>
              <Label>Department</Label>
              <Select value={lf.department_slug} onValueChange={(v) => setLf({ ...lf, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={lf.branch} onValueChange={(v) => setLf({ ...lf, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mentor</Label>
              <Select value={lf.mentor_id} onValueChange={(v) => setLf({ ...lf, mentor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Assign mentor" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Readiness score (0–100)</Label>
              <Input type="number" min="0" max="100" value={lf.readiness_score} onChange={(e) => setLf({ ...lf, readiness_score: e.target.value })} />
            </div>
            <div>
              <Label>Spiritual gifts</Label>
              <Textarea rows={2} value={lf.spiritual_gifts} onChange={(e) => setLf({ ...lf, spiritual_gifts: e.target.value })} />
            </div>
            <div>
              <Label>Calling assessment</Label>
              <Textarea rows={2} value={lf.calling_assessment} onChange={(e) => setLf({ ...lf, calling_assessment: e.target.value })} />
            </div>
            <div>
              <Label>Mentorship plan</Label>
              <Textarea rows={2} value={lf.mentorship_plan} onChange={(e) => setLf({ ...lf, mentorship_plan: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Create profile</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Leadership journeys</h3>
          <Button variant="outline" onClick={exportLeaders}><Download className="mr-2 h-4 w-4" />Export</Button>
        </div>
        <div className="mt-4 space-y-3">
          {leaders.length === 0 && <p className="text-sm text-muted-foreground">No leadership profiles yet.</p>}
          {leaders.map((l) => (
            <div key={l.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-64">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{nameOf(l.user_id)}</span>
                    {l.leadership_role && <Badge variant="outline">{l.leadership_role}</Badge>}
                    <Badge variant="secondary">{titleCase(l.promotion_readiness)}</Badge>
                    <Badge className={RISK_CLASS[l.burnout_risk]} variant="outline">Burnout: {l.burnout_risk}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {departments.find((d) => d.slug === l.department_slug)?.name ?? "Unassigned"}
                    {l.branch ? ` · ${branchLabel(l.branch)}` : ""} · mentor {nameOf(l.mentor_id)} · {l.courses_completed} courses ·{" "}
                    {l.certificates} certificates
                  </p>
                  {l.spiritual_gifts && <p className="mt-1 text-sm">Gifts: {l.spiritual_gifts}</p>}
                  {l.calling_assessment && <p className="text-sm text-muted-foreground">Calling: {l.calling_assessment}</p>}
                  {l.mentorship_plan && <p className="text-sm text-muted-foreground">Mentorship: {l.mentorship_plan}</p>}
                  <div className="mt-2 max-w-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Leadership readiness</span><span>{l.readiness_score}%</span>
                    </div>
                    <Progress className="mt-1" value={l.readiness_score} />
                  </div>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={l.promotion_readiness} onValueChange={(v) => updateLeader(l, { promotion_readiness: v })}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PROMOTION_READINESS.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={l.succession_status} onValueChange={(v) => updateLeader(l, { succession_status: v })}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SUCCESSION_STATUSES.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={l.burnout_risk} onValueChange={(v) => updateLeader(l, { burnout_risk: v })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((p) => <SelectItem key={p} value={p}>{titleCase(p)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" onClick={() => syncTraining(l)}>Sync training</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-serif text-lg">Succession & leadership pipeline</h3>
        {canManage && (
          <form onSubmit={addSuccession} className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <Label>Position</Label>
              <Input value={sf.position_title} onChange={(e) => setSf({ ...sf, position_title: e.target.value })} />
            </div>
            <div>
              <Label>Incumbent</Label>
              <Select value={sf.incumbent_id} onValueChange={(v) => setSf({ ...sf, incumbent_id: v })}>
                <SelectTrigger><SelectValue placeholder="Current holder" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Successor</Label>
              <Select value={sf.candidate_id} onValueChange={(v) => setSf({ ...sf, candidate_id: v })}>
                <SelectTrigger><SelectValue placeholder="Candidate" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={sf.department_slug} onValueChange={(v) => setSf({ ...sf, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Readiness band</Label>
              <Select value={sf.readiness_band} onValueChange={(v) => setSf({ ...sf, readiness_band: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {READINESS_BANDS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Readiness score</Label>
              <Input type="number" min="0" max="100" value={sf.readiness_score} onChange={(e) => setSf({ ...sf, readiness_score: e.target.value })} />
            </div>
            <div>
              <Label>Training status</Label>
              <Select value={sf.training_status} onValueChange={(v) => setSf({ ...sf, training_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRAINING_STATUSES.map((t) => <SelectItem key={t} value={t}>{titleCase(t)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target date</Label>
              <Input type="date" value={sf.target_date} onChange={(e) => setSf({ ...sf, target_date: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Competency assessment & delegated responsibilities</Label>
              <Textarea rows={2} value={sf.competency_assessment} onChange={(e) => setSf({ ...sf, competency_assessment: e.target.value })} />
            </div>
            <div className="md:col-span-3"><Button type="submit">Add to pipeline</Button></div>
          </form>
        )}

        <div className="mt-4 space-y-3">
          {succession.length === 0 && <p className="text-sm text-muted-foreground">No succession plans captured yet.</p>}
          {succession.map((s) => (
            <div key={s.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{s.position_title}</p>
                  <p className="text-xs text-muted-foreground">
                    Incumbent {nameOf(s.incumbent_id)} → successor {s.candidate_name ?? nameOf(s.candidate_id)} ·{" "}
                    {labelOf(READINESS_BANDS, s.readiness_band)} · training {titleCase(s.training_status)}
                    {s.target_date ? ` · target ${s.target_date}` : ""}
                  </p>
                  {s.competency_assessment && <p className="mt-1 text-sm">{s.competency_assessment}</p>}
                  <div className="mt-2 max-w-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Readiness</span><span>{s.readiness_score}%</span>
                    </div>
                    <Progress className="mt-1" value={s.readiness_score} />
                  </div>
                </div>
                {canManage && (
                  <Select
                    value={s.readiness_band}
                    onValueChange={async (v) => {
                      await sb.from("succession_candidates").update({ readiness_band: v }).eq("id", s.id);
                      load();
                    }}
                  >
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {READINESS_BANDS.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
