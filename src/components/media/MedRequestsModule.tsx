import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { today } from "@/lib/intercession";
import { MED_PRIORITIES, MED_REQUEST_STATUSES, MED_REQUEST_TYPES, MED_STATUS_CLASS, medLabel } from "@/lib/media";
import { DEPARTMENTS } from "@/lib/departments";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Department requests: intake, triage, approval and turnaround tracking. */
export default function MedRequestsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const empty = {
    title: "",
    request_type: "announcement",
    department_slug: "",
    description: "",
    audience: "",
    priority: "medium",
    needed_by: today(),
    attachment_url: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data, error } = await sb.from("med_requests").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setRows(data ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("med_requests").insert({
      ...form,
      department_slug: form.department_slug || null,
      requester_id: currentUserId,
      created_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Request submitted to the media team");
    setForm({ ...empty });
    load();
  };

  const patch = async (id: string, values: Record<string, any>) => {
    const { error } = await sb.from("med_requests").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = useMemo(() => (filter === "all" ? rows : rows.filter((r) => r.status === filter)), [rows, filter]);
  const overdue = rows.filter((r) => r.needed_by && r.needed_by < today() && !["published", "declined"].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Requests</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">In production</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.status === "in_production").length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Published</p><p className="mt-1 font-serif text-2xl">{rows.filter((r) => r.status === "published").length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Overdue</p><p className="mt-1 font-serif text-2xl">{overdue.length}</p></Card>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Raise a media request</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Any department can request announcements, posters, photography, videography, livestreams, campaigns or website
          updates. The media team reviews, schedules and publishes.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MED_REQUEST_TYPES.map((t) => <SelectItem key={t} value={t}>{medLabel(t)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Requesting department</Label>
            <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d: any) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MED_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{medLabel(p)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Needed by</Label><Input type="date" value={form.needed_by} onChange={(e) => setForm({ ...form, needed_by: e.target.value })} /></div>
          <div className="md:col-span-3"><Label>Brief</Label><Textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Audience</Label><Input value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Reference / attachment URL</Label><Input value={form.attachment_url} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} /></div>
          <div><Button type="submit">Submit request</Button></div>
        </form>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {MED_REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{medLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            exportRows(
              "media-requests",
              ["Title", "Type", "Department", "Priority", "Needed by", "Status", "Assigned"],
              filtered.map((r) => [r.title, r.request_type, r.department_slug, r.priority, r.needed_by, r.status, r.assigned_to]),
            )
          }
        >
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {medLabel(r.request_type)} · {r.department_slug ?? "no department"} · needed {fmtDate(r.needed_by)} · {medLabel(r.priority)} priority
                </p>
                <p className="mt-2 text-sm">{r.description}</p>
                {r.attachment_url && <a className="mt-1 inline-block text-xs underline" href={r.attachment_url} target="_blank" rel="noreferrer">Open reference</a>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={MED_STATUS_CLASS[r.status] ?? ""}>{medLabel(r.status)}</Badge>
                {canManage && (
                  <>
                    <div className="w-44">
                      <Select value={r.status} onValueChange={(v) => patch(r.id, { status: v, published_at: v === "published" ? new Date().toISOString() : r.published_at })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{MED_REQUEST_STATUSES.map((s) => <SelectItem key={s} value={s}>{medLabel(s)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="w-40"
                      placeholder="Assign to…"
                      defaultValue={r.assigned_to ?? ""}
                      onBlur={(e) => e.target.value !== (r.assigned_to ?? "") && patch(r.id, { assigned_to: e.target.value })}
                    />
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No requests yet.</Card>}
      </div>
    </div>
  );
}
