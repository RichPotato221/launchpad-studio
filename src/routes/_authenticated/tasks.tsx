import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks & Approvals — TRoGKC Portal" }] }),
  component: TasksPage,
});

const STATUSES = ["todo", "in_progress", "blocked", "done", "cancelled"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

function TasksPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [depts, setDepts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "mine" | "approvals">("all");
  const [form, setForm] = useState({
    title: "",
    description: "",
    department_slug: "",
    due_date: "",
    priority: "normal",
    requires_approval: false,
  });

  const load = async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    supabase.from("departments").select("slug, name").order("name").then(({ data }) => setDepts(data ?? []));
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const payload: any = {
      title: form.title,
      description: form.description || null,
      department_slug: form.department_slug || null,
      due_date: form.due_date || null,
      priority: form.priority,
      requires_approval: form.requires_approval,
      created_by: userId,
    };
    if (form.requires_approval) payload.approval_status = "pending";
    const { error } = await supabase.from("tasks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Task created");
    setForm({ title: "", description: "", department_slug: "", due_date: "", priority: "normal", requires_approval: false });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("tasks").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const approve = async (id: string, next: string) => {
    const patch: any = { approval_status: next, approved_at: new Date().toISOString() };
    if (next === "chair_approved") patch.approved_by_chair = userId;
    if (next === "senior_pastor_approved") patch.approved_by_senior = userId;
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const visible = rows.filter((r) => {
    if (filter === "mine") return r.assigned_to === userId || r.created_by === userId;
    if (filter === "approvals") return r.requires_approval && r.approval_status !== "senior_pastor_approved" && r.approval_status !== "rejected";
    return true;
  });

  return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Foundation module</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Tasks &amp; Approvals</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Assign work, track progress, and route sensitive items through the Chairperson → Senior Pastor approval chain.
          </p>
        </div>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">New task</p>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Church-wide" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox id="req" checked={form.requires_approval} onCheckedChange={(v) => setForm({ ...form, requires_approval: !!v })} />
              <Label htmlFor="req" className="cursor-pointer">Requires Chair → Senior Pastor approval</Label>
            </div>
            <div className="md:col-span-2"><Button type="submit">Create task</Button></div>
          </form>
        </Card>

        <div className="mt-8 flex flex-wrap gap-2">
          {(["all", "mine", "approvals"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "All tasks" : f === "mine" ? "Assigned / created by me" : "Awaiting approval"}
            </Button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {visible.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg">{r.title}</p>
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground">
                    {r.department_slug && <span>{r.department_slug}</span>}
                    <span>Priority: {r.priority}</span>
                    {r.due_date && <span>Due {r.due_date}</span>}
                    {r.requires_approval && <span className="text-teal-700">Approval: {r.approval_status ?? "pending"}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                    <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  {r.requires_approval && r.approval_status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(r.id, "chair_approved")}>Chair approve</Button>
                      <Button size="sm" variant="outline" onClick={() => approve(r.id, "rejected")}>Reject</Button>
                    </>
                  )}
                  {r.requires_approval && r.approval_status === "chair_approved" && (
                    <Button size="sm" onClick={() => approve(r.id, "senior_pastor_approved")}>Senior Pastor approve</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {visible.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No tasks yet.</Card>}
        </div>
      </div>
    </PortalShell>
  );
}
