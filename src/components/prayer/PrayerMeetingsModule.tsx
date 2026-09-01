import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarPlus, Download } from "lucide-react";
import { BRANCHES, branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { MEETING_TYPES, buildIcs, downloadIcs, googleCalendarUrl, labelFor, outlookCalendarUrl, pct } from "@/lib/intercession";
import { publishDepartmentMeeting, splitTimestamp } from "@/lib/departmentMeetings";
import RsvpPanel from "@/components/events/RsvpPanel";
import PrayerRosterModule from "@/components/prayer/PrayerRosterModule";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** Modules 5 & 6: prayer meeting scheduling, calendar sync and minutes/attendance capture. */
export default function PrayerMeetingsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [minutesFor, setMinutesFor] = useState<string | null>(null);
  const [rsvpFor, setRsvpFor] = useState<string | null>(null);

  const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const empty = {
    title: "",
    meeting_type: "corporate",
    branch: "etwatwa",
    venue: "",
    host: "",
    starts_at: isoLocal(new Date()),
    ends_at: isoLocal(new Date(Date.now() + 2 * 3600_000)),
    prayer_focus: "",
    scriptures: "",
    expected_count: "",
    recurrence: "none",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const { data } = await sb.from("int_meetings").select("*").order("starts_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give the meeting a title");
    // Publish on the church calendar first so every intercessor in this
    // branch is emailed a real invite with Accept / Decline buttons.
    const start = splitTimestamp(new Date(form.starts_at).toISOString());
    const end = splitTimestamp(new Date(form.ends_at).toISOString());
    const eventId = await publishDepartmentMeeting({
      title: form.title,
      description: [form.prayer_focus, form.scriptures].filter(Boolean).join("\n\n") || null,
      eventDate: start.date,
      startTime: start.time,
      endTime: end.time,
      location: form.venue,
      branch: form.branch,
      departmentSlug: "prayer-intercession",
      createdBy: currentUserId,
    });

    const { error } = await sb.from("int_meetings").insert({
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      expected_count: form.expected_count ? Number(form.expected_count) : null,
      event_id: eventId,
      leader_id: currentUserId,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Prayer meeting scheduled — invitations are on their way");
    setForm({ ...empty });
    load();
  };

  const patch = async (row: any, values: Record<string, any>) => {
    const { error } = await sb.from("int_meetings").update(values).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const upcoming = useMemo(() => rows.filter((r) => new Date(r.starts_at) >= new Date()).reverse(), [rows]);
  const past = useMemo(() => rows.filter((r) => new Date(r.starts_at) < new Date()), [rows]);

  const attendanceRate = (r: any) => (r.expected_count ? pct(r.attendance_count ?? 0, r.expected_count) : null);
  const totalPrayerHours = rows.reduce((s, r) => s + Number(r.prayer_hours ?? 0), 0);

  const exportCalendar = () => {
    const ics = buildIcs(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        start: r.starts_at,
        end: r.ends_at,
        location: r.venue,
        description: r.prayer_focus,
      })),
    );
    downloadIcs("trogkc-prayer-calendar", ics);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming</p><p className="font-serif text-2xl">{upcoming.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Held</p><p className="font-serif text-2xl">{past.length}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Prayer hours logged</p><p className="font-serif text-2xl">{totalPrayerHours}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Total attendance</p><p className="font-serif text-2xl">{rows.reduce((s, r) => s + (r.attendance_count ?? 0), 0)}</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <h3 className="font-serif text-lg">Schedule a prayer meeting</h3>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value })}>
                {MEETING_TYPES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })}>
                {BRANCHES.map((b) => <option key={b} value={b}>{branchLabel(b)}</option>)}
              </select>
            </div>
            <div><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><Label>Host / facilitator</Label><Input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></div>
            <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div><Label>Expected attendance</Label><Input type="number" value={form.expected_count} onChange={(e) => setForm({ ...form, expected_count: e.target.value })} /></div>
            <div>
              <Label>Recurrence</Label>
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                {["none", "weekly", "fortnightly", "monthly"].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><Label>Prayer focus</Label><Textarea rows={2} value={form.prayer_focus} onChange={(e) => setForm({ ...form, prayer_focus: e.target.value })} /></div>
            <div className="md:col-span-1"><Label>Scriptures</Label><Textarea rows={2} value={form.scriptures} onChange={(e) => setForm({ ...form, scriptures: e.target.value })} /></div>
            <div className="md:col-span-3"><Button type="submit">Schedule meeting</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Prayer calendar</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCalendar}><CalendarPlus className="mr-2 h-4 w-4" /> Download .ics</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportRows(
                  "prayer-meetings",
                  ["Title", "Type", "Branch", "Venue", "Starts", "Expected", "Attended", "Prayer hours", "Status"],
                  rows.map((r) => [r.title, r.meeting_type, branchLabel(r.branch), r.venue, r.starts_at, r.expected_count, r.attendance_count, r.prayer_hours, r.status]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Excel (CSV)
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const rate = attendanceRate(r);
            return (
              <div key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.title}</p>
                      <Badge variant="outline">{labelFor(MEETING_TYPES, r.meeting_type)}</Badge>
                      {r.recurrence && r.recurrence !== "none" && <Badge variant="outline">{titleCase(r.recurrence)}</Badge>}
                      {rate !== null && <Badge variant="outline">{rate}% attendance</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(r.starts_at).toLocaleString()} · {r.venue || "Venue TBC"} · {branchLabel(r.branch)} · Host: {r.host || "—"}
                    </p>
                    {r.prayer_focus && <p className="mt-2 max-w-3xl text-sm">{r.prayer_focus}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className="text-xs underline" href={googleCalendarUrl({ title: r.title, start: r.starts_at, end: r.ends_at, location: r.venue, description: r.prayer_focus })} target="_blank" rel="noreferrer">Google</a>
                    <a className="text-xs underline" href={outlookCalendarUrl({ title: r.title, start: r.starts_at, end: r.ends_at, location: r.venue, description: r.prayer_focus })} target="_blank" rel="noreferrer">Outlook</a>
                    {r.event_id && (
                      <Button size="sm" variant="outline" onClick={() => setRsvpFor(rsvpFor === r.id ? null : r.id)}>
                        {rsvpFor === r.id ? "Hide RSVPs" : "RSVPs"}
                      </Button>
                    )}
                    {canManage && (
                      <Button size="sm" variant="outline" onClick={() => setMinutesFor(minutesFor === r.id ? null : r.id)}>
                        {minutesFor === r.id ? "Close" : "Minutes & attendance"}
                      </Button>
                    )}
                  </div>
                </div>

                {rsvpFor === r.id && r.event_id && <RsvpPanel eventId={r.event_id} />}

                {minutesFor === r.id && canManage && (
                  <div className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-3">
                    <div>
                      <Label>Attendance</Label>
                      <Input type="number" defaultValue={r.attendance_count ?? ""} onBlur={(e) => patch(r, { attendance_count: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Prayer hours</Label>
                      <Input type="number" step="0.5" defaultValue={r.prayer_hours ?? ""} onBlur={(e) => patch(r, { prayer_hours: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Recording link</Label>
                      <Input defaultValue={r.recording_url ?? ""} onBlur={(e) => patch(r, { recording_url: e.target.value || null })} />
                    </div>
                    <div className="md:col-span-3"><Label>Minutes</Label><Textarea rows={3} defaultValue={r.minutes ?? ""} onBlur={(e) => patch(r, { minutes: e.target.value })} /></div>
                    <div className="md:col-span-1"><Label>Declarations</Label><Textarea rows={2} defaultValue={r.declarations ?? ""} onBlur={(e) => patch(r, { declarations: e.target.value })} /></div>
                    <div className="md:col-span-1"><Label>Testimonies</Label><Textarea rows={2} defaultValue={r.testimonies ?? ""} onBlur={(e) => patch(r, { testimonies: e.target.value })} /></div>
                    <div className="md:col-span-1"><Label>Action items</Label><Textarea rows={2} defaultValue={r.action_items ?? ""} onBlur={(e) => patch(r, { action_items: e.target.value })} /></div>
                    <div className="md:col-span-3">
                      <Button size="sm" onClick={() => patch(r, { status: "completed" })}>Mark completed</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No prayer meetings scheduled yet.</p>}
        </div>
      </Card>

      <PrayerRosterModule canManage={canManage} currentUserId={currentUserId} />
    </div>
  );
}
