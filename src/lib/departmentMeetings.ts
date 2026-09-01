import { supabase } from "@/integrations/supabase/client";
import { sendEventInvites } from "@/lib/eventInvites.functions";
import { toast } from "sonner";

export type DepartmentMeetingInput = {
  title: string;
  description?: string | null;
  /** ISO date (yyyy-mm-dd) */
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  branch?: string | null;
  departmentSlug: string;
  createdBy: string;
  eventType?: string;
};

/**
 * Publishes a departmental meeting onto the church calendar and emails a real
 * calendar invite (.ics + Accept / Decline) to the members that meeting
 * concerns — the owning department, scoped to the meeting's branch.
 * Returns the created event id so the department record can link to it and
 * show the organiser the RSVP standing.
 */
export async function publishDepartmentMeeting(input: DepartmentMeetingInput): Promise<string | null> {
  const { data: evt, error } = await supabase
    .from("events")
    .insert({
      title: input.title,
      description: input.description || null,
      event_type: input.eventType ?? "meeting",
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      location: input.location || null,
      branch: (input.branch || null) as any,
      department_slug: input.departmentSlug,
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (error || !evt?.id) {
    console.error("Calendar entry failed", error);
    toast.message("Meeting saved, but the calendar invite could not be created.");
    return null;
  }

  sendEventInvites({ data: { eventId: evt.id, action: "create" } })
    .then((r: any) => {
      if (r?.sent) toast.success(`Invitation sent to ${r.sent} member${r.sent === 1 ? "" : "s"}`);
    })
    .catch((err) => console.error("Meeting invite failed", err));

  return evt.id;
}

/** Sends the cancellation notice and removes the linked calendar entry. */
export async function cancelDepartmentMeeting(eventId: string | null | undefined) {
  if (!eventId) return;
  await sendEventInvites({ data: { eventId, action: "cancel" } }).catch((err) =>
    console.error("Cancellation notice failed", err),
  );
  await supabase.from("events").delete().eq("id", eventId);
}

/** Splits an ISO timestamp into the date / time parts the events table expects. */
export function splitTimestamp(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
