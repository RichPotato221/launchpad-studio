import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
 
/**
* SecretaryWorkspace
* ─────────────────────────────────────────────────────────
* Slots into the existing Workspace tab pattern from DepartmentPortal.tsx
* — register it in workspaceRegistry.ts against the "secretary" (or
* whatever slug your Secretary/Church Administration department uses)
* department_slug:
*
*   secretary: {
*     component: lazy(() => import("@/components/workspaces/SecretaryWorkspace")),
*     label: "Secretary Workspace",
*   }
*
* Adjust the import path above to wherever your other workspace
* components actually live (WorshipWorkspace.tsx etc.) — I haven't
* seen workspaceRegistry.ts's full contents, only what DepartmentPortal.tsx
* imports from it, so match this file's location to that convention.
*
* ASSUMPTION FLAGGED: the `events` table columns used below
* (id, title, start_time, department_slug) are inferred from the
* meetings_select RLS policy, which references `e.department_slug`.
* If `events` uses a different time column name (e.g. starts_at),
* adjust the two `.select(...)` calls in useUpcomingEvents.
*
* Chain implemented: meeting → agenda → agenda_items → minutes →
* minute_versions → resolutions, exactly as requested, using the
* real secretary_id/chairperson_id ownership model already in RLS
* (only the meeting's own secretary_id can write its agenda/minutes/
* resolutions — not "anyone with role=secretary").
*/
 
interface WorkspaceProps {
  departmentSlug: string;
  currentUserId: string;
}
 
export default function SecretaryWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
 
  if (selectedMeetingId) {
    return (
      <MeetingDetail
        meetingId={selectedMeetingId}
        currentUserId={currentUserId}
        onBack={() => setSelectedMeetingId(null)}
      />
    );
  }
 
  return (
    <MeetingsList
      departmentSlug={departmentSlug}
      currentUserId={currentUserId}
      onOpenMeeting={setSelectedMeetingId}
    />
  );
}
 
/* ─────────────────────────────────────────────────────────
* MEETINGS LIST + CREATE
* ───────────────────────────────────────────────────────── */
 
function useApprovedProfiles() {
  return useQuery({
    queryKey: ["approved-profiles-for-secretary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("approval_status", "approved")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}
 
function useUpcomingEvents(departmentSlug: string) {
  return useQuery({
    queryKey: ["secretary-upcoming-events", departmentSlug],
    queryFn: async () => {
      // NOTE: adjust column names here if your `events` table differs —
      // see the ASSUMPTION FLAGGED note at the top of this file.
      const { data, error } = await supabase
        .from("events")
        .select("id, title, start_time")
        .eq("department_slug", departmentSlug)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}
 
function MeetingsList({
  departmentSlug,
  currentUserId,
  onOpenMeeting,
}: WorkspaceProps & { onOpenMeeting: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ event_id: "", chairperson_id: "" });
 
  const meetings = useQuery({
    queryKey: ["secretary-meetings", departmentSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("id, status, chairperson_id, secretary_id, created_at, events(title, start_time)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
 
  const events = useUpcomingEvents(departmentSlug);
  const profiles = useApprovedProfiles();
 
  const createMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.event_id) return toast.error("Pick an event for this meeting.");
    setCreating(true);
    const { error } = await supabase.from("meetings").insert({
      event_id: form.event_id,
      chairperson_id: form.chairperson_id || null,
      secretary_id: currentUserId,
      status: "draft",
      created_by: currentUserId,
    });
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success("Meeting created");
    setForm({ event_id: "", chairperson_id: "" });
    queryClient.invalidateQueries({ queryKey: ["secretary-meetings", departmentSlug] });
  };
 
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">New meeting</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Picks from existing calendar events for this department — create the event first if it's not listed yet.
        </p>
        <form onSubmit={createMeeting} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Event</Label>
            <Select value={form.event_id} onValueChange={(v) => setForm({ ...form, event_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select an event…" /></SelectTrigger>
              <SelectContent>
                {(events.data ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title} — {new Date(e.start_time).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Chairperson</Label>
            <Select value={form.chairperson_id} onValueChange={(v) => setForm({ ...form, chairperson_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select chairperson…" /></SelectTrigger>
              <SelectContent>
                {(profiles.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-muted-foreground">You'll be recorded as the meeting's secretary automatically.</p>
            <Button type="submit" disabled={creating} className="mt-2">
              {creating ? "Creating…" : "Create Meeting"}
            </Button>
          </div>
        </form>
      </Card>
 
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Meetings</p>
        {(meetings.data ?? []).map((m: any) => (
          <Card key={m.id} className="flex items-center justify-between p-5">
            <div>
              <p className="font-serif text-lg">{m.events?.title ?? "Untitled event"}</p>
              <p className="text-xs text-muted-foreground">
                {m.events?.start_time ? new Date(m.events.start_time).toLocaleString() : "No date"} · status: {m.status}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenMeeting(m.id)}>Open →</Button>
          </Card>
        ))}
        {(meetings.data ?? []).length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">No meetings yet.</Card>
        )}
      </div>
    </div>
  );
}



/* ─────────────────────────────────────────────────────────
* MEETING DETAIL — Agenda / Minutes / Resolutions
* ───────────────────────────────────────────────────────── */
 
function MeetingDetail({
  meetingId,
  currentUserId,
  onBack,
}: {
  meetingId: string;
  currentUserId: string;
  onBack: () => void;
}) {
  const meeting = useQuery({
    queryKey: ["secretary-meeting", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select("*, events(title, start_time)")
        .eq("id", meetingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
 
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">
        ← All meetings
      </button>
 
      <div>
        <h3 className="font-serif text-2xl">{meeting.data?.events?.title ?? "Meeting"}</h3>
        <p className="text-xs text-muted-foreground">
          {meeting.data?.events?.start_time ? new Date(meeting.data.events.start_time).toLocaleString() : ""} · status: {meeting.data?.status}
        </p>
      </div>
 
      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="minutes">Minutes</TabsTrigger>
          <TabsTrigger value="resolutions">Resolutions</TabsTrigger>
        </TabsList>
 
        <TabsContent value="agenda" className="mt-6">
          <AgendaPanel meetingId={meetingId} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="minutes" className="mt-6">
          <MinutesPanel meetingId={meetingId} currentUserId={currentUserId} />
        </TabsContent>
        <TabsContent value="resolutions" className="mt-6">
          <ResolutionsPanel meetingId={meetingId} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
 
/* ─────────────────────────────────────────────────────────
* AGENDA + AGENDA ITEMS
* ───────────────────────────────────────────────────────── */
 
function AgendaPanel({ meetingId, currentUserId }: { meetingId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [itemForm, setItemForm] = useState({ title: "", description: "", estimated_minutes: "", owner_id: "" });
  const profiles = useApprovedProfiles();
 
  const agenda = useQuery({
    queryKey: ["secretary-agenda", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendas")
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
 
  const items = useQuery({
    enabled: !!agenda.data?.id,
    queryKey: ["secretary-agenda-items", agenda.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agenda_items")
        .select("*")
        .eq("agenda_id", agenda.data!.id)
        .order("order_index");
      if (error) throw error;
      return data ?? [];
    },
  });
 
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["secretary-agenda", meetingId] });
    queryClient.invalidateQueries({ queryKey: ["secretary-agenda-items", agenda.data?.id] });
  };
 
  const createAgenda = async () => {
    const { error } = await supabase.from("agendas").insert({
      meeting_id: meetingId,
      title: "Meeting Agenda",
      status: "draft",
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Agenda started");
    invalidate();
  };
 
  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agenda.data) return;
    const nextOrder = (items.data?.length ?? 0) + 1;
    const { error } = await supabase.from("agenda_items").insert({
      agenda_id: agenda.data.id,
      order_index: nextOrder,
      title: itemForm.title,
      description: itemForm.description || null,
      estimated_minutes: itemForm.estimated_minutes ? Number(itemForm.estimated_minutes) : null,
      owner_id: itemForm.owner_id || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Item added");
    setItemForm({ title: "", description: "", estimated_minutes: "", owner_id: "" });
    invalidate();
  };
 
  const approveAgenda = async () => {
    const { error } = await supabase
      .from("agendas")
      .update({ status: "approved", approved_by: currentUserId, approved_at: new Date().toISOString() })
      .eq("id", agenda.data!.id);
    if (error) return toast.error(error.message);
    toast.success("Agenda approved");
    invalidate();
  };
 
  const publishAgenda = async () => {
    const { error } = await supabase
      .from("agendas")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", agenda.data!.id);
    if (error) return toast.error(error.message);
    toast.success("Agenda published — attendees can now view it");
    invalidate();
  };
 
  if (!agenda.data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No agenda started for this meeting yet.</p>
        <Button className="mt-4" onClick={createAgenda}>Start Agenda</Button>
      </Card>
    );
  }
 
  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="font-serif text-lg">{agenda.data.title}</p>
          <p className="text-xs text-muted-foreground">status: {agenda.data.status}</p>
        </div>
        <div className="flex gap-2">
          {agenda.data.status === "draft" && <Button size="sm" onClick={approveAgenda}>Approve</Button>}
          {agenda.data.status === "approved" && <Button size="sm" onClick={publishAgenda}>Publish</Button>}
        </div>
      </Card>
 
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Add agenda item</p>
        <form onSubmit={addItem} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input required value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          </div>
          <div>
            <Label>Estimated minutes</Label>
            <Input type="number" value={itemForm.estimated_minutes} onChange={(e) => setItemForm({ ...itemForm, estimated_minutes: e.target.value })} />
          </div>
          <div>
            <Label>Discussion owner</Label>
            <Select value={itemForm.owner_id} onValueChange={(v) => setItemForm({ ...itemForm, owner_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>
                {(profiles.data ?? []).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Add Item</Button>
          </div>
        </form>
      </Card>
 
      <div className="space-y-2">
        {(items.data ?? []).map((it: any) => (
          <Card key={it.id} className="flex items-start gap-3 p-4">
            <span className="font-mono text-xs text-muted-foreground">{String(it.order_index).padStart(2, "0")}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{it.title}</p>
              {it.description && <p className="mt-1 text-xs text-muted-foreground">{it.description}</p>}
            </div>
            {it.estimated_minutes && <span className="text-xs text-muted-foreground">{it.estimated_minutes} min</span>}
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
* MINUTES + MINUTE VERSIONS
* ───────────────────────────────────────────────────────── */
 
function MinutesPanel({ meetingId, currentUserId }: { meetingId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [saving, setSaving] = useState(false);
 
  const minutes = useQuery({
    queryKey: ["secretary-minutes", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("minutes")
        .select("*")
        .eq("meeting_id", meetingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
 
  const versions = useQuery({
    enabled: !!minutes.data?.id,
    queryKey: ["secretary-minute-versions", minutes.data?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("minute_versions")
        .select("*")
        .eq("minute_id", minutes.data!.id)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
 
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["secretary-minutes", meetingId] });
    queryClient.invalidateQueries({ queryKey: ["secretary-minute-versions", minutes.data?.id] });
  };
 
  const startMinutes = async () => {
    const { error } = await supabase.from("minutes").insert({
      meeting_id: meetingId,
      content: { text: "" },
      status: "draft",
      transcription_status: "not_started",
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Minutes started");
    invalidate();
  };
 
  const saveVersion = async () => {
    if (!minutes.data) return;
    setSaving(true);
    const nextVersion = (versions.data?.[0]?.version_number ?? 0) + 1;
    const content = { text: draft };
 
    const [{ error: minutesError }, { error: versionError }] = await Promise.all([
      supabase.from("minutes").update({ content }).eq("id", minutes.data.id),
      supabase.from("minute_versions").insert({
        minute_id: minutes.data.id,
        version_number: nextVersion,
        content,
        edited_by: currentUserId,
        change_summary: changeSummary || null,
      }),
    ]);
    setSaving(false);
    if (minutesError || versionError) return toast.error((minutesError ?? versionError)!.message);
    toast.success(`Saved as version ${nextVersion}`);
    setChangeSummary("");
    invalidate();
  };
 
  const approveMinutes = async () => {
    const { error } = await supabase
      .from("minutes")
      .update({ status: "approved", approved_by: currentUserId, approved_at: new Date().toISOString() })
      .eq("id", minutes.data!.id);
    if (error) return toast.error(error.message);
    toast.success("Minutes approved");
    invalidate();
  };
 
  const updateTranscriptionStatus = async (status: string) => {
    const { error } = await supabase.from("minutes").update({ transcription_status: status }).eq("id", minutes.data!.id);
    if (error) return toast.error(error.message);
    invalidate();
  };
 
  if (!minutes.data) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-muted-foreground">No minutes started for this meeting yet.</p>
        <Button className="mt-4" onClick={startMinutes}>Start Minutes</Button>
      </Card>
    );
  }
 
  const currentText = (minutes.data.content as any)?.text ?? "";
 
  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between p-5">
        <p className="text-sm">status: <strong>{minutes.data.status}</strong></p>
        <div className="flex items-center gap-3">
          <Select value={minutes.data.transcription_status ?? "not_started"} onValueChange={updateTranscriptionStatus}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Transcription: not started</SelectItem>
              <SelectItem value="in_progress">Transcription: in progress</SelectItem>
              <SelectItem value="complete">Transcription: complete</SelectItem>
              <SelectItem value="failed">Transcription: failed</SelectItem>
            </SelectContent>
          </Select>
          {minutes.data.status !== "approved" && <Button size="sm" onClick={approveMinutes}>Approve</Button>}
        </div>
      </Card>
 
      <Card className="p-6">
        <Label>Minutes content</Label>
        <Textarea
          rows={10}
          defaultValue={currentText}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type minutes here — each save creates a new version, nothing is overwritten."
        />
        <div className="mt-3 flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Change summary (optional)</Label>
            <Input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="e.g. Added action items from discussion" />
          </div>
          <Button onClick={saveVersion} disabled={saving}>{saving ? "Saving…" : "Save New Version"}</Button>
        </div>
      </Card>
 
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Version history</p>
        <div className="mt-2 space-y-2">
          {(versions.data ?? []).map((v: any) => (
            <Card key={v.id} className="p-4 text-sm">
              <div className="flex justify-between">
                <span>Version {v.version_number}</span>
                <span className="text-xs text-muted-foreground">{new Date(v.edited_at).toLocaleString()}</span>
              </div>
              {v.change_summary && <p className="mt-1 text-xs text-muted-foreground">{v.change_summary}</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
 
/* ─────────────────────────────────────────────────────────
* RESOLUTIONS
* ───────────────────────────────────────────────────────── */
 
function ResolutionsPanel({ meetingId, currentUserId }: { meetingId: string; currentUserId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
 
  const resolutions = useQuery({
    queryKey: ["secretary-resolutions", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resolutions")
        .select("*")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
 
  // Resolutions can optionally link to the meeting's minutes row —
  // fetched here just to attach minute_id automatically if it exists.
  const minutes = useQuery({
    queryKey: ["secretary-minutes-for-resolution", meetingId],
    queryFn: async () => {
      const { data } = await supabase.from("minutes").select("id").eq("meeting_id", meetingId).maybeSingle();
      return data;
    },
  });
 
  const addResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("resolutions").insert({
      meeting_id: meetingId,
      minute_id: minutes.data?.id ?? null,
      resolution_text: text.trim(),
      status: "open",
      created_by: currentUserId,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Resolution logged");
    setText("");
    queryClient.invalidateQueries({ queryKey: ["secretary-resolutions", meetingId] });
  };
 
  const toggleStatus = async (id: string, current: string) => {
    const { error } = await supabase
      .from("resolutions")
      .update({ status: current === "open" ? "closed" : "open" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    queryClient.invalidateQueries({ queryKey: ["secretary-resolutions", meetingId] });
  };
 
  return (
    <div className="space-y-4">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Log a resolution</p>
        <form onSubmit={addResolution} className="mt-4 flex items-end gap-3">
          <Textarea
            rows={2}
            className="flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Approved 2027 budget allocation for Youth Ministry"
          />
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Log Resolution"}</Button>
        </form>
      </Card>
 
      <div className="space-y-2">
        {(resolutions.data ?? []).map((r: any) => (
          <Card key={r.id} className="flex items-start justify-between gap-3 p-4">
            <p className="flex-1 text-sm">{r.resolution_text}</p>
            <Button size="sm" variant="outline" onClick={() => toggleStatus(r.id, r.status)}>
              {r.status === "open" ? "Mark Closed" : "Reopen"}
            </Button>
          </Card>
        ))}
        {(resolutions.data ?? []).length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">No resolutions logged yet.</Card>
        )}
      </div>
    </div>
  );
}


