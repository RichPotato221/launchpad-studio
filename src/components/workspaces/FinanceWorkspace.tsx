import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { WorkspaceProps } from "@/lib/workspaceRegistry";

const CLAIM_TYPES = [
  "Travel & transport",
  "Ministry supplies",
  "Hospitality",
  "Equipment & tech",
  "Printing & stationery",
  "Rent & venue",
  "Utilities",
  "Honorarium / stipend",
  "Missions & outreach",
  "Benevolence",
  "Repairs & maintenance",
  "Other",
] as const;

type EntryKind =
  | "journal"
  | "sunday_contribution"
  | "tithe"
  | "offering"
  | "first_fruits"
  | "seed"
  | "pledge"
  | "procurement"
  | "other";

const ENTRY_TABS: { key: EntryKind; label: string; needsMember?: boolean }[] = [
  { key: "journal", label: "Journal" },
  { key: "sunday_contribution", label: "Sunday Contributions" },
  { key: "tithe", label: "Tithes", needsMember: true },
  { key: "offering", label: "Offerings" },
  { key: "first_fruits", label: "First Fruits", needsMember: true },
  { key: "seed", label: "Seed" },
  { key: "pledge", label: "Pledges", needsMember: true },
  { key: "procurement", label: "Procurements" },
  { key: "other", label: "Other" },
];

export default function FinanceWorkspace({ departmentSlug, currentUserId }: WorkspaceProps) {
  return (
    <div className="space-y-8">
      <Tabs defaultValue="claims" className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="claims">Expense Claims</TabsTrigger>
          {ENTRY_TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="claims" className="mt-6">
          <ExpenseClaims departmentSlug={departmentSlug} currentUserId={currentUserId} />
        </TabsContent>

        {ENTRY_TABS.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <EntryPanel
              departmentSlug={departmentSlug}
              currentUserId={currentUserId}
              kind={t.key}
              label={t.label}
              needsMember={t.needsMember}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function useCanDeleteFinance() {
  const [can, setCan] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!uid) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      setCan((roles ?? []).some((r: any) => ["chairperson", "senior_apostle", "lead_pastor"].includes(r.role)));
    });
  }, []);
  return can;
}

/* -------------------- Expense Claims -------------------- */
function ExpenseClaims({ departmentSlug, currentUserId }: WorkspaceProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ amount: "", description: "", claim_type: "", file_url: "" });
  const [uploading, setUploading] = useState(false);
  const canDelete = useCanDeleteFinance();

  const load = async () => {
    const { data } = await supabase.from("expense_claims").select("*").eq("department_slug", departmentSlug).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [departmentSlug]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this claim permanently?")) return;
    const { error } = await supabase.from("expense_claims").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Claim deleted");
    load();
  };

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${departmentSlug}/claims/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage.from("department-reports").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("department-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, file_url: signed.data.signedUrl }));
      toast.success("Slip attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description || !form.claim_type) return toast.error("Amount, claim type, and description are required.");
    const { error } = await supabase.from("expense_claims").insert({
      department_slug: departmentSlug,
      claimant_id: currentUserId,
      amount: Number(form.amount),
      description: form.description,
      claim_type: form.claim_type,
      receipt_url: form.file_url || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Claim submitted");
    setForm({ amount: "", description: "", claim_type: "", file_url: "" });
    load();
  };

  const advance = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "chair_approved") patch.approved_by_chair = currentUserId;
    if (status === "senior_pastor_approved") patch.approved_by_senior = currentUserId;
    const { error } = await supabase.from("expense_claims").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Submit an expense claim</p>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Amount</Label>
            <Input type="number" step="any" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div>
            <Label>Transaction type</Label>
            <Select value={form.claim_type} onValueChange={(v) => setForm({ ...form, claim_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select transaction type" /></SelectTrigger>
              <SelectContent>
                {CLAIM_TYPES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={2} required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Attach slip / receipt (PDF, image, Word)</Label>
            <Input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
            {form.file_url && <p className="mt-1 text-xs text-emerald-700">Attached ✓</p>}
          </div>
          <div><Button type="submit">Submit claim</Button></div>
        </form>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-serif text-lg">R {Number(r.amount).toFixed(2)} <span className="ml-2 text-xs uppercase tracking-widest text-muted-foreground">{r.claim_type ?? "—"}</span></p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{r.status.replace(/_/g, " ")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status === "pending" && <Button size="sm" onClick={() => advance(r.id, "chair_approved")}>Chair approve</Button>}
                {r.status === "chair_approved" && <Button size="sm" onClick={() => advance(r.id, "senior_pastor_approved")}>Senior Pastor approve</Button>}
                {r.status === "senior_pastor_approved" && <Button size="sm" onClick={() => advance(r.id, "paid")}>Mark paid</Button>}
                {!["rejected", "paid"].includes(r.status) && <Button size="sm" variant="outline" onClick={() => advance(r.id, "rejected")}>Reject</Button>}
                {r.receipt_url && <a className="text-xs underline self-center" href={r.receipt_url} target="_blank" rel="noreferrer">Slip</a>}
                {(canDelete || r.claimant_id === currentUserId) && (
                  <Button size="sm" variant="destructive" onClick={() => remove(r.id)}>Delete</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No claims yet.</Card>}
      </div>
    </div>
  );
}

/* -------------------- Generic entry panel (journals & transactions) -------------------- */
function EntryPanel({
  departmentSlug,
  currentUserId,
  kind,
  label,
  needsMember,
}: WorkspaceProps & { kind: EntryKind; label: string; needsMember?: boolean }) {
  const [rows, setRows] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const canDelete = useCanDeleteFinance();
  const [form, setForm] = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    title: "",
    amount: "",
    notes: "",
    member_id: "",
    file_url: "",
    file_name: "",
  });
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("finance_entries")
      .select("*, member:profiles!finance_entries_member_id_fkey(id, full_name, email)")
      .eq("department_slug", departmentSlug)
      .eq("kind", kind)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  };

  useEffect(() => {
    load();
    if (needsMember) {
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("approval_status", "approved")
        .order("full_name")
        .then(({ data }) => setMembers(data ?? []));
    }
  }, [departmentSlug, kind, needsMember]);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = `${departmentSlug}/${kind}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const up = await supabase.storage.from("department-reports").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("department-reports").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed.error) throw signed.error;
      setForm((f) => ({ ...f, file_url: signed.data.signedUrl, file_name: file.name }));
      toast.success("File attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required.");
    const { error } = await supabase.from("finance_entries").insert({
      department_slug: departmentSlug,
      kind,
      entry_date: form.entry_date,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      amount: form.amount ? Number(form.amount) : null,
      member_id: form.member_id || null,
      file_url: form.file_url || null,
      file_name: form.file_name || null,
      created_by: currentUserId,
    });
    if (error) return toast.error(error.message);
    toast.success(`${label} entry saved`);
    setForm({
      entry_date: new Date().toISOString().slice(0, 10),
      title: "",
      amount: "",
      notes: "",
      member_id: "",
      file_url: "",
      file_name: "",
    });
    load();
  };

  const total = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [rows],
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Add {label.toLowerCase()} entry</p>
          <p className="text-xs text-muted-foreground">Total captured: <strong className="text-foreground">R {total.toFixed(2)}</strong></p>
        </div>
        <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Date</Label>
            <Input type="date" required value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
          </div>
          <div>
            <Label>Title</Label>
            <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={kind === "journal" ? "e.g. Weekly finance journal" : "e.g. Main service"} />
          </div>
          {kind !== "journal" && (
            <div>
              <Label>Amount (R)</Label>
              <Input type="number" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          )}
          {needsMember && (
            <div>
              <Label>Member</Label>
              <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional — link to member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name ?? m.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Attach a file (PDF, slip, Word, image)</Label>
            <Input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
            {form.file_url && <p className="mt-1 text-xs text-emerald-700">Attached: {form.file_name} ✓</p>}
          </div>
          <div><Button type="submit">Save entry</Button></div>
        </form>
      </Card>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="font-serif text-lg">{r.title}</p>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {r.entry_date}
                  {r.amount != null && <> · R {Number(r.amount).toFixed(2)}</>}
                  {r.member && <> · {r.member.full_name ?? r.member.email}</>}
                </p>
                {r.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{r.notes}</p>}
              </div>
              {r.file_url && (
                <a href={r.file_url} target="_blank" rel="noreferrer" className="text-sm underline">
                  📎 {r.file_name ?? "Attachment"}
                </a>
              )}
            </div>
          </Card>
        ))}
        {rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">No {label.toLowerCase()} entries yet.</Card>}
      </div>
    </div>
  );
}
