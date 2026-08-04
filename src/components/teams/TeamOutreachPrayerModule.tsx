import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { exportRows, fmtDate, money } from "@/lib/finance";
import { Field, Picker, Stat } from "@/components/teams/TeamMembersModule";
import { OUTREACH_CATEGORIES, PRAYER_CATEGORIES, nice, today, type TeamKey } from "@/lib/ministryTeams";

const sb = supabase as any;

type Props = { team: TeamKey; canManage: boolean; currentUserId: string };

/** Outreach & evangelism projects plus prayer / pastoral support requests. */
export default function TeamOutreachPrayerModule({ team, canManage, currentUserId }: Props) {
  const [projects, setProjects] = useState<any[]>([]);
  const [prayer, setPrayer] = useState<any[]>([]);

  const emptyProject = {
    title: "", category: "community", location: "", leader_name: "", start_date: today(), end_date: "",
    budget: "", volunteers: "0", volunteer_hours: "0", people_reached: "0", salvations: "0", beneficiaries: "", impact: "",
  };
  const emptyPrayer = { requester_name: "", category: "general", request: "", confidential: false, assigned_to: "", follow_up_date: "" };
  const [pForm, setPForm] = useState({ ...emptyProject });
  const [rForm, setRForm] = useState({ ...emptyPrayer });

  const load = async () => {
    const [{ data: o }, { data: p }] = await Promise.all([
      sb.from("mt_outreach").select("*").eq("team", team).order("start_date", { ascending: false }),
      sb.from("mt_prayer").select("*").eq("team", team).order("created_at", { ascending: false }),
    ]);
    setProjects(o ?? []);
    setPrayer(p ?? []);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pForm.title.trim()) return toast.error("Name the project");
    const { error } = await sb.from("mt_outreach").insert({
      ...pForm,
      team,
      end_date: pForm.end_date || null,
      budget: pForm.budget ? Number(pForm.budget) : null,
      volunteers: Number(pForm.volunteers || 0),
      volunteer_hours: Number(pForm.volunteer_hours || 0),
      people_reached: Number(pForm.people_reached || 0),
      salvations: Number(pForm.salvations || 0),
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Outreach project logged");
    setPForm({ ...emptyProject });
    load();
  };

  const savePrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rForm.request.trim()) return toast.error("Enter the request");
    const { error } = await sb.from("mt_prayer").insert({
      ...rForm,
      team,
      follow_up_date: rForm.follow_up_date || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Prayer request submitted");
    setRForm({ ...emptyPrayer });
    load();
  };

  const setStatus = async (row: any, status: string) => {
    const { error } = await sb.from("mt_prayer").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    load();
  };

  const reached = projects.reduce((s, p) => s + Number(p.people_reached ?? 0), 0);
  const salvations = projects.reduce((s, p) => s + Number(p.salvations ?? 0), 0);
  const hours = projects.reduce((s, p) => s + Number(p.volunteer_hours ?? 0), 0);
  const openPrayer = prayer.filter((p) => p.status === "open");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects" value={projects.length} />
        <Stat label="People reached" value={reached} />
        <Stat label="Salvations recorded" value={salvations} />
        <Stat label="Volunteer hours" value={hours} />
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Outreach, evangelism &amp; support projects</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportRows(
                `${team}-outreach`,
                ["Project", "Category", "Leader", "Start", "Reached", "Salvations", "Volunteers", "Hours", "Budget", "Status"],
                projects.map((p) => [p.title, nice(p.category), p.leader_name, p.start_date, p.people_reached, p.salvations, p.volunteers, p.volunteer_hours, p.budget, nice(p.status)]),
              )
            }
          >
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </div>
        {canManage && (
          <form onSubmit={saveProject} className="mt-4 grid gap-4 md:grid-cols-4">
            <Field label="Title"><Input value={pForm.title} onChange={(e) => setPForm({ ...pForm, title: e.target.value })} /></Field>
            <Field label="Category">
              <Picker value={pForm.category} onChange={(v) => setPForm({ ...pForm, category: v })} options={OUTREACH_CATEGORIES.map((c) => [c, nice(c)])} />
            </Field>
            <Field label="Location"><Input value={pForm.location} onChange={(e) => setPForm({ ...pForm, location: e.target.value })} /></Field>
            <Field label="Leader"><Input value={pForm.leader_name} onChange={(e) => setPForm({ ...pForm, leader_name: e.target.value })} /></Field>
            <Field label="Start"><Input type="date" value={pForm.start_date} onChange={(e) => setPForm({ ...pForm, start_date: e.target.value })} /></Field>
            <Field label="End"><Input type="date" value={pForm.end_date} onChange={(e) => setPForm({ ...pForm, end_date: e.target.value })} /></Field>
            <Field label="Budget (R)"><Input type="number" value={pForm.budget} onChange={(e) => setPForm({ ...pForm, budget: e.target.value })} /></Field>
            <Field label="Volunteers"><Input type="number" value={pForm.volunteers} onChange={(e) => setPForm({ ...pForm, volunteers: e.target.value })} /></Field>
            <Field label="Volunteer hours"><Input type="number" value={pForm.volunteer_hours} onChange={(e) => setPForm({ ...pForm, volunteer_hours: e.target.value })} /></Field>
            <Field label="People reached"><Input type="number" value={pForm.people_reached} onChange={(e) => setPForm({ ...pForm, people_reached: e.target.value })} /></Field>
            <Field label="Salvations"><Input type="number" value={pForm.salvations} onChange={(e) => setPForm({ ...pForm, salvations: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Beneficiaries"><Input value={pForm.beneficiaries} onChange={(e) => setPForm({ ...pForm, beneficiaries: e.target.value })} /></Field></div>
            <div className="md:col-span-3"><Field label="Community impact"><Textarea rows={2} value={pForm.impact} onChange={(e) => setPForm({ ...pForm, impact: e.target.value })} /></Field></div>
            <div className="flex items-end"><Button type="submit">Log project</Button></div>
          </form>
        )}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="py-2">Project</th><th>Category</th><th>Leader</th><th>Dates</th><th>Reached</th><th>Salvations</th><th>Budget</th><th>Status</th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 font-medium">{p.title}{p.location && <div className="text-xs text-muted-foreground">{p.location}</div>}</td>
                  <td className="text-xs">{nice(p.category)}</td>
                  <td className="text-xs">{p.leader_name || "—"}</td>
                  <td className="text-xs">{fmtDate(p.start_date)}{p.end_date ? ` – ${fmtDate(p.end_date)}` : ""}</td>
                  <td>{p.people_reached}</td>
                  <td>{p.salvations}</td>
                  <td className="text-xs">{p.budget ? money(Number(p.budget)) : "—"}</td>
                  <td><Badge variant="outline" className="text-[11px]">{nice(p.status)}</Badge></td>
                </tr>
              ))}
              {projects.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No outreach projects yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Prayer &amp; pastoral support</h3>
          <Badge variant="outline">{openPrayer.length} open</Badge>
        </div>
        <form onSubmit={savePrayer} className="mt-4 grid gap-4 md:grid-cols-4">
          <Field label="Requester"><Input value={rForm.requester_name} onChange={(e) => setRForm({ ...rForm, requester_name: e.target.value })} /></Field>
          <Field label="Category">
            <Picker value={rForm.category} onChange={(v) => setRForm({ ...rForm, category: v })} options={PRAYER_CATEGORIES.map((c) => [c, nice(c)])} />
          </Field>
          <Field label="Assign to"><Input value={rForm.assigned_to} onChange={(e) => setRForm({ ...rForm, assigned_to: e.target.value })} /></Field>
          <Field label="Follow-up date"><Input type="date" value={rForm.follow_up_date} onChange={(e) => setRForm({ ...rForm, follow_up_date: e.target.value })} /></Field>
          <div className="md:col-span-3"><Field label="Request"><Textarea rows={2} value={rForm.request} onChange={(e) => setRForm({ ...rForm, request: e.target.value })} /></Field></div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={rForm.confidential} onChange={(e) => setRForm({ ...rForm, confidential: e.target.checked })} /> Confidential
            </label>
            <Button type="submit">Submit</Button>
          </div>
        </form>
        <div className="mt-5 space-y-2">
          {prayer.map((p) => (
            <div key={p.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {p.confidential ? "Confidential request" : p.requester_name || "Anonymous"}{" "}
                  <Badge variant="outline" className="ml-1 text-[11px]">{nice(p.category)}</Badge>
                </p>
                <p className="mt-1 text-muted-foreground">{p.confidential ? "Held with ministry leadership." : p.request}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Assigned {p.assigned_to || "—"} · Follow-up {p.follow_up_date ? fmtDate(p.follow_up_date) : "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-[11px]">{nice(p.status)}</Badge>
                {canManage && p.status !== "answered" && <Button size="sm" variant="outline" onClick={() => setStatus(p, "answered")}>Answered</Button>}
              </div>
            </div>
          ))}
          {prayer.length === 0 && <p className="text-sm text-muted-foreground">No prayer requests captured yet.</p>}
        </div>
      </Card>
    </div>
  );
}
