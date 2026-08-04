import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";
import { Field, Picker, Stat } from "@/components/teams/TeamMembersModule";
import { TASK_PRIORITIES, TASK_STATUSES, nice, pct, today, type TeamKey } from "@/lib/ministryTeams";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string };

/** Task & project board — Kanban plus a due-date timeline. */
export default function TeamTasksModule({ team, canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [view, setView] = useState<"kanban" | "timeline">("kanban");
  const empty = { title: "", description: "", assignee_name: "", priority: "medium", due_date: today() };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("mt_tasks").select("*").eq("team", team).order("due_date");
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Describe the task");
    const { error } = await sb.from("mt_tasks").insert({ ...form, team, due_date: form.due_date || null, created_by: currentUserId });
    if (error) return toast.error(error.message);
    toast.success("Task created");
    setForm({ ...empty });
    load();
  };

  const move = async (row: any, status: string) => {
    const { error } = await sb
      .from("mt_tasks")
      .update({ status, progress_pct: status === "done" ? 100 : row.progress_pct })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const done = rows.filter((r) => r.status === "done");
  const overdue = rows.filter((r) => r.status !== "done" && r.due_date && r.due_date < today());
  const completion = pct(done.length, rows.length || 1);

  const timeline = useMemo(() => [...rows].sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))), [rows]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tasks" value={rows.length} />
        <Stat label="Completed" value={done.length} />
        <Stat label="Overdue" value={overdue.length} />
        <Stat label="Completion" value={`${completion}%`} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Task &amp; project board</h3>
          <div className="flex gap-2">
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")}>Kanban</Button>
            <Button size="sm" variant={view === "timeline" ? "default" : "outline"} onClick={() => setView("timeline")}>Timeline</Button>
          </div>
        </div>

        {canManage && (
          <form onSubmit={save} className="mt-4 grid gap-4 md:grid-cols-4">
            <Field label="Task"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Assign to"><Input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} /></Field>
            <Field label="Priority">
              <Picker value={form.priority} onChange={(v) => setForm({ ...form, priority: v })} options={TASK_PRIORITIES.map((p) => [p, nice(p)])} />
            </Field>
            <Field label="Due"><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <div className="md:col-span-3"><Field label="Checklist / notes"><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></div>
            <div className="flex items-end"><Button type="submit">Add task</Button></div>
          </form>
        )}

        {view === "kanban" ? (
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {TASK_STATUSES.map((s) => (
              <div key={s} className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{nice(s)}</p>
                <div className="mt-3 space-y-2">
                  {rows.filter((r) => r.status === s).map((r) => (
                    <Card key={r.id} className="p-3 text-sm">
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.assignee_name || "Unassigned"} · due {r.due_date ? fmtDate(r.due_date) : "—"}</p>
                      <Badge variant="outline" className="mt-2 text-[11px]">{nice(r.priority)}</Badge>
                      <Progress value={r.progress_pct} className="mt-2 h-1.5" />
                      {canManage && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {TASK_STATUSES.filter((x) => x !== s).map((x) => (
                            <Button key={x} size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => move(r, x)}>
                              {nice(x)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                  {rows.filter((r) => r.status === s).length === 0 && <p className="text-xs text-muted-foreground">Nothing here.</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {timeline.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.assignee_name || "Unassigned"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${r.due_date && r.due_date < today() && r.status !== "done" ? "font-medium text-red-700" : "text-muted-foreground"}`}>
                    {r.due_date ? fmtDate(r.due_date) : "No date"}
                  </span>
                  <Badge variant="outline" className="text-[11px]">{nice(r.status)}</Badge>
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
