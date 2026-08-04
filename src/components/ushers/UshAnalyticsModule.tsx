import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { exportRows, fmtDate } from "@/lib/finance";
import { pct, today } from "@/lib/intercession";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

/** MODULE — Attendance capture, analytics and reporting. */
export default function UshAnalyticsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const empty = {
    service_id: "",
    service_date: today(),
    adults: "0",
    children: "0",
    first_timers: "0",
    returning_visitors: "0",
    vip_guests: "0",
    volunteers_present: "0",
    peak_arrival_time: "",
    avg_entry_minutes: "",
  };
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    const [{ data: a }, { data: s }] = await Promise.all([
      sb.from("ush_attendance").select("*").order("service_date", { ascending: false }),
      sb.from("ush_services").select("id,title,service_date").order("service_date", { ascending: false }),
    ]);
    setRows(a ?? []);
    setServices(s ?? []);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await sb.from("ush_attendance").insert({
      service_id: form.service_id || null,
      service_date: form.service_date,
      adults: Number(form.adults) || 0,
      children: Number(form.children) || 0,
      first_timers: Number(form.first_timers) || 0,
      returning_visitors: Number(form.returning_visitors) || 0,
      vip_guests: Number(form.vip_guests) || 0,
      volunteers_present: Number(form.volunteers_present) || 0,
      peak_arrival_time: form.peak_arrival_time || null,
      avg_entry_minutes: form.avg_entry_minutes ? Number(form.avg_entry_minutes) : null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Attendance captured");
    setForm({ ...empty });
    load();
  };

  const totals = useMemo(() => {
    const total = rows.reduce((s, r) => s + (r.adults ?? 0) + (r.children ?? 0), 0);
    const first = rows.reduce((s, r) => s + (r.first_timers ?? 0), 0);
    const ret = rows.reduce((s, r) => s + (r.returning_visitors ?? 0), 0);
    const vols = rows.reduce((s, r) => s + (r.volunteers_present ?? 0), 0);
    return { total, first, ret, vols, avg: rows.length ? Math.round(total / rows.length) : 0 };
  }, [rows]);

  const chart = useMemo(() => [...rows].slice(0, 12).reverse(), [rows]);
  const max = Math.max(1, ...chart.map((r) => (r.adults ?? 0) + (r.children ?? 0)));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Services counted</p><p className="mt-1 font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Average attendance</p><p className="mt-1 font-serif text-2xl">{totals.avg}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">First-timers</p><p className="mt-1 font-serif text-2xl">{totals.first}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Returning</p><p className="mt-1 font-serif text-2xl">{totals.ret}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Retention</p><p className="mt-1 font-serif text-2xl">{pct(totals.ret, totals.first + totals.ret)}%</p></Card>
      </div>

      {canManage && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Capture attendance</p>
          <form onSubmit={add} className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label>Service</Label>
              <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.title} · {fmtDate(s.service_date)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={form.service_date} onChange={(e) => setForm({ ...form, service_date: e.target.value })} /></div>
            <div><Label>Adults</Label><Input type="number" value={form.adults} onChange={(e) => setForm({ ...form, adults: e.target.value })} /></div>
            <div><Label>Children</Label><Input type="number" value={form.children} onChange={(e) => setForm({ ...form, children: e.target.value })} /></div>
            <div><Label>First-timers</Label><Input type="number" value={form.first_timers} onChange={(e) => setForm({ ...form, first_timers: e.target.value })} /></div>
            <div><Label>Returning visitors</Label><Input type="number" value={form.returning_visitors} onChange={(e) => setForm({ ...form, returning_visitors: e.target.value })} /></div>
            <div><Label>VIP guests</Label><Input type="number" value={form.vip_guests} onChange={(e) => setForm({ ...form, vip_guests: e.target.value })} /></div>
            <div><Label>Volunteers present</Label><Input type="number" value={form.volunteers_present} onChange={(e) => setForm({ ...form, volunteers_present: e.target.value })} /></div>
            <div><Label>Peak arrival time</Label><Input placeholder="09:35" value={form.peak_arrival_time} onChange={(e) => setForm({ ...form, peak_arrival_time: e.target.value })} /></div>
            <div><Label>Avg entry (min)</Label><Input type="number" value={form.avg_entry_minutes} onChange={(e) => setForm({ ...form, avg_entry_minutes: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit">Save counts</Button></div>
          </form>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance trend</p>
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(
                  "ushering-attendance",
                  ["Date", "Adults", "Children", "First-timers", "Returning", "VIP", "Volunteers", "Peak arrival"],
                  rows.map((r) => [r.service_date, r.adults, r.children, r.first_timers, r.returning_visitors, r.vip_guests, r.volunteers_present, r.peak_arrival_time]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
        <div className="mt-4 flex h-40 items-end gap-2">
          {chart.map((r) => {
            const total = (r.adults ?? 0) + (r.children ?? 0);
            return (
              <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(4, (total / max) * 140)}px` }} />
                <span className="text-[0.6rem] text-muted-foreground">{(r.service_date ?? "").slice(5)}</span>
              </div>
            );
          })}
          {chart.length === 0 && <p className="text-sm text-muted-foreground">No attendance captured yet.</p>}
        </div>
      </Card>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Service records</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left">Date</th>
                <th className="py-2 text-right">Adults</th>
                <th className="py-2 text-right">Children</th>
                <th className="py-2 text-right">First</th>
                <th className="py-2 text-right">Returning</th>
                <th className="py-2 text-right">VIP</th>
                <th className="py-2 text-right">Volunteers</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2">{fmtDate(r.service_date)}</td>
                  <td className="py-2 text-right">{r.adults}</td>
                  <td className="py-2 text-right">{r.children}</td>
                  <td className="py-2 text-right">{r.first_timers}</td>
                  <td className="py-2 text-right">{r.returning_visitors}</td>
                  <td className="py-2 text-right">{r.vip_guests}</td>
                  <td className="py-2 text-right">{r.volunteers_present}</td>
                  <td className="py-2 text-right font-medium">{(r.adults ?? 0) + (r.children ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
