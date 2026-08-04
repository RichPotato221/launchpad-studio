import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, ShieldAlert } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import {
  PRAYER_CATEGORIES,
  PRAYER_PRIORITIES,
  PRAYER_STATUSES,
  PRAYER_STATUS_CLASS,
  PRIORITY_CLASS,
  daysSince,
  isOpen,
  labelFor,
  needsEscalation,
  today,
} from "@/lib/intercession";

const sb = supabase as any;

type Props = {
  canManage: boolean;
  isLeadership: boolean;
  currentUserId: string;
  team: any[];
  onChanged?: () => void;
};

/** Modules 2 & 3: prayer request intake, triage, assignment, follow-up and answered register. */
export default function PrayerRequestsModule({ canManage, isLeadership, currentUserId, team, onChanged }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  const empty = {
    requester_name: "",
    is_anonymous: false,
    phone: "",
    email: "",
    branch: "etwatwa",
    category: "general",
    priority: "normal",
    title: "",
    description: "",
    confidential: false,
    leadership_only: false,
    follow_up_required: true,
    follow_up_date: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb.from("int_requests").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the prayer request a title");
    const { error } = await sb.from("int_requests").insert({
      ...form,
      requester_id: currentUserId,
      requester_name: form.is_anonymous ? null : form.requester_name || null,
      follow_up_date: form.follow_up_date || null,
      status: "submitted",
    });
    if (error) return toast.error(error.message);
    toast.success("Prayer request submitted — the intercession team has been notified");
    setForm({ ...empty });
    load();
    onChanged?.();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("int_requests").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
    onChanged?.();
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!showArchived && r.archived) return false;
      if (status !== "all" && r.status !== status) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (!term) return true;
      return [r.prayer_no, r.title, r.description, r.requester_name, r.category]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [rows, q, status, priority, showArchived]);

  const open = rows.filter(isOpen);
  const escalations = open.filter(needsEscalation);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Open requests", value: open.length },
          { label: "Urgent / critical", value: open.filter((r) => ["urgent", "critical"].includes(r.priority)).length },
          { label: "Answered", value: rows.filter((r) => r.status === "answered").length },
          { label: "Overdue (7+ days)", value: escalations.length },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className="font-serif text-2xl">{s.value}</p>
          </Card>
        ))}
      </div>

      {escalations.length > 0 && canManage && (
        <Card className="border-amber-200 bg-amber-50/60 p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <ShieldAlert className="h-4 w-4" />
            {escalations.length} request{escalations.length > 1 ? "s have" : " has"} been open for 7 days or more and should be escalated to prayer leadership.
          </p>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="font-serif text-lg">Submit a prayer request</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Every request receives a unique prayer number, is triaged by the intercession team and is followed up until it is answered.
        </p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>Request title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {PRAYER_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRAYER_PRIORITIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
            </select>
          </div>
          <div>
            <Label>Branch</Label>
            <select
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
            >
              {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
            </select>
          </div>
          <div>
            <Label>Your name</Label>
            <Input
              disabled={form.is_anonymous}
              value={form.requester_name}
              onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Contact number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label>Follow-up date</Label>
            <Input type="date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <Label>Details</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex flex-wrap items-center gap-5 md:col-span-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_anonymous} onChange={(e) => setForm({ ...form, is_anonymous: e.target.checked })} />
              Submit anonymously
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.confidential} onChange={(e) => setForm({ ...form, confidential: e.target.checked })} />
              Confidential
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.leadership_only} onChange={(e) => setForm({ ...form, leadership_only: e.target.checked })} />
              Prayer leadership only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm({ ...form, follow_up_required: e.target.checked })} />
              Follow-up required
            </label>
          </div>
          <div className="md:col-span-3"><Button type="submit">Submit prayer request</Button></div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Prayer request register</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-56" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {PRAYER_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </select>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="all">All priorities</option>
              {PRAYER_PRIORITIES.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Archived
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  "prayer-requests",
                  ["Prayer no", "Title", "Category", "Priority", "Status", "Branch", "Requester", "Logged", "Follow-up", "Answered"],
                  filtered.map((r) => [
                    r.prayer_no, r.title, r.category, r.priority, r.status, branchLabel(r.branch),
                    r.is_anonymous ? "Anonymous" : r.requester_name, r.created_at, r.follow_up_date, r.answer_note,
                  ]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Excel (CSV)
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading prayer register…</p>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No prayer requests match this view.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.prayer_no}</span>
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="outline" className={PRIORITY_CLASS[r.priority] ?? ""}>{titleCase(r.priority)}</Badge>
                      <Badge variant="outline" className={PRAYER_STATUS_CLASS[r.status] ?? ""}>{titleCase(r.status)}</Badge>
                      {r.confidential && <Badge variant="outline">Confidential</Badge>}
                      {needsEscalation(r) && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">Escalate</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labelFor(PRAYER_CATEGORIES, r.category)} · {branchLabel(r.branch)} ·{" "}
                      {r.is_anonymous ? "Anonymous" : r.requester_name ?? "Member"} · logged {fmtDate(r.created_at)} ({daysSince(r.created_at)}d)
                    </p>
                    {r.description && <p className="mt-2 max-w-3xl text-sm">{r.description}</p>}
                    {r.answer_note && (
                      <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">Testimony: {r.answer_note}</p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex flex-col items-end gap-2">
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={r.status}
                        onChange={(e) => patch(r, { status: e.target.value })}
                      >
                        {PRAYER_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                      </select>
                      <select
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={r.assigned_to ?? ""}
                        onChange={(e) => patch(r, { assigned_to: e.target.value || null, status: e.target.value ? "assigned" : r.status })}
                      >
                        <option value="">Assign intercessor…</option>
                        {team.filter((t) => t.user_id).map((t) => (
                          <option key={t.id} value={t.user_id}>{t.full_name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        {r.status !== "answered" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const note = window.prompt("Record the testimony / how this prayer was answered:");
                              if (note === null) return;
                              patch(r, { status: "answered", answered_at: new Date().toISOString(), answer_note: note });
                            }}
                          >
                            Mark answered
                          </Button>
                        )}
                        {isLeadership && (
                          <Button size="sm" variant="outline" onClick={() => patch(r, { archived: !r.archived })}>
                            {r.archived ? "Restore" : "Archive"}
                          </Button>
                        )}
                      </div>
                      {r.follow_up_required && (
                        <Input
                          type="date"
                          className="h-9 w-40"
                          value={r.follow_up_date ?? ""}
                          onChange={(e) => patch(r, { follow_up_date: e.target.value || null })}
                        />
                      )}
                    </div>
                  )}
                </div>
                {r.follow_up_required && r.follow_up_date && r.follow_up_date <= today() && isOpen(r) && (
                  <p className="mt-2 text-xs font-medium text-amber-700">Follow-up due {fmtDate(r.follow_up_date)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
