import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportRows, fmtDate, money } from "@/lib/finance";
import { Field, Picker, Stat } from "@/components/teams/TeamMembersModule";
import { TEAM_CONFIG, TEAM_SLUG, labelFor, nice, pct, today, type TeamKey } from "@/lib/ministryTeams";
import { publishDepartmentMeeting } from "@/lib/departmentMeetings";
import RsvpPanel from "@/components/events/RsvpPanel";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string };

/** Events, camps, retreats, breakfasts, services — with registration, budget, checklist and attendance capture. */
export default function TeamEventsModule({ team, canManage, currentUserId }: Props) {
  const cfg = TEAM_CONFIG[team];
  const [events, setEvents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [rsvpFor, setRsvpFor] = useState<string>("");

  const empty = {
    title: "",
    event_type: cfg.eventTypes[0]?.key ?? "service",
    event_date: today(),
    start_time: "",
    venue: "",
    speaker: "",
    theme: "",
    capacity: "",
    budget: "",
    resources: "",
    checklist: "",
    risk_notes: "",
    registrations: "0",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data: e }, { data: m }, { data: a }] = await Promise.all([
      sb.from("mt_events").select("*").eq("team", team).order("event_date", { ascending: false }),
      sb.from("mt_members").select("id, full_name").eq("team", team).order("full_name"),
      sb.from("mt_attendance").select("*").eq("team", team).limit(2000),
    ]);
    setEvents(e ?? []);
    setMembers(m ?? []);
    setAttendance(a ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the event a title");
    // Put it on the church calendar so the team is emailed a real invite with
    // Accept / Decline buttons, and the organiser can track replies.
    const eventId = await publishDepartmentMeeting({
      title: form.title,
      description: [form.theme, form.resources].filter(Boolean).join("\n\n") || null,
      eventDate: form.event_date,
      startTime: form.start_time || null,
      location: form.venue,
      departmentSlug: TEAM_SLUG[team],
      createdBy: currentUserId,
      eventType: "meeting",
    });

    const { error } = await sb.from("mt_events").insert({
      ...form,
      event_id: eventId,
      team,
      capacity: form.capacity ? Number(form.capacity) : null,
      budget: form.budget ? Number(form.budget) : null,
      registrations: Number(form.registrations || 0),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Event created — invitations sent and attendance sheet ready");
    setForm({ ...empty });
    setOpen(false);
    load();
  };

  const patch = async (row: any, p: Record<string, any>) => {
    const { error } = await sb.from("mt_events").update(p).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const attendedIds = useMemo(
    () => new Set(attendance.filter((a) => a.event_id === selected && a.present).map((a) => a.member_id)),
    [attendance, selected],
  );

  const mark = async (memberId: string, memberName: string, present: boolean) => {
    if (!selected) return;
    const existing = attendance.find((a) => a.event_id === selected && a.member_id === memberId);
    if (existing) {
      const { error } = await sb.from("mt_attendance").update({ present }).eq("id", existing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await sb.from("mt_attendance").insert({
        team,
        event_id: selected,
        member_id: memberId,
        member_name: memberName,
        present,
        created_by: currentUserId,
      });
      if (error) return toast.error(error.message);
    }
    const ev = events.find((e) => e.id === selected);
    const count = attendance.filter((a) => a.event_id === selected && a.present && a.member_id !== memberId).length + (present ? 1 : 0);
    if (ev) await sb.from("mt_events").update({ attendance_count: count }).eq("id", selected);
    load();
  };

  const upcoming = events.filter((e) => e.event_date >= today());
  const totalBudget = events.reduce((s, e) => s + Number(e.budget ?? 0), 0);
  const totalAttendance = events.reduce((s, e) => s + Number(e.attendance_count ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Events planned" value={events.length} />
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Total attendance captured" value={totalAttendance} />
        <Stat label="Budget requested" value={money(totalBudget)} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Events, camps &amp; gatherings</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(
                  `${team}-events`,
                  ["Title", "Type", "Date", "Venue", "Speaker", "Registered", "Attended", "Budget", "Status"],
                  events.map((e) => [
                    e.title,
                    labelFor(cfg.eventTypes, e.event_type),
                    e.event_date,
                    e.venue,
                    e.speaker,
                    e.registrations,
                    e.attendance_count,
                    e.budget,
                    nice(e.status),
                  ]),
                )
              }
            >
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            {canManage && <Button size="sm" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "New event"}</Button>}
          </div>
        </div>

        {open && canManage && (
          <form onSubmit={save} className="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-3">
            <Field label="Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Type">
              <Picker value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} options={cfg.eventTypes.map((t) => [t.key, t.label])} />
            </Field>
            <Field label="Date"><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></Field>
            <Field label="Start time"><Input value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} placeholder="18:00" /></Field>
            <Field label="Venue"><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></Field>
            <Field label="Speaker"><Input value={form.speaker} onChange={(e) => setForm({ ...form, speaker: e.target.value })} /></Field>
            <Field label="Theme"><Input value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></Field>
            <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
            <Field label="Budget (R)"><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
            <div className="md:col-span-3 grid gap-4 md:grid-cols-3">
              <Field label="Resources required"><Textarea rows={2} value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} /></Field>
              <Field label="Checklist"><Textarea rows={2} value={form.checklist} onChange={(e) => setForm({ ...form, checklist: e.target.value })} /></Field>
              <Field label="Risk assessment"><Textarea rows={2} value={form.risk_notes} onChange={(e) => setForm({ ...form, risk_notes: e.target.value })} /></Field>
            </div>
            <div className="md:col-span-3"><Button type="submit">Create event</Button></div>
          </form>
        )}

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2">Event</th><th>Type</th><th>Date</th><th>Venue</th><th>Registered</th><th>Attended</th><th>Budget</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-2 font-medium">{e.title}{e.theme && <div className="text-xs text-muted-foreground">{e.theme}</div>}</td>
                  <td className="text-xs">{labelFor(cfg.eventTypes, e.event_type)}</td>
                  <td className="text-xs">{fmtDate(e.event_date)} {e.start_time}</td>
                  <td className="text-xs">{e.venue || "—"}</td>
                  <td>{e.registrations}</td>
                  <td>{e.attendance_count}</td>
                  <td className="text-xs">{e.budget ? money(Number(e.budget)) : "—"}</td>
                  <td><Badge variant="outline" className="text-[11px]">{nice(e.status)}</Badge></td>
                  <td className="whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => setSelected(e.id)}>Attendance</Button>
                    {e.event_id && (
                      <Button size="sm" variant="ghost" onClick={() => setRsvpFor(rsvpFor === e.id ? "" : e.id)}>
                        {rsvpFor === e.id ? "Hide RSVPs" : "RSVPs"}
                      </Button>
                    )}
                    {canManage && e.status !== "completed" && (
                      <Button size="sm" variant="ghost" onClick={() => patch(e, { status: "completed" })}>Complete</Button>
                    )}
                  </td>
                </tr>
              ))}
              {events.length === 0 && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">No events yet.</td></tr>}
            </tbody>
          </table>
        </div>
        {rsvpFor && events.find((e) => e.id === rsvpFor)?.event_id && (
          <RsvpPanel eventId={events.find((e) => e.id === rsvpFor).event_id} />
        )}
      </Card>

      {selected && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-serif text-lg">Attendance register — {events.find((e) => e.id === selected)?.title}</h3>
            <Badge variant="outline">{attendedIds.size} of {members.length} present ({pct(attendedIds.size, members.length || 1)}%)</Badge>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <label key={m.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                <input
                  type="checkbox"
                  checked={attendedIds.has(m.id)}
                  disabled={!canManage}
                  onChange={(ev) => mark(m.id, m.full_name, ev.target.checked)}
                />
                {m.full_name}
              </label>
            ))}
            {members.length === 0 && <p className="text-sm text-muted-foreground">Add members to the register first.</p>}
          </div>
          <Button className="mt-4" variant="ghost" size="sm" onClick={() => setSelected("")}>Close register</Button>
        </Card>
      )}
    </div>
  );
}
