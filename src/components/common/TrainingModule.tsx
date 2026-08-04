import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { pct, ragForScore, today } from "@/lib/intercession";

const sb = supabase as any;

export type TrainingMember = { id: string | null; name: string };

type Props = {
  courseTable: string;
  recordTable: string;
  members: TrainingMember[];
  seedCourses: string[];
  canManage: boolean;
};

/** Reusable training & competency centre: course catalogue, records and a compliance matrix. */
export default function TrainingModule({ courseTable, recordTable, members, seedCourses, canManage }: Props) {
  const [courses, setCourses] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [courseForm, setCourseForm] = useState({ title: "", description: "", duration_hours: "2", required: true });
  const [recordForm, setRecordForm] = useState({
    member_name: "",
    course_id: "",
    completed_at: today(),
    score: "",
    progress_pct: "100",
  });

  const load = async () => {
    const [{ data: c }, { data: r }] = await Promise.all([
      sb.from(courseTable).select("*").order("title"),
      sb.from(recordTable).select("*").order("completed_at", { ascending: false }),
    ]);
    setCourses(c ?? []);
    setRecords(r ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseTable, recordTable]);

  const seed = async () => {
    const existing = new Set(courses.map((c) => c.title));
    const missing = seedCourses.filter((t) => !existing.has(t));
    if (missing.length === 0) return toast.info("Catalogue already loaded");
    const { error } = await sb.from(courseTable).insert(missing.map((title) => ({ title, required: true, duration_hours: 2 })));
    if (error) return toast.error(error.message);
    toast.success(`${missing.length} courses added to the catalogue`);
    load();
  };

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) return toast.error("Course title required");
    const { error } = await sb.from(courseTable).insert({
      title: courseForm.title,
      description: courseForm.description || null,
      duration_hours: Number(courseForm.duration_hours) || null,
      required: courseForm.required,
    });
    if (error) return toast.error(error.message);
    setCourseForm({ title: "", description: "", duration_hours: "2", required: true });
    load();
  };

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.member_name || !recordForm.course_id) return toast.error("Choose a member and a course");
    const member = members.find((m) => m.name === recordForm.member_name);
    const { error } = await sb.from(recordTable).insert({
      course_id: recordForm.course_id,
      user_id: member?.id ?? null,
      member_name: recordForm.member_name,
      completed_at: recordForm.completed_at || null,
      score: recordForm.score ? Number(recordForm.score) : null,
      progress_pct: Number(recordForm.progress_pct) || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Training recorded");
    setRecordForm({ ...recordForm, course_id: "", score: "" });
    load();
  };

  const required = courses.filter((c) => c.required);

  const matrix = useMemo(() => {
    return members.map((m) => {
      const cells = required.map((c) => {
        const rec = records.find((r) => r.member_name === m.name && r.course_id === c.id);
        const complete = !!rec && (rec.progress_pct ?? 0) >= 100;
        return { course: c, rec, state: !rec ? "missing" : complete ? "valid" : "in_progress" };
      });
      const valid = cells.filter((c) => c.state === "valid").length;
      return { member: m, cells, compliance: pct(valid, required.length || 1) };
    });
  }, [members, required, records]);

  const overall = matrix.length ? Math.round(matrix.reduce((s, m) => s + m.compliance, 0) / matrix.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Courses</p>
          <p className="font-serif text-2xl">{courses.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Records captured</p>
          <p className="font-serif text-2xl">{records.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Mandatory compliance</p>
          <p className="mt-1">
            <Badge variant="outline" className={RAG_CLASS[ragForScore(overall)]}>{overall}%</Badge>
          </p>
        </Card>
      </div>

      {canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg">Course catalogue</h3>
              <Button size="sm" variant="outline" onClick={seed}>Load standard catalogue</Button>
            </div>
            <form onSubmit={addCourse} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Course title</Label>
                <Input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
              </div>
              <div>
                <Label>Duration (hours)</Label>
                <Input
                  type="number"
                  value={courseForm.duration_hours}
                  onChange={(e) => setCourseForm({ ...courseForm, duration_hours: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <input
                  id={`${courseTable}-required`}
                  type="checkbox"
                  checked={courseForm.required}
                  onChange={(e) => setCourseForm({ ...courseForm, required: e.target.checked })}
                />
                <Label htmlFor={`${courseTable}-required`}>Mandatory</Label>
              </div>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Add course</Button></div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-serif text-lg">Record training</h3>
            <form onSubmit={addRecord} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Member</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={recordForm.member_name}
                  onChange={(e) => setRecordForm({ ...recordForm, member_name: e.target.value })}
                >
                  <option value="">Select…</option>
                  {members.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Course</Label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={recordForm.course_id}
                  onChange={(e) => setRecordForm({ ...recordForm, course_id: e.target.value })}
                >
                  <option value="">Select…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div>
                <Label>Completed on</Label>
                <Input type="date" value={recordForm.completed_at} onChange={(e) => setRecordForm({ ...recordForm, completed_at: e.target.value })} />
              </div>
              <div>
                <Label>Progress %</Label>
                <Input type="number" value={recordForm.progress_pct} onChange={(e) => setRecordForm({ ...recordForm, progress_pct: e.target.value })} />
              </div>
              <div>
                <Label>Score (%)</Label>
                <Input type="number" value={recordForm.score} onChange={(e) => setRecordForm({ ...recordForm, score: e.target.value })} />
              </div>
              <div className="sm:col-span-2"><Button type="submit" size="sm">Record training</Button></div>
            </form>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Competency matrix</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                `${recordTable}-matrix`,
                ["Member", ...required.map((c) => c.title), "Compliance %"],
                matrix.map((m) => [m.member.name, ...m.cells.map((c) => c.state), m.compliance]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Member</th>
                {required.map((c) => <th key={c.id} className="px-2">{c.title}</th>)}
                <th className="px-2">Compliance</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.member.name} className="border-t">
                  <td className="py-2 pr-3 font-medium">{row.member.name}</td>
                  {row.cells.map((c) => (
                    <td key={c.course.id} className="px-2">
                      <Badge
                        variant="outline"
                        className={
                          c.state === "valid" ? RAG_CLASS.green : c.state === "in_progress" ? RAG_CLASS.amber : RAG_CLASS.red
                        }
                      >
                        {c.state === "valid" ? fmtDate(c.rec?.completed_at) : c.state === "in_progress" ? "In progress" : "—"}
                      </Badge>
                    </td>
                  ))}
                  <td className="px-2">
                    <Badge variant="outline" className={RAG_CLASS[ragForScore(row.compliance)]}>{row.compliance}%</Badge>
                  </td>
                </tr>
              ))}
              {matrix.length === 0 && (
                <tr>
                  <td colSpan={2 + required.length} className="py-8 text-center text-sm text-muted-foreground">
                    Add team members to build the competency matrix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
