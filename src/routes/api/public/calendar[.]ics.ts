import { createFileRoute } from "@tanstack/react-router";
import { getRequestUrl } from "@tanstack/react-start/server";
import ical from "ical-generator";

const TZ = "Africa/Johannesburg";

function toLocalDate(dateStr: string, timeStr?: string | null): Date {
  // Treat the stored date + optional time as Johannesburg local time.
  const iso = timeStr
    ? `${dateStr}T${timeStr.slice(0, 5)}:00+02:00`
    : `${dateStr}T00:00:00+02:00`;
  return new Date(iso);
}

export const Route = createFileRoute("/api/public/calendar.ics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: events, error } = await supabaseAdmin
          .from("events")
          .select("*")
          .order("event_date", { ascending: true });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const requestUrl = getRequestUrl();
        const siteUrl = `${requestUrl.protocol}//${requestUrl.host}`;

        const calendar = ical({
          name: "TRoGKC Events",
          timezone: TZ,
          prodId: {
            company: "TRoGKC",
            product: "Leadership Portal",
            language: "EN",
          },
        });

        for (const ev of events ?? []) {
          // Skip generated child occurrences — the recurring parent template covers them.
          if (ev.parent_event_id) continue;

          const isAllDay = !ev.start_time;
          const start = toLocalDate(ev.event_date, ev.start_time ?? null);
          let end: Date | undefined;

          if (isAllDay) {
            end = new Date(`${ev.event_date}T23:59:59+02:00`);
          } else if (ev.end_time) {
            end = toLocalDate(ev.event_date, ev.end_time);
          } else {
            // Default 1-hour duration if no end time is set.
            end = new Date(start.getTime() + 60 * 60 * 1000);
          }

          const descriptionParts = [
            ev.description,
            ev.event_type ? `Type: ${ev.event_type}` : "",
            ev.branch ? `Branch: ${ev.branch}` : "",
            ev.department_slug ? `Department: ${ev.department_slug}` : "",
            ev.location ? `Location: ${ev.location}` : "",
          ].filter(Boolean);

          const eventConfig: any = {
            start,
            end,
            allDay: isAllDay,
            summary: ev.title,
            description: descriptionParts.join("\n\n"),
            location: ev.location ?? undefined,
            url: `${siteUrl}/events`,
            uid: `${ev.id}@trogkc.org`,
          };

          if (ev.is_recurring && ev.recurrence_pattern) {
            const freq = ev.recurrence_pattern.toUpperCase();
            if (["DAILY", "WEEKLY", "MONTHLY"].includes(freq)) {
              eventConfig.repeating = {
                freq,
                interval: ev.recurrence_interval || 1,
                until: ev.recurrence_end_date
                  ? new Date(`${ev.recurrence_end_date}T23:59:59+02:00`)
                  : undefined,
              };
            }
          }

          calendar.createEvent(eventConfig);
        }

        return new Response(calendar.toString(), {
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": 'inline; filename="trogkc-events.ics"',
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
