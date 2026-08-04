import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { RAG_CLASS, exportRows, fmtDate } from "@/lib/finance";
import { pct, today } from "@/lib/intercession";
import { MED_PRIORITIES, MED_PROJECT_CHECKLIST, MED_PROJECT_TYPES, MED_STAGES, medLabel } from "@/lib/media";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Content production pipeline with stage board and delivery checklists. */
export default function MedProductionModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const empty = {
    name: "",
    project_type: "sermon_recording",
    ministry: "",
    description: "",
    assigned_team: "",
    priority: "medium",
    shoot_date: today(),
    deadline: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("med_projects").select("*").order("created_at", { ascending: false });
    setRows(data ?? []);
    if (!selected && (data ?? []).length) setSelected(data[0].id);
  };
  useEffect(() => {
    load();
  }, []);

  const active = rows.find((r) => r.id === selected);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_projects").insert({
      ...form,
      deadline: form.deadline || null,
      checklist: MED_PROJECT_CHECKLIST.map((t) => ({ task: t, done: false })),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Project created");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_projects").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleTask = async (idx: number) => {
    if (!active) return;
    const list = (active.checklist ?? []).map((c: any, i: number) => (i === idx ? { ...c, done: !c.done } : c));
    await patch(active.id, { checklist: list, progress_pct: pct(list.filter((c: any) => c.done).length, list.length) });
  };

  const board = useMemo(
    () => MED_STAGES.map((stage) => ({ stage, items: rows.filter((r) => r.stage === stage) })),
    [rows],
  );

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Create a production project</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{medLabel(t)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ministry</Label><Input value={form.ministry} onChange={(e) => setForm({ ...form, ministry: e.target.value })} /></div>
            <div><Label>Assigned team</Label><Input value={form.assigned_team} onChange={(e) => setForm({ ...form, assigned_team: e.target.value })} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MED_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Shoot date</Label><Input type="date" value={form.shoot_date} onChange={(e) => setForm({ ...form, shoot_date: e.target.value })} /></div>
            <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Button type="submit">Create project</Button></div>
          </form>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Production pipeline</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "media-projects",
              ["Name", "Type", "Ministry", "Stage", "Priority", "Shoot", "Deadline", "Progress"],
              rows.map((r) => [r.name, r.project_type, r.ministry, r.stage, r.priority, r.shoot_date, r.deadline, r.progress_pct]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-7">
        {board.map((col) => (
          <Card key={col.stage} className="p-3">
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{medLabel(col.stage)}</p>
            <p className="mt-1 font-serif text-xl">{col.items.length}</p>
            <div className="mt-2 space-y-2">
              {col.items.slice(0, 6).map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => setSelected(i.id)}
                  className="w-full rounded border p-2 text-left text-xs hover:bg-muted"
                >
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="block text-[0.65rem] text-muted-foreground">{i.deadline ? fmtDate(i.deadline) : "no deadline"}</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {active && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-serif text-lg">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {medLabel(active.project_type)} · {active.ministry ?? "no ministry"} · {active.assigned_team ?? "unassigned"} ·
                {active.deadline ? ` due ${fmtDate(active.deadline)}` : " no deadline"}
              </p>
              {active.description && <p className="mt-2 text-sm">{active.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={RAG_CLASS[(active.progress_pct ?? 0) >= 80 ? "green" : (active.progress_pct ?? 0) >= 40 ? "amber" : "red"]}>
                {active.progress_pct ?? 0}% complete
              </Badge>
              {canManage && (
                <div className="w-40">
                  <Select value={active.stage} onValueChange={(v) => patch(active.id, { stage: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MED_STAGES.map((s) => <SelectItem key={s} value={s}>{medLabel(s)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {(active.checklist ?? []).map((c: any, i: number) => (
              <label key={`${c.task}-${i}`} className="flex items-start gap-3 text-sm">
                <Checkbox checked={!!c.done} disabled={!canManage} onCheckedChange={() => toggleTask(i)} />
                <span className={c.done ? "text-muted-foreground line-through" : ""}>{c.task}</span>
              </label>
            ))}
          </div>
          {canManage && (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <Label>Publish URL</Label>
                <Input defaultValue={active.publish_url ?? ""} onBlur={(e) => e.target.value !== (active.publish_url ?? "") && patch(active.id, { publish_url: e.target.value })} />
              </div>
              <div>
                <Label>Publish date</Label>
                <Input type="date" defaultValue={active.publish_date ?? ""} onBlur={(e) => patch(active.id, { publish_date: e.target.value || null })} />
              </div>
            </div>
          )}
        </Card>
      )}

      {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No production projects yet.</Card>}
    </div>
  );
}
