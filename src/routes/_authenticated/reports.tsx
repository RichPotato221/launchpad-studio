import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { fetchAllKpis, fetchDepartments, KPI_CATEGORIES, type KpiCategory } from "@/lib/portal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useBranchScope, filterByBranch } from "@/lib/useBranchScope";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — TRoGKC Portal" }] }),
  component: ReportsPage,
});

type ReportEntry = {
  id: string;
  department_slug: string;
  title: string;
  body: string | null;
  file_url: string | null;
  file_name: string | null;
  created_by: string;
  created_at: string;
};

async function fetchReportEntries() {
  const { data, error } = await supabase.from("report_entries").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as ReportEntry[];
}

/** Green at 90%+ of target, amber from 60%, red below — unrated when there is no target or actual yet. */
function ragFor(actual: number | null, target: number | null): "green" | "amber" | "red" | "unrated" {
  if (actual == null || target == null || target === 0) return "unrated";
  const pct = actual / target;
  if (pct >= 0.9) return "green";
  if (pct >= 0.6) return "amber";
  return "red";
}

const RAG_LABEL: Record<string, string> = {
  green: "Green — on track",
  amber: "Amber — needs attention",
  red: "Red — off track",
  unrated: "Not yet rated",
};

function ReportsPage() {
  const scope = useBranchScope();
  const kpis = useQuery({ queryKey: ["all-kpis"], queryFn: fetchAllKpis });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const entries = useQuery({ queryKey: ["report-entries"], queryFn: fetchReportEntries });
  const [category, setCategory] = useState<KpiCategory | "all">("all");
  const [dept, setDept] = useState<string>("all");
  const [rag, setRag] = useState<"all" | "green" | "amber" | "red" | "unrated">("all");

  const filtered = filterByBranch((kpis.data ?? []) as any[], scope.data).filter((k: any) => {
    if (category !== "all" && k.category !== category) return false;
    if (dept !== "all" && k.department_slug !== dept) return false;
    if (rag !== "all" && ragFor(k.actual, k.target) !== rag) return false;
    return true;
  });

  const byCategory = KPI_CATEGORIES.map((c) => ({
    ...c,
    count: (kpis.data ?? []).filter((k) => k.category === c.key).length,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Roll-up reporting</p>
      <h1 className="mt-2 font-serif text-4xl md:text-5xl">Church-wide reporting</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Aggregate KPI view across every department, plus a shared feed where each department can post comments and
        upload documents.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        {byCategory.map((c) => (
          <Card key={c.key} className="p-4">
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{c.label}</p>
            <p className="mt-2 font-serif text-3xl">{c.count}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Category</p>
          <Select value={category} onValueChange={(v) => setCategory(v as any)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {KPI_CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Department</p>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(depts.data ?? []).map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Status (RAG)</p>
          <Select value={rag} onValueChange={(v) => setRag(v as any)}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="green">{RAG_LABEL.green}</SelectItem>
              <SelectItem value="amber">{RAG_LABEL.amber}</SelectItem>
              <SelectItem value="red">{RAG_LABEL.red}</SelectItem>
              <SelectItem value="unrated">{RAG_LABEL.unrated}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Department</th>
              <th className="p-3">KPI</th>
              <th className="p-3">Category</th>
              <th className="p-3">Period</th>
              <th className="p-3">Baseline</th>
              <th className="p-3">Target</th>
              <th className="p-3">Actual</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => (
              <tr key={k.id} className="border-t border-border">
                <td className="p-3">{k.department_slug}</td>
                <td className="p-3 font-medium">{k.kpi_name}</td>
                <td className="p-3 text-muted-foreground">{k.category.replace("_", " ")}</td>
                <td className="p-3 text-muted-foreground">
                  {k.period_type} · {k.period_date}
                </td>
                <td className="p-3">{k.baseline ?? "—"}</td>
                <td className="p-3">{k.target ?? "—"}</td>
                <td
                  className={`p-3 font-medium ${k.actual == null || k.target == null || k.target === 0 ? "" : k.actual / k.target >= 0.9 ? "text-green-600" : k.actual / k.target >= 0.6 ? "text-orange-500" : "text-red-600"}`}
                >
                  {k.actual ?? "-"}
                </td>
                <td className="p-3 text-xs">
                  {(() => {
                    const r = ragFor(k.actual, k.target);
                    const cls =
                      r === "green"
                        ? "bg-green-100 text-green-800"
                        : r === "amber"
                          ? "bg-orange-100 text-orange-800"
                          : r === "red"
                            ? "bg-red-100 text-red-800"
                            : "bg-muted text-muted-foreground";
                    return <span className={`rounded-full px-2 py-0.5 ${cls}`}>{RAG_LABEL[r]}</span>;
                  })()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No KPI entries for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-14">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Department feed</p>
        <h2 className="mt-2 font-serif text-3xl">Add a comment or document</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Any approved member can post here on behalf of their department — narrative updates, minutes, sermon notes,
          budget PDFs, event reports.
        </p>

        <AddReportEntry departments={depts.data ?? []} onCreated={() => entries.refetch()} />

        <div className="mt-8 space-y-4">
          {filterByBranch((entries.data ?? []) as any[], scope.data).map((e: any) => {
            const deptName = depts.data?.find((d) => d.slug === e.department_slug)?.name ?? e.department_slug;
            return (
              <Card key={e.id} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{deptName}</p>
                    <p className="mt-1 font-serif text-lg">{e.title}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                </div>
                {e.body && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{e.body}</p>}
                {e.file_url && (
                  <a href={e.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm underline">
                    📎 {e.file_name ?? "Attached document"}
                  </a>
                )}
              </Card>
            );
          })}
          {filterByBranch((entries.data ?? []) as any[], scope.data).length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">No entries yet. Be the first to post.</Card>
          )}
        </div>
      </div>
    </div>
  );
}

function AddReportEntry({
  departments,
  onCreated,
}: {
  departments: { slug: string; name: string }[];
  onCreated: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !title.trim()) return toast.error("Department and title are required.");
    setSaving(true);
    try {
      const { data: userRes } = await getAuthUserResult();
      if (!userRes.user) throw new Error("Not signed in");

      let file_url: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const path = `${slug}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
        const up = await supabase.storage.from("department-reports").upload(path, file);
        if (up.error) throw up.error;
        const signed = await supabase.storage.from("department-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed.error) throw signed.error;
        file_url = signed.data.signedUrl;
        file_name = file.name;
      }

      const { error } = await supabase.from("report_entries").insert({
        department_slug: slug,
        title: title.trim(),
        body: body.trim() || null,
        file_url,
        file_name,
        created_by: userRes.user.id,
      });
      if (error) throw error;
      toast.success("Entry posted");
      setTitle("");
      setBody("");
      setFile(null);
      onCreated();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mt-6 p-6">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Department</Label>
          <Select value={slug} onValueChange={setSlug}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Title</Label>
          <Input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. October 2026 finance report"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Comment / narrative</Label>
          <Textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Summary, decisions, follow-ups…"
          />
        </div>
        <div className="md:col-span-2">
          <Label>Attach a document (optional)</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, Word, Excel, images — all approved members can view attachments.
          </p>
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Posting…" : "Post entry"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
