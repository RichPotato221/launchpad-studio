import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

export default function SchoolOfMinistryWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", total_lessons: 1 });

  const load = async () => {
    const { data } = await supabase
      .from("courses")
      .select("*, enrollments(id, student_id, lessons_completed, status)")
      .eq("department_slug", departmentSlug)
      .order("title");
    setCourses(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const addCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("courses").insert({
      ...form, total_lessons: Number(form.total_lessons), department_slug: departmentSlug,
    });
    if (error) return toast.error(error.message);
    toast.success("Course added");
    setForm({ title: "", description: "", total_lessons: 1 });
    load();
  };

  const enroll = async (course_id: string) => {
    const { error } = await supabase.from("enrollments").insert({ course_id, student_id: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Enrolled");
    load();
  };

  const updateProgress = async (enrollment_id: string, lessons: number, total: number) => {
    const status = lessons >= total ? "completed" : "in_progress";
    const { error } = await supabase.from("enrollments").update({ lessons_completed: lessons, status }).eq("id", enrollment_id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add a course</p>
        <form onSubmit={addCourse} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Total lessons</Label><Input type="number" min={1} value={form.total_lessons} onChange={(e) => setForm({ ...form, total_lessons: Number(e.target.value) })} /></div>
          <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Button type="submit">Add course</Button></div>
        </form>
      </Card>

      <div className="space-y-4">
        {courses.map((c) => {
          const enrolled = c.enrollments?.find((e: any) => e.student_id === currentUserId);
          return (
            <Card key={c.id} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-serif text-lg">{c.title}</p>
                {!enrolled && <Button size="sm" onClick={() => enroll(c.id)}>Enrol me</Button>}
              </div>
              {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
              <table className="mt-4 w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-1">Student ID</th><th>Progress</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(c.enrollments ?? []).map((en: any) => (
                    <tr key={en.id} className="border-t">
                      <td className="py-2 font-mono text-xs">{en.student_id.slice(0, 8)}…</td>
                      <td className="py-2">
                        <Input type="number" min={0} max={c.total_lessons} defaultValue={en.lessons_completed}
                          onBlur={(e) => updateProgress(en.id, Number(e.target.value), c.total_lessons)}
                          className="h-8 w-20" /> / {c.total_lessons}
                      </td>
                      <td className="py-2">{en.status}</td>
                    </tr>
                  ))}
                  {(c.enrollments ?? []).length === 0 && (
                    <tr><td colSpan={3} className="py-3 text-center text-muted-foreground">No enrolments yet.</td></tr>
                  )}
                </tbody>
              </table>
            </Card>
          );
        })}
        {courses.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No courses yet.</Card>}
      </div>
    </div>
  );
}
