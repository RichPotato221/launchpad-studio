import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Printer } from "lucide-react";
import { branchLabel, exportRows, fmtDate, titleCase } from "@/lib/finance";
import { PRAYER_CATEGORIES, isOpen, labelFor, pct } from "@/lib/intercession";

const sb = supabase as any;

/** Module 12: statutory & leadership reporting pack for the intercession department. */
export default function PrayerReportsModule() {
  const [from, setFrom] = useState(new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const data = useQuery({
    queryKey: ["prayer-reports"],
    queryFn: async () => {
      const [requests, meetings, fasts, chains, slots, team] = await Promise.all([
        sb.from("int_requests").select("*"),
        sb.from("int_meetings").select("*"),
        sb.from("int_fasts").select("*"),
        sb.from("int_chains").select("*"),
        sb.from("int_chain_slots").select("*"),
        sb.from("int_team_members").select("*"),
      ]);
      return {
        requests: requests.data ?? [],
        meetings: meetings.data ?? [],
        fasts: fasts.data ?? [],
        chains: chains.data ?? [],
        slots: slots.data ?? [],
        team: team.data ?? [],
      };
    },
  });

  const inRange = (iso?: string | null) => !!iso && String(iso).slice(0, 10) >= from && String(iso).slice(0, 10) <= to;

  const summary = useMemo(() => {
    const d = data.data;
    if (!d) return null;
    const requests = d.requests.filter((r: any) => inRange(r.created_at));
    const meetings = d.meetings.filter((m: any) => inRange(m.starts_at));
    const answered = requests.filter((r: any) => r.status === "answered");
    return {
      requests,
      meetings,
      answered,
      open: requests.filter(isOpen),
      answeredRate: pct(answered.length, requests.length || 1),
      prayerHours: meetings.reduce((s: number, m: any) => s + Number(m.prayer_hours ?? 0), 0),
      attendance: meetings.reduce((s: number, m: any) => s + (m.attendance_count ?? 0), 0),
      coverage: pct(d.slots.filter((s: any) => s.covered).length, d.slots.length || 1),
      fasts: d.fasts.filter((f: any) => inRange(f.start_date)),
      team: d.team.filter((t: any) => t.active !== false),
    };
  }, [data.data, from, to]);

  if (data.isLoading || !summary) return <Card className="p-10 text-center text-sm text-muted-foreground">Preparing reports…</Card>;

  const byCategory = PRAYER_CATEGORIES.map((c) => ({
    label: c.label,
    total: summary.requests.filter((r: any) => r.category === c.key).length,
    answered: summary.answered.filter((r: any) => r.category === c.key).length,
  })).filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      <Card className="p-6 print:hidden">
        <h3 className="font-serif text-lg">Reporting period</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print / PDF</Button>
            <Button
              variant="outline"
              onClick={() =>
                exportRows(
                  "prayer-department-report",
                  ["Metric", "Value"],
                  [
                    ["Period", `${from} to ${to}`],
                    ["Prayer requests received", summary.requests.length],
                    ["Answered prayers", summary.answered.length],
                    ["Answered rate %", summary.answeredRate],
                    ["Open requests", summary.open.length],
                    ["Prayer meetings held", summary.meetings.length],
                    ["Prayer hours", summary.prayerHours],
                    ["Total attendance", summary.attendance],
                    ["Chain coverage %", summary.coverage],
                    ["Fasting programmes", summary.fasts.length],
                    ["Active intercessors", summary.team.length],
                  ],
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Excel (CSV)
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-8">
        <header className="border-b pb-4">
          <h2 className="font-serif text-2xl">Intercession Department Report</h2>
          <p className="text-sm text-muted-foreground">Throne Room of God Kingdom Center · {fmtDate(from)} – {fmtDate(to)}</p>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Prayer requests received", summary.requests.length],
            ["Answered prayers", `${summary.answered.length} (${summary.answeredRate}%)`],
            ["Requests still open", summary.open.length],
            ["Prayer meetings held", summary.meetings.length],
            ["Prayer hours logged", summary.prayerHours],
            ["Total attendance", summary.attendance],
            ["24/7 chain coverage", `${summary.coverage}%`],
            ["Fasting programmes", summary.fasts.length],
            ["Active intercessors", summary.team.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
              <p className="font-serif text-2xl">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-lg">Requests by category</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Category</th><th>Received</th><th>Answered</th><th>Rate</th></tr>
            </thead>
            <tbody>
              {byCategory.map((c) => (
                <tr key={c.label} className="border-t">
                  <td className="py-2">{c.label}</td><td>{c.total}</td><td>{c.answered}</td><td>{pct(c.answered, c.total)}%</td>
                </tr>
              ))}
              {byCategory.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No requests in this period.</td></tr>}
            </tbody>
          </table>
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-lg">Answered prayers & testimonies</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.answered.slice(0, 20).map((r: any) => (
              <li key={r.id} className="rounded-md border p-3">
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.prayer_no} · {labelFor(PRAYER_CATEGORIES, r.category)} · {branchLabel(r.branch)} · answered {fmtDate(r.answered_at)}
                </p>
                {r.answer_note && <p className="mt-1">{r.answer_note}</p>}
              </li>
            ))}
            {summary.answered.length === 0 && <li className="text-muted-foreground">No answered prayers recorded in this period.</li>}
          </ul>
        </section>

        <section className="mt-8">
          <h3 className="font-serif text-lg">Prayer meetings held</h3>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="py-2">Meeting</th><th>Type</th><th>Date</th><th>Attendance</th><th>Hours</th></tr>
            </thead>
            <tbody>
              {summary.meetings.map((m: any) => (
                <tr key={m.id} className="border-t">
                  <td className="py-2">{m.title}</td><td>{titleCase(m.meeting_type)}</td><td>{fmtDate(m.starts_at)}</td>
                  <td>{m.attendance_count ?? 0}</td><td>{m.prayer_hours ?? 0}</td>
                </tr>
              ))}
              {summary.meetings.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No meetings in this period.</td></tr>}
            </tbody>
          </table>
        </section>
      </Card>
    </div>
  );
}
