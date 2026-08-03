import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Download, Printer } from "lucide-react";
import { BRANCHES, STATUS_CLASS, branchLabel, exportRows, fmtDate, money, titleCase } from "@/lib/finance";
import { APPROVAL_TYPES } from "@/lib/governance";

const sb = supabase as any;

type Props = { canManage: boolean; currentUserId: string };

export default function ExecutiveApprovalsModule({ canManage, currentUserId }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [signatures, setSignatures] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [signature, setSignature] = useState("");
  const [comment, setComment] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const empty = {
    item_type: APPROVAL_TYPES[0],
    title: "",
    detail: "",
    reference: "",
    department_slug: "",
    branch: "",
    amount: "",
    document_url: "",
  };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    setLoading(true);
    const [a, d] = await Promise.all([
      sb.from("governance_approvals")
        .select("*, submitter:profiles!governance_approvals_decided_by_fkey(id, full_name)")
        .order("created_at", { ascending: false }),
      sb.from("departments").select("slug, name").order("name"),
    ]);
    const list = a.data ?? [];
    setRows(list);
    setDepartments(d.data ?? []);
    if (list.length) {
      const { data: sigs } = await sb
        .from("digital_signatures")
        .select("*, signer:profiles!digital_signatures_signer_id_fkey(full_name)")
        .eq("entity_type", "governance_approval")
        .in("entity_id", list.map((r: any) => r.id));
      const grouped: Record<string, any[]> = {};
      (sigs ?? []).forEach((s: any) => {
        grouped[s.entity_id] = [...(grouped[s.entity_id] ?? []), s];
      });
      setSignatures(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `chairperson/approvals/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage.from("department-reports").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("department-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setForm((f: any) => ({ ...f, document_url: signed.data.signedUrl }));
      toast.success("Document attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("A title is required.");
    const { error } = await sb.from("governance_approvals").insert({
      item_type: form.item_type,
      title: form.title.trim(),
      detail: form.detail.trim() || null,
      reference: form.reference.trim() || null,
      department_slug: form.department_slug || null,
      branch: form.branch || null,
      amount: form.amount ? Number(form.amount) : null,
      document_url: form.document_url || null,
      submitted_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success("Submitted for executive approval");
    setForm(empty);
    load();
  };

  const decide = async (row: any, status: "approved" | "rejected") => {
    if (!signature.trim()) return toast.error("Type your full name as a digital signature before signing off.");
    const { error } = await sb.from("governance_approvals").update({
      status,
      decided_by: currentUserId,
      decided_at: new Date().toISOString(),
      decision_comment: comment[row.id] ?? null,
      signature_name: signature.trim(),
    }).eq("id", row.id);
    if (error) return toast.error(error.message);

    await sb.from("digital_signatures").insert({
      entity_type: "governance_approval",
      entity_id: row.id,
      signer_id: currentUserId,
      signature_data: `${signature.trim()} — ${status} on ${new Date().toISOString()}`,
    });

    if (row.submitted_by && row.submitted_by !== currentUserId) {
      await sb.from("notifications").insert({
        user_id: row.submitted_by,
        title: `Executive approval — ${titleCase(status)}`,
        message: row.title,
        link: "/departments/chairperson",
        type: "governance_approval",
        branch: row.branch ?? null,
      });
    }
    toast.success(`Signed off as ${status}`);
    load();
  };

  const filtered = useMemo(
    () => rows.filter((r) => (filterStatus === "all" ? true : r.status === filterStatus)),
    [rows, filterStatus],
  );

  const exportCsv = () =>
    exportRows(
      "executive-approvals",
      ["Type", "Title", "Reference", "Department", "Branch", "Amount", "Status", "Decided", "Signed by", "Comment"],
      filtered.map((r) => [
        r.item_type, r.title, r.reference ?? "", r.department_slug ?? "", branchLabel(r.branch),
        r.amount ?? "", titleCase(r.status), fmtDate(r.decided_at), r.signature_name ?? "", r.decision_comment ?? "",
      ]),
    );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Awaiting sign-off" value={String(rows.filter((r) => r.status === "pending").length)} />
        <Stat label="Approved" value={String(rows.filter((r) => r.status === "approved").length)} />
        <Stat label="Rejected" value={String(rows.filter((r) => r.status === "rejected").length)} />
        <Stat label="Total items" value={String(rows.length)} />
      </div>

      <Card className="p-6 print:hidden">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Submit an item for executive approval</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <Label>Item type</Label>
            <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{APPROVAL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Reference</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. POL-2026-004" />
          </div>
          <div>
            <Label>Department</Label>
            <Select value={form.department_slug} onValueChange={(v) => setForm({ ...form, department_slug: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.slug} value={d.slug}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Branch</Label>
            <Select value={form.branch} onValueChange={(v) => setForm({ ...form, branch: v })}>
              <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
              <SelectContent>{BRANCHES.map((b) => <SelectItem key={b} value={b}>{branchLabel(b)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Amount (if financial)</Label>
            <Input type="number" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Supporting document</Label>
            <Input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
            {form.document_url && <p className="mt-1 text-xs text-emerald-700">Attached ✓</p>}
          </div>
          <div className="md:col-span-3">
            <Label>Motivation</Label>
            <Textarea rows={2} value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} />
          </div>
          <div><Button type="submit">Submit for approval</Button></div>
        </form>
      </Card>

      {canManage && (
        <Card className="p-6 print:hidden">
          <Label>Digital signature — type your full name to sign approvals</Label>
          <Input className="mt-2 max-w-md" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="e.g. Richard Mashaba" />
          <p className="mt-1 text-xs text-muted-foreground">
            Your name, the decision and a timestamp are stored against each item as a digital signature and written to the audit trail.
          </p>
        </Card>
      )}

      <Card className="flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div className="w-48">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / PDF</Button>
      </Card>

      <div className="space-y-3">
        {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Loading approvals…</Card>}
        {!loading && filtered.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nothing here right now.</Card>}
        {filtered.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[260px] flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.item_type}{r.reference && <> · {r.reference}</>}
                </p>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.department_slug ?? "church-wide"} · {branchLabel(r.branch)} · submitted {fmtDate(r.created_at)}
                  {r.amount != null && <> · {money(r.amount)}</>}
                </p>
                {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm">{r.detail}</p>}
                {r.document_url && (
                  <a href={r.document_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline">📎 Supporting document</a>
                )}
                {r.signature_name && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Signed by {r.signature_name} on {fmtDate(r.decided_at)}
                    {r.decision_comment && <> — “{r.decision_comment}”</>}
                  </p>
                )}
                {(signatures[r.id] ?? []).length > 1 && (
                  <p className="text-xs text-muted-foreground">{signatures[r.id].length} signatures on file</p>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full border px-3 py-1 text-[0.7rem] uppercase tracking-widest ${STATUS_CLASS[r.status] ?? ""}`}>
                  {titleCase(r.status)}
                </span>
                {canManage && r.status === "pending" && (
                  <div className="flex flex-col items-end gap-2 print:hidden">
                    <Input
                      className="h-9 w-56"
                      placeholder="Comment (optional)"
                      value={comment[r.id] ?? ""}
                      onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(r, "approved")}>Sign & approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r, "rejected")}>Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </Card>
  );
}
