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
has context menu


has context menu
