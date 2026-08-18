import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useBranchScope, filterByBranch } from "@/lib/useBranchScope";
import { useCurrentRole } from "@/lib/useCurrentRole";
import { ProcessOrdersModule } from "@/components/events/ProcessOrdersModule";
import { sendEventInvites } from "@/lib/eventInvites.functions";

import { Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/events")({
  head: () => ({ meta: [{ title: "Events & Roster — TRoGKC Portal" }] }),
  component: EventsPage,
});


const TYPES = ["service", "rehearsal", "meeting", "outreach", "training", "youth", "childrens", "other"] as const;
const BRANCHES = [
  { value: "etwatwa", label: "Etwatwa" },
  { value: "joburg_north", label: "Joburg North" },
  { value: "joburg_south", label: "Joburg South" },
] as const;
const ROSTER_STATUSES = ["invited", "confirmed", "declined", "tentative"] as const;

function EventsPage() {
  const scope = useBranchScope();
  const role = useCurrentRole();
  const canManage = (role.data?.roles ?? []).some((r) =>
    ["senior_apostle", "chairperson", "secretary", "lead_pastor", "associate_pastor"].includes(r),
  );

  const [events, setEvents] = useState<any[]>([]);
  const [rosters, setRosters] = useState<Record<string, any[]>>({});
  const [depts, setDepts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [feedUrl, setFeedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", event_type: "meeting", event_date: "",
    start_time: "", end_time: "", location: "", branch: "", department_slug: "",
  });

  const load = async () => {
    const { data: ev } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setEvents(ev ?? []);
    if (ev && ev.length) {
      const { data: rs } = await supabase.from("event_rosters").select("*").in("event_id", ev.map((e) => e.id));
      const grouped: Record<string, any[]> = {};
      (rs ?? []).forEach((r) => { (grouped[r.event_id] ||= []).push(r); });
      setRosters(grouped);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ""));
    supabase.from("departments").select("slug, name").order("name").then(({ data }) => setDepts(data ?? []));
    setFeedUrl(`${window.location.origin}/api/public/calendar.ics`);
    load();
  }, []);

  const visibleEvents = filterByBranch(events, scope.data);

  const copyFeedUrl = async () => {
    if (!feedUrl) return;
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Calendar feed link copied");
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        title: form.title,
        description: form.description || null,
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location || null,
        branch: (form.branch || null) as any,
        department_slug: form.department_slug || null,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    toast.success("Event scheduled — calendar invites are being sent");
    if (inserted?.id) {
      sendEventInvites({ data: { eventId: inserted.id, action: "create" } })
        .then((r: any) => {
          if (r?.sent) toast.success(`Calendar invite sent to ${r.sent} member${r.sent === 1 ? "" : "s"}`);
        })
        .catch((err) => console.error("Calendar invite failed", err));
    }
    setForm({ title: "", description: "", event_type: "meeting", event_date: "", start_time: "", end_time: "", location: "", branch: "", department_slug: "" });
    load();
  };

  return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Foundation module</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Events &amp; Roster</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Schedule services, rehearsals, meetings, and outreach. Build rosters — vocals, tech, ushers, teachers — and track who's confirmed.
          </p>
        </div>

        <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Event calendar</TabsTrigger>
          <TabsTrigger value="process-orders">Process orders</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
        <Card className="p-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Subscribe to calendar</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add this link to Google Calendar, Outlook, or Apple Calendar to see TRoGKC events automatically.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Input readOnly value={feedUrl} className="w-full md:w-80" />
                <Button variant="outline" size="icon" onClick={copyFeedUrl} aria-label="Copy calendar feed link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feedUrl)}`} target="_blank" rel="noopener noreferrer">Google Calendar</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={`https://outlook.office.com/owa/?path=/calendar/action/subscribe&url=${encodeURIComponent(feedUrl)}`} target="_blank" rel="noopener noreferrer">Outlook</a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={feedUrl.replace(/^https?:/, "webcal:")} target="_blank" rel="noopener noreferrer">Apple / Other</a>
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 mt-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Schedule an event</p>
          <form onSubmit={create} className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input required type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
            <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><Label>End</Label><Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>{BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
                <SelectTrigger><SelectValue placeholder="Church-wide" /></SelectTrigger>
                <SelectContent>{depts.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div className="md:col-span-3"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Button type="submit">Schedule event</Button></div>
          </form>
        </Card>

        <div className="mt-8 space-y-3">
          {visibleEvents.map((ev) => (
            <Card key={ev.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg">{ev.title}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-widest text-muted-foreground">
                    <span>{ev.event_date}</span>
                    {ev.start_time && <span>{ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ""}</span>}
                    <span>{ev.event_type}</span>
                    {ev.branch && <span>{ev.branch}</span>}
                    {ev.department_slug && <span>{ev.department_slug}</span>}
                    {ev.location && <span>{ev.location}</span>}
                  </div>
                  {ev.description && <p className="mt-2 text-sm text-muted-foreground">{ev.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}>
                    Roster ({(rosters[ev.id] ?? []).length})
                  </Button>
                  {canManage && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeEvent(ev)}>
                      Delete
                    </Button>
                  )}
                </div>

              </div>

              {expanded === ev.id && (
                <RosterPanel
                  eventId={ev.id}
                  userId={userId}
                  rows={rosters[ev.id] ?? []}
                  onChange={load}
                />
              )}
            </Card>
          ))}
          {visibleEvents.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No events yet.</Card>}
        </div>
        </TabsContent>

        <TabsContent value="process-orders">
          <ProcessOrdersModule canManage={canManage} />
        </TabsContent>
        </Tabs>
      </div>

  );
}

function RosterPanel({ eventId, userId, rows, onChange }: { eventId: string; userId: string; rows: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ full_name: "", role: "", notes: "" });

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("event_rosters").insert({
      event_id: eventId,
      full_name: form.full_name,
      role: form.role,
      notes: form.notes || null,
      created_by: userId,
    });
    if (error) return toast.error(error.message);
    setForm({ full_name: "", role: "", notes: "" });
    onChange();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("event_rosters").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("event_rosters").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <div className="mt-4 border-t border-border pt-4">
      <form onSubmit={add} className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        <Input placeholder="Role (e.g. vocalist, usher)" required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <Button type="submit" size="sm">Add to roster</Button>
      </form>
      <div className="mt-3 space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2 text-sm">
            <div>
              <span className="font-medium">{r.full_name}</span>
              <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">{r.role}</span>
              {r.notes && <span className="ml-2 text-xs text-muted-foreground">— {r.notes}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
                <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                <SelectContent>{ROSTER_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>Remove</Button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center text-xs text-muted-foreground">No one on the roster yet.</p>}
      </div>
    </div>
  );
}
