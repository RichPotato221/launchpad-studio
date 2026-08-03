import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { branchLabel, fmtDate } from "@/lib/finance";
import { AGE_GROUPS, MILESTONE_TYPES, ageFrom, childQrValue, labelFor, qrImageUrl } from "@/lib/kids";
import { Printer } from "lucide-react";

const sb = supabase as any;

/** MODULE 14 — Parent portal: a guardian's read-only view of their own children. */
export default function ParentPortal() {
  const [children, setChildren] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { setLoading(false); return; }
      const { data: links } = await sb.from("child_guardians").select("child_id").eq("profile_id", uid);
      const ids = (links ?? []).map((l: any) => l.child_id);
      if (ids.length === 0) { setLoading(false); return; }
      const [c, k, m, r, l2] = await Promise.all([
        sb.from("children").select("*").in("id", ids),
        sb.from("kids_checkins").select("*").in("child_id", ids).order("service_date", { ascending: false }),
        sb.from("kids_milestones").select("*").in("child_id", ids).order("achieved_on", { ascending: false }),
        sb.from("kids_classrooms").select("id, name"),
        sb.from("kids_lessons").select("*").eq("status", "taught").order("scheduled_date", { ascending: false }).limit(6),
      ]);
      setChildren(c.data ?? []); setCheckins(k.data ?? []); setMilestones(m.data ?? []);
      setRooms(r.data ?? []); setLessons(l2.data ?? []);
      setLoading(false);
    })();
  }, []);

  const attendanceRate = useMemo(() => {
    const dates = new Set(checkins.map((c) => c.service_date));
    return { services: dates.size, visits: checkins.length };
  }, [checkins]);

  if (loading) return <Card className="p-8 text-center text-sm text-muted-foreground">Loading your family…</Card>;

  if (children.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-serif text-xl">No children linked to your account</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask the Children's Ministry team to link you as a guardian on your child's profile, and their attendance,
          discipleship journey and check-in code will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">My children</p><p className="font-serif text-2xl">{children.length}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Services attended</p><p className="font-serif text-2xl">{attendanceRate.visits}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase tracking-widest text-muted-foreground">Milestones celebrated</p><p className="font-serif text-2xl">{milestones.length}</p></Card>
      </div>

      {children.map((c) => (
        <Card key={c.id} className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-serif text-xl">{c.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {c.child_code} · {ageFrom(c.date_of_birth) ?? "—"} yrs · {labelFor(AGE_GROUPS, c.age_group)} · {rooms.find((r) => r.id === c.classroom_id)?.name ?? "Unassigned"} · {branchLabel(c.branch)}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.allergies && <Badge variant="destructive">Allergy: {c.allergies}</Badge>}
                {c.medical_conditions && <Badge variant="destructive">Medical: {c.medical_conditions}</Badge>}
                {c.consent_signed_at ? <Badge variant="secondary">Consent on file</Badge> : <Badge variant="outline">Consent outstanding</Badge>}
              </div>
            </div>
            <div className="text-center">
              <img src={qrImageUrl(childQrValue(c.child_code), 120)} alt={`Check-in code for ${c.full_name}`} className="h-28 w-28" />
              <p className="mt-1 text-xs text-muted-foreground">Check-in code</p>
              <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Print</Button>
            </div>
          </div>

          <div className="mt-5 grid gap-6 border-t border-border/60 pt-5 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Recent attendance</p>
              <div className="mt-2 space-y-1 text-sm">
                {checkins.filter((k) => k.child_id === c.id).slice(0, 8).map((k, i) => (
                  <p key={i} className="text-muted-foreground">{fmtDate(k.service_date)} · {k.checked_out_at ? "collected" : "in class"}</p>
                ))}
                {checkins.filter((k) => k.child_id === c.id).length === 0 && <p className="text-muted-foreground">No attendance recorded yet.</p>}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Discipleship journey</p>
              <div className="mt-2 space-y-1 text-sm">
                {milestones.filter((m) => m.child_id === c.id).map((m) => (
                  <p key={m.id}>{labelFor(MILESTONE_TYPES, m.milestone_type)} <span className="text-xs text-muted-foreground">· {fmtDate(m.achieved_on)}</span></p>
                ))}
                {milestones.filter((m) => m.child_id === c.id).length === 0 && <p className="text-muted-foreground">No milestones yet.</p>}
              </div>
            </div>
          </div>
        </Card>
      ))}

      {lessons.length > 0 && (
        <Card className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">What your children have been learning</p>
          <div className="mt-3 space-y-3 text-sm">
            {lessons.map((l) => (
              <div key={l.id} className="rounded border border-border/60 p-3">
                <p className="font-medium">{l.title} <span className="text-xs text-muted-foreground">{l.scripture}</span></p>
                {l.memory_verse && <p className="text-muted-foreground">Memory verse: {l.memory_verse}</p>}
                {l.homework && <p className="text-muted-foreground">Home devotion: {l.homework}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
