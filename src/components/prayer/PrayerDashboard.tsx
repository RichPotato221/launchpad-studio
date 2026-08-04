import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RAG_CLASS, branchLabel, fmtDate, titleCase } from "@/lib/finance";
import {
  PRAYER_CATEGORIES,
  PRAYER_STATUS_CLASS,
  isOpen,
  labelFor,
  needsEscalation,
  pct,
  ragForCount,
  ragForScore,
} from "@/lib/intercession";

const sb = supabase as any;
const COLOURS = ["#0f766e", "#b45309", "#1d4ed8", "#7c3aed", "#be123c", "#047857", "#c2410c", "#4338ca"];

/** Module 1: Prayer Command Dashboard — live KPIs, trends and heat indicators. */
export default function PrayerDashboard() {
  const data = useQuery({
    queryKey: ["prayer-dashboard"],
    queryFn: async () => {
      const [requests, meetings, chains, slots, fasts, team, risks] = await Promise.all([
        sb.from("int_requests").select("*"),
        sb.from("int_meetings").select("*"),
        sb.from("int_chains").select("*"),
        sb.from("int_chain_slots").select("*"),
        sb.from("int_fasts").select("*"),
        sb.from("int_team_members").select("*"),
        sb.from("int_risks").select("*"),
      ]);
      return {
        requests: requests.data ?? [],
        meetings: meetings.data ?? [],
        chains: chains.data ?? [],
        slots: slots.data ?? [],
        fasts: fasts.data ?? [],
        team: team.data ?? [],
        risks: risks.data ?? [],
      };
    },
  });

  if (data.isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground">Loading prayer command dashboard…</Card>;
  const d = data.data!;

  const open = d.requests.filter(isOpen);
  const answered = d.requests.filter((r: any) => r.status === "answered");
  const answeredRate = pct(answered.length, d.requests.length || 1);
  const escalations = open.filter(needsEscalation);
  const coverage = pct(d.slots.filter((s: any) => s.covered).length, d.slots.length || 1);
  const prayerHours = d.meetings.reduce((s: number, m: any) => s + Number(m.prayer_hours ?? 0), 0);
  const attendance = d.meetings.reduce((s: number, m: any) => s + (m.attendance_count ?? 0), 0);

  const byCategory = PRAYER_CATEGORIES.map((c) => ({
    name: c.label,
    value: d.requests.filter((r: any) => r.category === c.key).length,
  })).filter((c) => c.value > 0);

  const monthly = (() => {
    const map = new Map<string, { month: string; requests: number; answered: number }>();
    for (const r of d.requests) {
      const key = String(r.created_at).slice(0, 7);
      if (!map.has(key)) map.set(key, { month: key, requests: 0, answered: 0 });
      const row = map.get(key)!;
      row.requests += 1;
      if (r.status === "answered") row.answered += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  })();

  const byBranch = ["etwatwa", "joburg_north", "joburg_south"].map((b) => ({
    name: branchLabel(b),
    requests: d.requests.filter((r: any) => r.branch === b).length,
    meetings: d.meetings.filter((m: any) => m.branch === b).length,
  }));

  const kpis = [
    { label: "Open requests", value: open.length, rag: ragForCount(open.length, 10, 25) },
    { label: "Answered rate", value: `${answeredRate}%`, rag: ragForScore(answeredRate, 60, 35) },
    { label: "Chain coverage", value: `${coverage}%`, rag: ragForScore(coverage, 90, 70) },
    { label: "Escalations", value: escalations.length, rag: ragForCount(escalations.length, 1, 4) },
    { label: "Prayer hours", value: prayerHours, rag: ragForScore(Math.min(100, prayerHours), 60, 20) },
    { label: "Meeting attendance", value: attendance, rag: ragForScore(Math.min(100, attendance), 50, 20) },
    { label: "Active intercessors", value: d.team.filter((t: any) => t.active !== false).length, rag: ragForScore(d.team.length * 10, 60, 30) },
    { label: "Open risks", value: d.risks.filter((r: any) => r.status !== "closed").length, rag: ragForCount(d.risks.filter((r: any) => r.status !== "closed").length) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="font-serif text-2xl">{k.value}</p>
              <span className={`h-3 w-3 rounded-full ${RAG_CLASS[k.rag].split(" ")[0]}`} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-serif text-lg">Requests vs answered prayers</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="requests" stroke="#0f766e" name="Requests" />
                <Line type="monotone" dataKey="answered" stroke="#b45309" name="Answered" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg">Requests by category</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLOURS[i % COLOURS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg">Activity by branch</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBranch}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="requests" fill="#0f766e" name="Prayer requests" />
                <Bar dataKey="meetings" fill="#b45309" name="Meetings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-serif text-lg">Urgent attention</h3>
          <div className="mt-3 space-y-2">
            {escalations.slice(0, 8).map((r: any) => (
              <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.prayer_no} · {labelFor(PRAYER_CATEGORIES, r.category)} · logged {fmtDate(r.created_at)}
                  </p>
                </div>
                <Badge variant="outline" className={PRAYER_STATUS_CLASS[r.status] ?? ""}>{titleCase(r.status)}</Badge>
              </div>
            ))}
            {escalations.length === 0 && <p className="text-sm text-muted-foreground">No requests are overdue. Prayer cover is current.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
