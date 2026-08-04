import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { exportRows, fmtDate, titleCase } from "@/lib/finance";
import { Download } from "lucide-react";

const sb = supabase as any;

const STATUS_TONE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-rose-100 text-rose-900",
  improvement_requested: "bg-sky-100 text-sky-900",
  draft: "bg-muted text-muted-foreground",
};

/**
 * MODULE 6 — Department Review Centre for the Office of the Lead / Assistant Pastor.
 * Tracks which departments have submitted their period reports, which are late or
 * missing, and lets this office approve, reject or request improvements.
 */
export default function DepartmentReviewCentre({ canManage, currentUserId }: { canManage: boolean; currentUserId: string }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["lead-pastor-review-centre"],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      const [reports, departments, entries, profiles] = await Promise.all([
        sb.from("branch_reports").select("*").gte("period_end", since).order("period_end", { ascending: false }),
        sb.from("departments").select("slug, name, kind"),
        sb.from("report_entries").select("id, title, department_slug, created_at, created_by").gte("created_at", since),
        sb.from("profiles").select("id, full_name"),
      ]);
      return {
        reports: reports.data ?? [],
        departments: departments.data ?? [],
        entries: entries.data ?? [],
        profiles: profiles.data ?? [],
      };
    },
  });

  const view = useMemo(() => {
    if (!data) return null;
    const nameOf = new Map<string, string>(data.profiles.map((p: any) => [p.id, p.full_name ?? "Unknown"]));
    const deptName = new Map<string, string>(data.departments.map((d: any) => [d.slug, d.name]));
    const rows = data.reports.map((r: any) => ({
      ...r,
      department: deptName.get(r.department_slug ?? "") ?? titleCase(r.department_slug ?? "church-wide"),
      submitter: r.submitted_by ? nameOf.get(r.submitted_by) ?? "Unknown" : "—",
      late: r.submitted_at ? r.submitted_at.slice(0, 10) > r.period_end : false,
    }));
    const reported = new Set(data.reports.map((r: any) => r.department_slug));
    const missing = data.departments.filter((d: any) => !reported.has(d.slug));
    return {
      rows,
      missing,
      entries: data.entries.map((e: any) => ({
        ...e,
        department: deptName.get(e.department_slug) ?? titleCase(e.department_slug),
        author: nameOf.get(e.created_by) ?? "Unknown",
      })),
      counts: {
        submitted: rows.filter((r: any) => r.status === "submitted").length,
        approved: rows.filter((r: any) => r.status === "approved").length,
        rejected: rows.filter((r: any) => r.status === "rejected").length,
        improvement: rows.filter((r: any) => r.status === "improvement_requested").length,
        late: rows.filter((r: any) => r.late).length,
        missing: missing.length,
      },
    };
  }, [data]);

  const decide = async (id: string, status: string) => {
    const note = notes[id]?.trim();
    const payload: any = { status, reviewed_by: currentUserId, reviewed_at: new Date().toISOString() };
    const existing = view?.rows.find((r: any) => r.id === id);
    if (note) payload.data = { ...(existing?.data ?? {}), review_note: note };
    const { error } = await sb.from("branch_reports").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Report ${status.replace("_", " ")}`);
    setNotes((n) => ({ ...n, [id]: "" }));
    qc.invalidateQueries({ queryKey: ["lead-pastor-review-centre"] });
  };

  if (isLoading || !view) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Loading review centre…</Card>;
  }

  const filtered = filter === "all" ? view.rows : filter === "late" ? view.rows.filter((r: any) => r.late) : view.rows.filter((r: any) => r.status === filter);

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h3 className="font-serif text-lg">Report pipeline (last 90 days)</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Object.entries(view.counts).map(([k, v]) => (
            <div key={k} className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{titleCase(k)}</p>
              <p className="mt-1 font-serif text-2xl">{v as number}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-serif text-lg">Submitted reports</h3>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reports</SelectItem>
                <SelectItem value="submitted">Pending review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="improvement_requested">Improvement requested</SelectItem>
                <SelectItem value="late">Late submissions</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRows(
                  "department-reports",
                  ["Department", "Type", "Period", "Status", "Submitted by", "Submitted", "Late"],
                  filtered.map((r: any) => [r.department, r.report_type, `${r.period_start} → ${r.period_end}`, r.status, r.submitter, r.submitted_at ? fmtDate(r.submitted_at) : "", r.late ? "Yes" : "No"]),
                )
              }
            >
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtered.map((r: any) => (
            <div key={r.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{r.department} — {titleCase(r.report_type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.period_start} → {r.period_end} · {r.submitter} · {r.submitted_at ? fmtDate(r.submitted_at) : "not submitted"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {r.late && <Badge variant="outline">Late</Badge>}
                  <Badge className={STATUS_TONE[r.status] ?? ""}>{titleCase(r.status)}</Badge>
                </div>
              </div>
              {r.data?.review_note && <p className="mt-2 text-sm text-muted-foreground">Review note: {r.data.review_note}</p>}
              {canManage && r.status !== "approved" && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Review note or improvement request…"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => decide(r.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r.id, "improvement_requested")}>Request improvement</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>Reject</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!filtered.length && <p className="text-sm text-muted-foreground">No reports match this filter.</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-serif text-lg">Missing reports</h3>
          <p className="mt-1 text-sm text-muted-foreground">Departments with no report in the last 90 days.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {view.missing.map((d: any) => (
              <li key={d.slug} className="flex items-center justify-between rounded border px-3 py-2">
                <span>{d.name}</span>
                <Badge variant="outline">{titleCase(d.kind)}</Badge>
              </li>
            ))}
            {!view.missing.length && <li className="text-muted-foreground">Every department has reported.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h3 className="font-serif text-lg">Latest department submissions</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {view.entries.slice(0, 12).map((e: any) => (
              <li key={e.id} className="rounded border px-3 py-2">
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.department} · {e.author} · {fmtDate(e.created_at)}</p>
              </li>
            ))}
            {!view.entries.length && <li className="text-muted-foreground">No department submissions in the last 90 days.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
