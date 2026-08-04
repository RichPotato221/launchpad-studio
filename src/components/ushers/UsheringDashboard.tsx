import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RAG_CLASS, fmtDate } from "@/lib/finance";
import { daysSince, pct } from "@/lib/intercession";
import { occupancyPct, ushLabel } from "@/lib/ushering";

const sb = supabase as any;

/** MODULE — Ushering command dashboard: live readiness picture across the ministry. */
export default function UsheringDashboard() {
  const [state, setState] = useState<any>({
    services: [],
    roster: [],
    volunteers: [],
    visitors: [],
    incidents: [],
    attendance: [],
    seating: [],
    care: [],
  });

  useEffect(() => {
    (async () => {
      const [services, roster, volunteers, visitors, incidents, attendance, seating, care] = await Promise.all([
        sb.from("ush_services").select("*").order("service_date", { ascending: false }).limit(30),
        sb.from("ush_roster").select("*").limit(500),
        sb.from("ush_volunteers").select("*").limit(400),
        sb.from("ush_visitors").select("*").order("created_at", { ascending: false }).limit(300),
        sb.from("ush_incidents").select("*").order("occurred_at", { ascending: false }).limit(200),
        sb.from("ush_attendance").select("*").order("service_date", { ascending: false }).limit(30),
        sb.from("ush_seating").select("*").limit(200),
        sb.from("ush_care").select("*").limit(200),
      ]);
      setState({
        services: services.data ?? [],
        roster: roster.data ?? [],
        volunteers: volunteers.data ?? [],
        visitors: visitors.data ?? [],
        incidents: incidents.data ?? [],
        attendance: attendance.data ?? [],
        seating: seating.data ?? [],
        care: care.data ?? [],
      });
    })();
  }, []);

  const next = state.services[0];
  const nextRoster = state.roster.filter((r: any) => r.service_id === next?.id);
  const nextSeating = state.seating.filter((r: any) => r.service_id === next?.id);
  const readiness = next
    ? pct((next.checklist ?? []).filter((c: any) => c.done).length, (next.checklist ?? []).length)
    : 0;
  const acceptance = pct(nextRoster.filter((r: any) => r.status === "accepted").length, nextRoster.length);
  const cap = nextSeating.reduce((s: number, z: any) => s + (z.capacity ?? 0), 0);
  const occ = nextSeating.reduce((s: number, z: any) => s + (z.occupied ?? 0), 0);
  const pendingFollowUp = state.visitors.filter((v: any) => v.followup_status === "pending").length;
  const overdueFollowUp = state.visitors.filter((v: any) => v.followup_status === "pending" && daysSince(v.created_at) > 7).length;
  const openIncidents = state.incidents.filter((i: any) => i.followup_status !== "closed").length;
  const openCare = state.care.filter((c: any) => c.status !== "closed").length;
  const lastAttendance = state.attendance[0];

  const tile = (label: string, value: string | number, rag?: "green" | "amber" | "red", hint?: string) => (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="font-serif text-2xl">{value}</p>
        {rag && <Badge className={RAG_CLASS[rag]}>{rag}</Badge>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {tile(
          "Next service readiness",
          `${readiness}%`,
          readiness >= 90 ? "green" : readiness >= 60 ? "amber" : "red",
          next ? `${next.title} · ${fmtDate(next.service_date)}` : "No service planned",
        )}
        {tile("Roster acceptance", `${acceptance}%`, acceptance >= 85 ? "green" : acceptance >= 60 ? "amber" : "red", `${nextRoster.length} duties assigned`)}
        {tile("Seating pressure", `${occupancyPct(occ, cap)}%`, occupancyPct(occ, cap) >= 95 ? "red" : occupancyPct(occ, cap) >= 80 ? "amber" : "green", `${occ}/${cap} seats`)}
        {tile("Active volunteers", state.volunteers.filter((v: any) => v.active).length, "green", `${state.volunteers.filter((v: any) => v.availability === "on_leave").length} on leave`)}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {tile("Visitors awaiting follow-up", pendingFollowUp, overdueFollowUp > 0 ? "red" : pendingFollowUp > 0 ? "amber" : "green", `${overdueFollowUp} overdue past 7 days`)}
        {tile("Open incidents", openIncidents, openIncidents > 3 ? "red" : openIncidents > 0 ? "amber" : "green")}
        {tile("Open care cases", openCare, openCare > 5 ? "amber" : "green")}
        {tile(
          "Last attendance",
          lastAttendance ? (lastAttendance.adults ?? 0) + (lastAttendance.children ?? 0) : 0,
          "green",
          lastAttendance ? fmtDate(lastAttendance.service_date) : "no counts yet",
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Upcoming services</p>
          <div className="mt-3 space-y-3">
            {state.services.slice(0, 6).map((s: any) => {
              const r = pct((s.checklist ?? []).filter((c: any) => c.done).length, (s.checklist ?? []).length);
              return (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{ushLabel(s.service_type)} · {fmtDate(s.service_date)} · {s.venue ?? "venue TBC"}</p>
                  </div>
                  <Badge className={RAG_CLASS[r >= 90 ? "green" : r >= 60 ? "amber" : "red"]}>{r}% ready</Badge>
                </div>
              );
            })}
            {state.services.length === 0 && <p className="text-sm text-muted-foreground">No services planned yet.</p>}
          </div>
        </Card>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent incidents</p>
          <div className="mt-3 space-y-3">
            {state.incidents.slice(0, 6).map((i: any) => (
              <div key={i.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{ushLabel(i.incident_type)}</p>
                  <Badge className={RAG_CLASS[i.severity === "critical" || i.severity === "high" ? "red" : i.severity === "medium" ? "amber" : "green"]}>
                    {ushLabel(i.severity)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{fmtDate(i.occurred_at)} · {i.location ?? "location not recorded"}</p>
              </div>
            ))}
            {state.incidents.length === 0 && <p className="text-sm text-muted-foreground">No incidents recorded.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
