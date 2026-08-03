import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Printer } from "lucide-react";
import { branchLabel } from "@/lib/finance";
import { CHECKIN_METHODS, childQrValue, qrImageUrl, today } from "@/lib/kids";

const sb = supabase as any;
type Props = { canManage: boolean; currentUserId: string };

/** MODULE 3 — Check-in / check-out (KidCheck style). */
export default function CheckInModule({ canManage, currentUserId }: Props) {
  const [children, setChildren] = useState<any[]>([]);
  const [guardians, setGuardians] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [date, setDate] = useState(today());
  const [scan, setScan] = useState("");
  const [method, setMethod] = useState("manual");
  const [firstTime, setFirstTime] = useState(false);
  const [late, setLate] = useState(false);
  const [q, setQ] = useState("");
  const [badge, setBadge] = useState<any | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [releasedTo, setReleasedTo] = useState("");

  const load = async (d = date) => {
    const [c, g, r, k] = await Promise.all([
      sb.from("children").select("*").order("full_name"),
      sb.from("child_guardians").select("*"),
      sb.from("kids_classrooms").select("*").order("name"),
      sb.from("kids_checkins").select("*").eq("service_date", d),
    ]);
    setChildren(c.data ?? []); setGuardians(g.data ?? []); setClassrooms(r.data ?? []); setRows(k.data ?? []);
  };
  useEffect(() => { load(date); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date]);

  const openRow = (childId: string) => rows.find((r) => r.child_id === childId && !r.checked_out_at);

  const checkIn = async (child: any, how = method) => {
    if (openRow(child.id)) return toast.error(`${child.full_name} is already checked in.`);
    const { error } = await sb.from("kids_checkins").insert({
      child_id: child.id,
      classroom_id: child.classroom_id,
      service_date: date,
      method: how,
      checked_in_by: currentUserId,
      is_first_time: firstTime,
      late_arrival: late,
      branch: child.branch,
    });
    if (error) return toast.error(error.message);
    toast.success(`${child.full_name} checked in`);
    setBadge(child); setFirstTime(false); setLate(false); setScan("");
    load();
  };

  const checkOut = async (child: any) => {
    const row = openRow(child.id);
    if (!row) return toast.error("No open check-in for this child.");
    if (child.pin && pin !== child.pin) return toast.error("Incorrect secure PIN — do not release the child.");
    const { error } = await sb.from("kids_checkins").update({
      checked_out_at: new Date().toISOString(),
      checked_out_by: currentUserId,
      released_to: releasedTo || null,
    }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`${child.full_name} released${releasedTo ? ` to ${releasedTo}` : ""}`);
    setPinFor(null); setPin(""); setReleasedTo(""); load();
  };

  const doScan = async () => {
    const raw = scan.trim();
    if (!raw) return;
    const code = raw.replace("TROGKC-KID:", "").toUpperCase();
    const child = children.find((c) => (c.child_code ?? "").toUpperCase() === code || c.full_name.toLowerCase() === raw.toLowerCase());
    if (!child) return toast.error("No child matches that code.");
    if (openRow(child.id)) { setPinFor(child.id); toast.info(`${child.full_name} is checked in — confirm PIN to release.`); }
    else await checkIn(child, "qr");
  };

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return children.filter((c) => !t || [c.full_name, c.child_code, c.nickname].filter(Boolean).some((v: string) => v.toLowerCase().includes(t)));
  }, [children, q]);

  const present = rows.filter((r) => !r.checked_out_at);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Checked in</p><p className="font-serif text-2xl">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Currently on register</p><p className="font-serif text-2xl">{present.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">First-timers</p><p className="font-serif text-2xl">{rows.filter((r) => r.is_first_time).length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Late arrivals</p><p className="font-serif text-2xl">{rows.filter((r) => r.late_arrival).length}</p></Card>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div><Label>Service date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="md:col-span-2">
            <Label>Scan QR / barcode or type child ID</Label>
            <Input value={scan} placeholder="TROGKC-KID:…" onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); doScan(); } }} />
          </div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CHECKIN_METHODS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><Checkbox checked={firstTime} onCheckedChange={(v) => setFirstTime(!!v)} /> First-time visitor</label>
          <label className="flex items-center gap-2"><Checkbox checked={late} onCheckedChange={(v) => setLate(!!v)} /> Late arrival</label>
          <Button size="sm" onClick={doScan}>Process scan</Button>
        </div>
      </Card>

      {badge && (
        <Card className="p-6 print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Child &amp; parent badge</p>
              <p className="mt-1 font-serif text-2xl">{badge.full_name}</p>
              <p className="text-sm text-muted-foreground">{badge.child_code} · {classrooms.find((c) => c.id === badge.classroom_id)?.name ?? "Unassigned"} · {branchLabel(badge.branch)}</p>
              {badge.allergies && <p className="mt-1 text-sm font-medium text-destructive">Allergy: {badge.allergies}</p>}
              {badge.medical_conditions && <p className="text-sm font-medium text-destructive">Medical: {badge.medical_conditions}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Matching parent code: {badge.child_code}-P{badge.pin ? ` · PIN required at collection` : ""}</p>
            </div>
            <img src={qrImageUrl(childQrValue(badge.child_code), 140)} alt="Badge QR" className="h-32 w-32" />
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print badge</Button>
              <Button variant="ghost" size="sm" onClick={() => setBadge(null)}>Dismiss</Button>
            </div>
          </div>
        </Card>
      )}

      <Input className="max-w-sm" placeholder="Search children…" value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="grid gap-3">
        {filtered.map((c) => {
          const row = openRow(c.id);
          const done = rows.find((r) => r.child_id === c.id && r.checked_out_at);
          const gs = guardians.filter((g) => g.child_id === c.id && g.can_pickup);
          return (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{c.full_name} <span className="text-xs text-muted-foreground">{c.child_code}</span></p>
                <p className="text-xs text-muted-foreground">
                  {classrooms.find((r) => r.id === c.classroom_id)?.name ?? "Unassigned"}
                  {c.allergies && <span className="text-destructive"> · Allergy: {c.allergies}</span>}
                </p>
                {row && <Badge className="mt-1" variant="secondary">Checked in {new Date(row.checked_in_at).toLocaleTimeString()}</Badge>}
                {done && !row && <Badge className="mt-1" variant="outline">Released to {done.released_to || "guardian"}</Badge>}
              </div>
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  {!row && <Button size="sm" onClick={() => checkIn(c)}>Check in</Button>}
                  {row && pinFor !== c.id && <Button size="sm" variant="outline" onClick={() => { setPinFor(c.id); setReleasedTo(gs[0]?.full_name ?? ""); }}>Check out</Button>}
                  {row && pinFor === c.id && (
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={releasedTo || undefined} onValueChange={setReleasedTo}>
                        <SelectTrigger className="w-56"><SelectValue placeholder="Released to…" /></SelectTrigger>
                        <SelectContent>{gs.map((g) => <SelectItem key={g.id} value={g.full_name}>{g.full_name} ({g.relationship || "guardian"})</SelectItem>)}</SelectContent>
                      </Select>
                      <Input className="w-32" placeholder="Secure PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
                      <Button size="sm" onClick={() => checkOut(c)}>Confirm release</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setPinFor(null); setPin(""); }}>Cancel</Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
