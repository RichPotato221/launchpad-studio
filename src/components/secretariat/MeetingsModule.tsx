import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Printer, Trash2 } from "lucide-react";
import {
  MEETING_TYPES,
  BRANCHES,
  branchLabel,
  fmtDate,
  fmtDateTime,
  exportRows,
  exportPdf,
  logAudit,
} from "@/lib/secretariat";

type Props = { currentUserId: string; canManage: boolean };

/* ────────────────────────── list + create ────────────────────────── */

export default function MeetingsModule({ currentUserId, canManage }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  if (openId) {
    return <MeetingDetail meetingId={openId} currentUserId={currentUserId} canManage={canManage} onBack={() => setOpenId(null)} />;
  }
  return <MeetingList currentUserId={currentUserId} canManage={canManage} onOpen={setOpenId} />;
}

function MeetingList({
  currentUserId,
  canManage,
  onOpen,
}: Props & { onOpen: (id: string) => void }) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: "",
    meeting_type: "Leadership Meeting",
    event_date: "",
    start_time: "",
    end_time: "",
    location: "",
    meeting_link: "",
    branch: "",
    description: "",
  });

  const meetings = useQuery({
    queryKey: ["secretariat-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, status, created_at, chairperson_id, secretary_id, event_id, events(title, event_type, event_date, start_time, location, branch, description)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const create = async () => {
    if (!form.title || !form.event_date) {
      toast.error("A title and a date are required.");
      return;
    }
    // A blank branch means "church-wide". Only cross-branch offices may post that,
    // so fall back to the organiser's own branch when they may not.
    let branch: string | null = form.branch || null;
    if (!branch) {
      const { data: me } = await supabase.rpc("can_post_cross_branch", { _user_id: currentUserId });
      if (!me) {
        const { data: prof } = await supabase.from("profiles").select("branch").eq("id", currentUserId).maybeSingle();
        branch = (prof as any)?.branch ?? null;
      }
    }
    const { data: evt, error: evtErr } = await supabase
      .from("events")
      .insert({
        title: form.title,
        event_type: form.meeting_type,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: [form.location, form.meeting_link].filter(Boolean).join(" · ") || null,
        branch: branch as never,
        description: form.description || null,
        department_slug: "secretary",
        created_by: currentUserId,
      })
      .select("id")
      .single();
    if (evtErr) {
      toast.error(evtErr.message);
      return;
    }
    const { data: mtg, error: mtgErr } = await supabase
      .from("meetings")
      .insert({ event_id: evt.id, secretary_id: currentUserId, created_by: currentUserId, status: "scheduled" })
      .select("id")
      .single();
    if (mtgErr) {
      toast.error(mtgErr.message);
      return;
    }
    await supabase.from("agendas").insert({
      meeting_id: mtg.id,
      title: `${form.title} — Agenda`,
      status: "draft",
      created_by: currentUserId,
    });
    await logAudit("create", "meeting", mtg.id, { title: form.title });
    toast.success("Meeting created — calendar, agenda and register are live.");
    setCreating(false);
    setForm({ title: "", meeting_type: "Leadership Meeting", event_date: "", start_time: "", end_time: "", location: "", meeting_link: "", branch: "", description: "" });
    qc.invalidateQueries({ queryKey: ["secretariat-meetings"] });
    qc.invalidateQueries({ queryKey: ["secretariat-cockpit"] });
  };

  /** Secretariat / chairperson deletion of a scheduled meeting and its calendar entry. */
  const remove = async (m: any) => {
    const title = m.events?.title ?? "this meeting";
    if (!window.confirm(`Delete “${title}”? The agenda, minutes and calendar entry will be removed.`)) return;
    const { error } = await supabase.from("meetings").delete().eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (m.event_id) await supabase.from("events").delete().eq("id", m.event_id);
    await logAudit("delete", "meeting", m.id, { title });
    toast.success("Meeting deleted.");
    qc.invalidateQueries({ queryKey: ["secretariat-meetings"] });
    qc.invalidateQueries({ queryKey: ["secretariat-cockpit"] });
  };

  const rows = meetings.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <p className="text-sm text-muted-foreground">{rows.length} meetings on record.</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "meetings-register",
                ["Title", "Type", "Date", "Venue", "Branch", "Status"],
                rows.map((m: any) => [
                  m.events?.title,
                  m.events?.event_type,
                  m.events?.event_date,
                  m.events?.location,
                  branchLabel(m.events?.branch),
                  m.status,
                ]),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <Printer className="mr-1.5 h-4 w-4" /> PDF
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setCreating((c) => !c)}>
              <Plus className="mr-1.5 h-4 w-4" /> New meeting
            </Button>
          )}
        </div>
      </div>

      {creating && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Meeting title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Meeting type</Label>
              <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Venue / room</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Online meeting link (Teams / Zoom / Meet)</Label>
              <Input value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} placeholder="https://" />
            </div>
            <div>
              <Label>Branch</Label>
              <Select value={form.branch || "all"} onValueChange={(v) => setForm({ ...form, branch: v === "all" ? "" : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Purpose / notes</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={create}>Create meeting</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Creating a meeting publishes it to the Governance Calendar (and the subscribable iCal feed), opens a draft agenda and an attendance register.
          </p>
        </Card>
      )}

      {rows.length === 0 && <p className="text-sm text-muted-foreground">No meetings yet.</p>}
      <div className="grid gap-3">
        {rows.map((m: any) => (
          <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{m.events?.title ?? "Untitled meeting"}</p>
              <p className="text-xs text-muted-foreground">
                {m.events?.event_type} · {fmtDate(m.events?.event_date)}
                {m.events?.start_time ? ` · ${String(m.events.start_time).slice(0, 5)}` : ""}
                {m.events?.location ? ` · ${m.events.location}` : ""} · {branchLabel(m.events?.branch)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{m.status}</Badge>
              <Button size="sm" variant="secondary" onClick={() => onOpen(m.id)}>Open workspace</Button>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(m)}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────── meeting workspace ────────────────────────── */

function MeetingDetail({
  meetingId,
  currentUserId,
  canManage,
  onBack,
}: Props & { meetingId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["meeting", meetingId] });
    qc.invalidateQueries({ queryKey: ["secretariat-cockpit"] });
  };

  const q = useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const [meeting, agenda, minutes, resolutions, apologies, visitors, votes, attendees, members] = await Promise.all([
        supabase.from("meetings").select("*, events(*)").eq("id", meetingId).maybeSingle(),
        supabase.from("agendas").select("*, agenda_items(*)").eq("meeting_id", meetingId).maybeSingle(),
        supabase.from("minutes").select("*").eq("meeting_id", meetingId).maybeSingle(),
        supabase.from("resolutions").select("*").eq("meeting_id", meetingId).order("created_at"),
        supabase.from("meeting_apologies").select("*").eq("meeting_id", meetingId),
        supabase.from("meeting_visitors").select("*").eq("meeting_id", meetingId),
        supabase.from("meeting_votes").select("*").eq("meeting_id", meetingId).order("created_at"),
        supabase.from("meetings").select("event_id").eq("id", meetingId).maybeSingle(),
        supabase.from("profiles").select("id, full_name").eq("approval_status", "approved").order("full_name"),
      ]);
      const eventId = attendees.data?.event_id;
      const register = eventId
        ? await supabase.from("event_attendees").select("*").eq("event_id", eventId)
        : { data: [] as any[] };
      return {
        meeting: meeting.data,
        agenda: agenda.data,
        minutes: minutes.data,
        resolutions: resolutions.data ?? [],
        apologies: apologies.data ?? [],
        visitors: visitors.data ?? [],
        votes: votes.data ?? [],
        register: register.data ?? [],
        members: members.data ?? [],
      };
    },
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Loading meeting workspace…</p>;
  if (!q.data?.meeting) return <p className="text-sm text-muted-foreground">Meeting not found.</p>;

  const { meeting, agenda, minutes, resolutions, apologies, visitors, votes, members } = q.data;
  const ev = (meeting as any).events;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Button size="sm" variant="ghost" onClick={onBack} className="mb-2 print:hidden">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All meetings
          </Button>
          <h2 className="font-serif text-2xl">{ev?.title}</h2>
          <p className="text-sm text-muted-foreground">
            {ev?.event_type} · {fmtDate(ev?.event_date)} · {ev?.location ?? "Venue TBC"} · {branchLabel(ev?.branch)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Badge variant="outline" className="capitalize">{(meeting as any).status}</Badge>
          <Button size="sm" variant="outline" onClick={exportPdf}>
            <Printer className="mr-1.5 h-4 w-4" /> PDF / Word
          </Button>
        </div>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="resolutions">Resolutions & votes</TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="pt-4">
          <AgendaBuilder agenda={agenda} meetingId={meetingId} members={members} canManage={canManage} currentUserId={currentUserId} onChange={invalidate} />
        </TabsContent>

        <TabsContent value="attendance" className="pt-4">
          <AttendancePanel
            meetingId={meetingId}
            apologies={apologies}
            visitors={visitors}
            members={members}
            currentUserId={currentUserId}
            canManage={canManage}
            onChange={invalidate}
          />
        </TabsContent>

        <TabsContent value="minutes" className="pt-4">
          <MinutesPanel minutes={minutes} meetingId={meetingId} canManage={canManage} currentUserId={currentUserId} onChange={invalidate} />
        </TabsContent>

        <TabsContent value="resolutions" className="pt-4">
          <ResolutionsPanel
            meetingId={meetingId}
            resolutions={resolutions}
            votes={votes}
            members={members}
            canManage={canManage}
            currentUserId={currentUserId}
            onChange={invalidate}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ────────────────────────── agenda ────────────────────────── */

function AgendaBuilder({
  agenda,
  meetingId,
  members,
  canManage,
  currentUserId,
  onChange,
}: {
  agenda: any;
  meetingId: string;
  members: any[];
  canManage: boolean;
  currentUserId: string;
  onChange: () => void;
}) {
  const [item, setItem] = useState({ title: "", description: "", owner_id: "", estimated_minutes: "" });

  const ensureAgenda = async () => {
    if (agenda) return agenda.id as string;
    const { data } = await supabase
      .from("agendas")
      .insert({ meeting_id: meetingId, title: "Agenda", status: "draft", created_by: currentUserId })
      .select("id")
      .single();
    return data!.id as string;
  };

  const addItem = async () => {
    if (!item.title) return toast.error("Give the agenda item a title.");
    const agendaId = await ensureAgenda();
    const order = (agenda?.agenda_items?.length ?? 0) + 1;
    const { error } = await supabase.from("agenda_items").insert({
      agenda_id: agendaId,
      order_index: order,
      title: item.title,
      description: item.description || null,
      owner_id: item.owner_id || null,
      estimated_minutes: item.estimated_minutes ? Number(item.estimated_minutes) : null,
    });
    if (error) return toast.error(error.message);
    setItem({ title: "", description: "", owner_id: "", estimated_minutes: "" });
    toast.success("Agenda item added.");
    onChange();
  };

  const publish = async () => {
    const agendaId = await ensureAgenda();
    const { error } = await supabase
      .from("agendas")
      .update({ status: "published", published_at: new Date().toISOString(), approved_by: currentUserId, approved_at: new Date().toISOString() })
      .eq("id", agendaId);
    if (error) return toast.error(error.message);
    await logAudit("publish", "agenda", agendaId, {});
    toast.success("Agenda approved and published.");
    onChange();
  };

  const items = (agenda?.agenda_items ?? []).slice().sort((a: any, b: any) => a.order_index - b.order_index);
  const totalMinutes = items.reduce((s: number, i: any) => s + (i.estimated_minutes ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} items · {totalMinutes} minutes allocated · status{" "}
          <span className="capitalize">{agenda?.status ?? "not started"}</span>
        </p>
        <div className="flex gap-2 print:hidden">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              exportRows(
                "agenda",
                ["#", "Item", "Owner", "Minutes", "Notes"],
                items.map((i: any) => [
                  i.order_index,
                  i.title,
                  members.find((m) => m.id === i.owner_id)?.full_name ?? "",
                  i.estimated_minutes ?? "",
                  i.description ?? "",
                ]),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Excel
          </Button>
          {canManage && agenda?.status !== "published" && <Button size="sm" onClick={publish}>Approve & publish</Button>}
        </div>
      </div>

      <Card className="divide-y divide-border/60">
        {items.length === 0 && <p className="p-4 text-sm text-muted-foreground">No agenda items yet.</p>}
        {items.map((i: any) => (
          <div key={i.id} className="flex items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium">{i.order_index}. {i.title}</p>
              {i.description && <p className="text-xs text-muted-foreground">{i.description}</p>}
              <p className="text-xs text-muted-foreground">
                Owner: {members.find((m) => m.id === i.owner_id)?.full_name ?? "Unassigned"}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">{i.estimated_minutes ?? "—"} min</Badge>
          </div>
        ))}
      </Card>

      {canManage && (
        <Card className="space-y-3 p-4 print:hidden">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Item title</Label>
              <Input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} />
            </div>
            <div>
              <Label>Discussion owner</Label>
              <Select value={item.owner_id || "none"} onValueChange={(v) => setItem({ ...item, owner_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimated minutes</Label>
              <Input type="number" value={item.estimated_minutes} onChange={(e) => setItem({ ...item, estimated_minutes: e.target.value })} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />
            </div>
          </div>
          <Button size="sm" onClick={addItem}><Plus className="mr-1.5 h-4 w-4" /> Add agenda item</Button>
        </Card>
      )}
    </div>
  );
}

/* ────────────────────────── attendance ────────────────────────── */

function AttendancePanel({
  meetingId,
  apologies,
  visitors,
  members,
  currentUserId,
  canManage,
  onChange,
}: {
  meetingId: string;
  apologies: any[];
  visitors: any[];
  members: any[];
  currentUserId: string;
  canManage: boolean;
  onChange: () => void;
}) {
  const [apology, setApology] = useState({ user_id: "", reason: "" });
  const [visitor, setVisitor] = useState({ name: "", organization: "", contact: "" });

  const addApology = async () => {
    const uid = apology.user_id || currentUserId;
    const { error } = await supabase.from("meeting_apologies").insert({ meeting_id: meetingId, user_id: uid, reason: apology.reason || null });
    if (error) return toast.error(error.message);
    setApology({ user_id: "", reason: "" });
    toast.success("Apology recorded.");
    onChange();
  };

  const addVisitor = async () => {
    if (!visitor.name) return toast.error("Visitor name required.");
    const { error } = await supabase.from("meeting_visitors").insert({ meeting_id: meetingId, ...visitor });
    if (error) return toast.error(error.message);
    setVisitor({ name: "", organization: "", contact: "" });
    toast.success("Visitor recorded.");
    onChange();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">Apologies</h3>
          <Button
            size="sm"
            variant="outline"
            className="print:hidden"
            onClick={() =>
              exportRows("apologies", ["Member", "Reason"], apologies.map((a) => [members.find((m) => m.id === a.user_id)?.full_name ?? a.user_id, a.reason ?? ""]))
            }
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        {apologies.length === 0 && <p className="text-sm text-muted-foreground">None recorded.</p>}
        <ul className="space-y-1 text-sm">
          {apologies.map((a) => (
            <li key={a.id} className="border-b border-border/50 pb-1">
              {members.find((m) => m.id === a.user_id)?.full_name ?? "Member"}
              {a.reason ? ` — ${a.reason}` : ""}
            </li>
          ))}
        </ul>
        <div className="space-y-2 print:hidden">
          <Select value={apology.user_id || "self"} onValueChange={(v) => setApology({ ...apology, user_id: v === "self" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Myself</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Reason" value={apology.reason} onChange={(e) => setApology({ ...apology, reason: e.target.value })} />
          <Button size="sm" onClick={addApology}>Record apology</Button>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg">Visitors</h3>
          <Button
            size="sm"
            variant="outline"
            className="print:hidden"
            onClick={() => exportRows("visitors", ["Name", "Organisation", "Contact"], visitors.map((v) => [v.name, v.organization ?? "", v.contact ?? ""]))}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
        {visitors.length === 0 && <p className="text-sm text-muted-foreground">None recorded.</p>}
        <ul className="space-y-1 text-sm">
          {visitors.map((v) => (
            <li key={v.id} className="border-b border-border/50 pb-1">{v.name} {v.organization ? `· ${v.organization}` : ""}</li>
          ))}
        </ul>
        {canManage && (
          <div className="space-y-2 print:hidden">
            <Input placeholder="Visitor name" value={visitor.name} onChange={(e) => setVisitor({ ...visitor, name: e.target.value })} />
            <Input placeholder="Organisation" value={visitor.organization} onChange={(e) => setVisitor({ ...visitor, organization: e.target.value })} />
            <Input placeholder="Contact" value={visitor.contact} onChange={(e) => setVisitor({ ...visitor, contact: e.target.value })} />
            <Button size="sm" onClick={addVisitor}>Add visitor</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ────────────────────────── minutes ────────────────────────── */

function MinutesPanel({
  minutes,
  meetingId,
  canManage,
  currentUserId,
  onChange,
}: {
  minutes: any;
  meetingId: string;
  canManage: boolean;
  currentUserId: string;
  onChange: () => void;
}) {
  const [text, setText] = useState<string>(minutes?.content?.text ?? "");
  const [saving, setSaving] = useState(false);

  const versions = useQuery({
    queryKey: ["minute-versions", minutes?.id],
    enabled: !!minutes?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("minute_versions")
        .select("*")
        .eq("minute_id", minutes.id)
        .order("version_number", { ascending: false });
      return data ?? [];
    },
  });

  const save = async (status?: string) => {
    setSaving(true);
    const content = { text } as never;
    let minuteId = minutes?.id as string | undefined;
    if (minuteId) {
      const { error } = await supabase
        .from("minutes")
        .update({ content, ...(status ? { status } : {}) })
        .eq("id", minuteId);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase
        .from("minutes")
        .insert({ meeting_id: meetingId, content, status: status ?? "draft", created_by: currentUserId })
        .select("id")
        .single();
      if (error) { setSaving(false); return toast.error(error.message); }
      minuteId = data.id;
    }
    const nextVersion = ((versions.data?.[0]?.version_number as number) ?? 0) + 1;
    await supabase.from("minute_versions").insert({
      minute_id: minuteId!,
      version_number: nextVersion,
      content,
      edited_by: currentUserId,
      change_summary: status ? `Status → ${status}` : "Edit saved",
    });
    await logAudit(status ?? "save", "minutes", minuteId!, { version: nextVersion });
    setSaving(false);
    toast.success(status === "approved" ? "Minutes approved and signed off." : "Minutes saved with a new version.");
    onChange();
    versions.refetch();
  };

  const approve = async () => {
    await save("approved");
    if (minutes?.id) {
      await supabase
        .from("minutes")
        .update({ approved_by: currentUserId, approved_at: new Date().toISOString() })
        .eq("id", minutes.id);
      await supabase.from("digital_signatures").insert({
        entity_type: "minutes",
        entity_id: minutes.id,
        signer_id: currentUserId,
        signature_data: `Approved by ${currentUserId} at ${new Date().toISOString()}`,
      });
      await supabase.from("meetings").update({ status: "approved" }).eq("id", meetingId);
    }
    onChange();
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg">Minutes</h3>
          <Badge variant="outline" className="capitalize">{minutes?.status ?? "not started"}</Badge>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          readOnly={!canManage}
          placeholder="Take the minutes here. Capture discussion, decisions and actions — each save creates a new version in the history below."
        />
        {canManage && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button size="sm" disabled={saving} onClick={() => save()}>Save version</Button>
            <Button size="sm" variant="secondary" disabled={saving} onClick={() => save("under_review")}>Submit for review</Button>
            <Button size="sm" variant="default" disabled={saving} onClick={approve}>Approve & sign</Button>
            <Button size="sm" variant="outline" onClick={exportPdf}><Printer className="mr-1.5 h-4 w-4" /> PDF / Word</Button>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 font-serif text-lg">Version history</h3>
        {(versions.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(versions.data ?? []).map((v: any) => (
              <li key={v.id} className="flex justify-between border-b border-border/50 pb-1">
                <span>v{v.version_number} — {v.change_summary}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(v.edited_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ────────────────────────── resolutions & votes ────────────────────────── */

function ResolutionsPanel({
  meetingId,
  resolutions,
  votes,
  members,
  canManage,
  currentUserId,
  onChange,
}: {
  meetingId: string;
  resolutions: any[];
  votes: any[];
  members: any[];
  canManage: boolean;
  currentUserId: string;
  onChange: () => void;
}) {
  const [form, setForm] = useState({ resolution_text: "", owner_id: "", due_date: "", priority: "normal" });
  const [motion, setMotion] = useState({ motion_text: "", votes_for: "", votes_against: "", abstentions: "" });

  const addResolution = async () => {
    if (!form.resolution_text) return toast.error("Resolution text required.");
    const number = `RES-${new Date().getFullYear()}-${String(resolutions.length + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("resolutions").insert({
      meeting_id: meetingId,
      resolution_number: number,
      resolution_text: form.resolution_text,
      status: "open",
      created_by: currentUserId,
      owner_id: form.owner_id || null,
      due_date: form.due_date || null,
      priority: form.priority,
      department_slug: "secretary",
    } as never);
    if (error) return toast.error(error.message);
    toast.success("Resolution recorded — an action item was created and the owner notified.");
    setForm({ resolution_text: "", owner_id: "", due_date: "", priority: "normal" });
    onChange();
  };

  const close = async (id: string) => {
    const { error } = await supabase
      .from("resolutions")
      .update({ status: "closed", closed_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit("close", "resolution", id, {});
    toast.success("Resolution closed.");
    onChange();
  };

  const addMotion = async () => {
    if (!motion.motion_text) return toast.error("Motion text required.");
    const f = Number(motion.votes_for || 0);
    const a = Number(motion.votes_against || 0);
    const { error } = await supabase.from("meeting_votes").insert({
      meeting_id: meetingId,
      motion_text: motion.motion_text,
      vote_type: "show_of_hands",
      votes_for: f,
      votes_against: a,
      abstentions: Number(motion.abstentions || 0),
      result: f > a ? "carried" : "not_carried",
      recorded_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    setMotion({ motion_text: "", votes_for: "", votes_against: "", abstentions: "" });
    toast.success("Vote recorded.");
    onChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            exportRows(
              "resolutions",
              ["Number", "Resolution", "Owner", "Due", "Priority", "Status"],
              resolutions.map((r) => [
                r.resolution_number,
                r.resolution_text,
                members.find((m) => m.id === r.owner_id)?.full_name ?? "",
                r.due_date ?? "",
                r.priority ?? "",
                r.status,
              ]),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Excel
        </Button>
      </div>

      <Card className="divide-y divide-border/60">
        {resolutions.length === 0 && <p className="p-4 text-sm text-muted-foreground">No resolutions recorded.</p>}
        {resolutions.map((r) => (
          <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
            <div>
              <p className="text-sm font-medium">{r.resolution_number} — {r.resolution_text}</p>
              <p className="text-xs text-muted-foreground">
                Owner: {members.find((m) => m.id === r.owner_id)?.full_name ?? "Unassigned"} · Due {fmtDate(r.due_date)} · {r.priority ?? "normal"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={r.status === "closed" ? "secondary" : "outline"} className="capitalize">{r.status}</Badge>
              {canManage && r.status !== "closed" && (
                <Button size="sm" variant="ghost" onClick={() => close(r.id)}>Close</Button>
              )}
            </div>
          </div>
        ))}
      </Card>

      {canManage && (
        <Card className="space-y-3 p-4 print:hidden">
          <h3 className="font-serif text-lg">Record a resolution</h3>
          <Textarea rows={2} placeholder="Resolution text" value={form.resolution_text} onChange={(e) => setForm({ ...form, resolution_text: e.target.value })} />
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={form.owner_id || "none"} onValueChange={(v) => setForm({ ...form, owner_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Owner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["low", "normal", "high", "urgent"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={addResolution}>Record resolution</Button>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h3 className="font-serif text-lg">Votes & motions</h3>
        {votes.length === 0 && <p className="text-sm text-muted-foreground">No motions put to the vote.</p>}
        <ul className="space-y-1 text-sm">
          {votes.map((v) => (
            <li key={v.id} className="border-b border-border/50 pb-1">
              {v.motion_text} — <span className="capitalize">{v.result}</span> ({v.votes_for} for / {v.votes_against} against / {v.abstentions} abstain)
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="grid gap-2 md:grid-cols-4 print:hidden">
            <Input className="md:col-span-4" placeholder="Motion" value={motion.motion_text} onChange={(e) => setMotion({ ...motion, motion_text: e.target.value })} />
            <Input type="number" placeholder="For" value={motion.votes_for} onChange={(e) => setMotion({ ...motion, votes_for: e.target.value })} />
            <Input type="number" placeholder="Against" value={motion.votes_against} onChange={(e) => setMotion({ ...motion, votes_against: e.target.value })} />
            <Input type="number" placeholder="Abstain" value={motion.abstentions} onChange={(e) => setMotion({ ...motion, abstentions: e.target.value })} />
            <Button size="sm" onClick={addMotion}>Record vote</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
