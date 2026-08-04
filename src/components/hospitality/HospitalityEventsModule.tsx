import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { BRANCHES, RAG_CLASS, branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import {
  HOS_EVENT_TYPES,
  checklistProgress,
  estimateRefreshments,
  labelFor,
  normaliseChecklist,
  ragForScore,
} from "@/lib/hospitality";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** Event hospitality planning: readiness checklist, catering estimator and budget tracking. */
export default function HospitalityEventsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const empty = {
    title: "",
    event_type: "sunday_service",
    branch: "etwatwa",
    venue: "",
    starts_at: isoLocal(new Date()),
    ends_at: isoLocal(new Date(Date.now() + 3 * 3600_000)),
    expected_attendance: "",
    vip_guests: "",
    catering_notes: "",
    seating_notes: "",
    equipment_needed: "",
    budget_amount: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("hos_events").select("*").order("starts_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the event a title");
    const { error } = await sb.from("hos_events").insert({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      expected_attendance: form.expected_attendance ? Number(form.expected_attendance) : null,
      budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      checklist: normaliseChecklist(null),
      readiness_pct: 0,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Event added to the hospitality plan");
    setForm({ ...empty });
    load();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("hos_events").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const toggleCheck = async (row: any, index: number) => {
    const items = normaliseChecklist(row.checklist);
    items[index].done = !items[index].done;
    const done = items.filter((i) => i.done).length;
    await patch(row, { checklist: items, readiness_pct: Math.round((done / items.length) * 100) });
  };

  const upcoming = useMemo(() => rows.filter((r) => new Date(r.starts_at) >= new Date()), [rows]);
  const spend = rows.reduce((s, r) => s + Number(r.actual_spend ?? 0), 0);
  const budget = rows.reduce((s, r) => s + Number(r.budget_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming events</p><p className="font-serif text-2xl">{upcoming.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Events planned</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Budget</p><p className="font-serif text-2xl">{money(budget)}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Actual spend</p><p className="font-serif text-2xl">{money(spend)}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Plan an event</h3>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Event title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                {HOS_EVENT_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Expected attendance</Label><Input type="number" value={form.expected_attendance} onChange={(e) => setForm({ ...form, expected_attendance: e.target.value })} /></div>
            <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div><Label>Budget (R)</Label><Input type="number" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: e.target.value })} /></div>
            <div><Label>VIP guests</Label><Input value={form.vip_guests} onChange={(e) => setForm({ ...form, vip_guests: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Catering notes</Label><Textarea rows={2} value={form.catering_notes} onChange={(e) => setForm({ ...form, catering_notes: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Seating & décor</Label><Textarea rows={2} value={form.seating_notes} onChange={(e) => setForm({ ...form, seating_notes: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Equipment needed</Label><Textarea rows={2} value={form.equipment_needed} onChange={(e) => setForm({ ...form, equipment_needed: e.target.value })} /></div>
            <div className="md:col-span-3"><Button type="submit">Add event</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Event hospitality plan</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "hospitality-events",
                ["Event", "Type", "Branch", "Venue", "Starts", "Expected", "Readiness %", "Budget", "Spend", "Status"],
                rows.map((r) => [r.title, r.event_type, branchLabel(r.branch), r.venue, r.starts_at, r.expected_attendance, r.readiness_pct, r.budget_amount, r.actual_spend, r.status]),
              )
            }
          >
            <Download className="mr-2 h-4 w-4" /> Excel (CSV)
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const progress = checklistProgress(r.checklist);
            return (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="outline">{labelFor(HOS_EVENT_TYPES, r.event_type)}</Badge>
                      <Badge variant="outline" className={RAG_CLASS[ragForScore(progress.pct, 90, 60)]}>{progress.pct}% ready</Badge>
                      {r.vip_guests && <Badge variant="outline">VIP</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.starts_at).toLocaleString()} · {r.venue || "Venue TBC"} · {branchLabel(r.branch)} ·{" "}
                      {r.expected_attendance ?? "—"} expected · budget {money(Number(r.budget_amount ?? 0))}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                    {openId === r.id ? "Close" : "Open plan"}
                  </Button>
                </div>

                {openId === r.id && (
                  <div className="mt-4 grid gap-6 border-t pt-4 lg:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium">Readiness checklist</h4>
                      <div className="mt-2 space-y-1">
                        {progress.items.map((item, i) => (
                          <label key={item.label} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={item.done} disabled={!canManage} onChange={() => toggleCheck(r, i)} />
                            <span className={item.done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium">Catering estimate for {r.expected_attendance ?? 0} people</h4>
                      <table className="mt-2 w-full text-sm">
                        <tbody>
                          {estimateRefreshments(r.expected_attendance ?? 0).map((e) => (
                            <tr key={e.item} className="border-t">
                              <td className="py-1.5">{e.item}</td>
                              <td className="py-1.5 text-right font-medium">{e.qty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {canManage && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label>Actual spend (R)</Label>
                            <Input type="number" defaultValue={r.actual_spend ?? ""} onBlur={(e) => patch(r, { actual_spend: Number(e.target.value) || 0 })} />
                          </div>
                          <div>
                            <Label>Volunteers assigned</Label>
                            <Input defaultValue={r.volunteers_assigned ?? ""} onBlur={(e) => patch(r, { volunteers_assigned: e.target.value })} />
                          </div>
                          <div className="sm:col-span-2">
                            <Label>Status</Label>
                            <select
                              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={r.status ?? "planning"}
                              onChange={(e) => patch(r, { status: e.target.value })}
                            >
                              {["planning", "confirmed", "in_progress", "completed", "cancelled"].map((s) => (
                                <option key={s} value={s}>{titleCase(s)}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No events planned yet.</p>}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">Last refreshed {fmtDate(new Date().toISOString())}</p>
    </div>
  );
}
