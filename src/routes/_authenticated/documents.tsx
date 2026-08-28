import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { notifyDocumentActivity } from "@/lib/activity.functions";
import { FileText, Image, Paperclip, Search, Upload, Trash2, Download, File } from "lucide-react";
import { fetchDepartments } from "@/lib/portal";
import { MemberAvatarLink } from "@/components/MemberAvatarlink";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Document Control — TRoGKC Portal" },
      { name: "description", content: "Controlled register of SOPs, policies and standards with tracking numbers and version control." },
      { property: "og:title", content: "Document Control — TRoGKC Portal" },
      { property: "og:description", content: "Controlled register of SOPs, policies and standards with tracking numbers and version control." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const NONE = "__none__";

const CATEGORIES = [
  { value: "sop", label: "SOP — Standard Operating Procedure", code: "SOP" },
  { value: "policy", label: "Policy", code: "POL" },
  { value: "standard", label: "Standard", code: "STD" },
  { value: "manual", label: "Manual", code: "MAN" },
  { value: "form", label: "Form / Template", code: "FRM" },
  { value: "minutes", label: "Minutes / Records", code: "REC" },
  { value: "report", label: "Report", code: "RPT" },
  { value: "other", label: "Other", code: "DOC" },
] as const;

const STATUSES = ["draft", "under_review", "active", "superseded", "obsolete"] as const;

const statusLabel = (s: string) => s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

type DocumentRow = {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string;
  department_slug: string | null;
  tags: string[] | null;
  doc_number: string | null;
  version: string | null;
  doc_category: string | null;
  status: string | null;
  effective_date: string | null;
  review_date: string | null;
  created_at: string;
  updated_at: string;
  uploader?: { id: string; full_name: string | null; avatar_url: string | null };
};

const fileTypeIcon = (type: string | null) => {
  if (!type) return File;
  if (type.startsWith("image/")) return Image;
  if (type.includes("pdf")) return FileText;
  return Paperclip;
};

const formatBytes = (bytes: number | null) => {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

async function fetchDocuments(): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, uploader:profiles!documents_uploaded_by_fkey(id, full_name, avatar_url)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DocumentRow[];
}

function DocumentsPage() {
  const docs = useQuery({ queryKey: ["documents"], queryFn: fetchDocuments });
  const depts = useQuery({ queryKey: ["departments"], queryFn: fetchDepartments });
  const [userId, setUserId] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    getAuthUserResult().then(async ({ data }) => {
      setUserId(data.user?.id ?? "");
      if (data.user?.id) {
        const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        setRoles((rows ?? []).map((r: any) => r.role));
      }
    });
  }, []);

  const isAdmin = roles.some((r) =>
    ["senior_apostle", "chairperson", "lead_pastor", "associate_pastor", "secretary"].includes(r),
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (docs.data ?? []).filter((d) => {
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        (d.doc_number ?? "").toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q) ||
        (d.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
        d.file_name.toLowerCase().includes(q);
      const matchesDept =
        deptFilter === "all" || (deptFilter === NONE ? !d.department_slug : d.department_slug === deptFilter);
      const matchesCat = catFilter === "all" || d.doc_category === catFilter;
      const matchesStatus = statusFilter === "all" || (d.status ?? "active") === statusFilter;
      return matchesSearch && matchesDept && matchesCat && matchesStatus;
    });
  }, [docs.data, search, deptFilter, catFilter, statusFilter]);

  const handleDelete = async (doc: DocumentRow) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    const { error: storageError } = await supabase.storage.from("central-documents").remove([doc.storage_path]);
    if (storageError) {
      toast.error("Could not remove file from storage.");
      return;
    }
    const { error: dbError } = await supabase.from("documents").delete().eq("id", doc.id);
    if (dbError) {
      toast.error("Could not delete document record.");
      return;
    }
    toast.success("Document deleted.");
    docs.refetch();
  };

  const download = async (doc: DocumentRow) => {
    try {
      const { data, error } = await supabase.storage.from("central-documents").download(doc.storage_path);
      if (error || !data) throw error ?? new Error("No file");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(doc.file_url, "_blank", "noreferrer");
    }
  };

  const deptName = (slug: string | null) =>
    (depts.data ?? []).find((d) => d.slug === slug)?.name ?? (slug ? slug : "General / church-wide");

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-10 md:px-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Document control register</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">SOPs, Policies & Standards</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Every controlled document carries a tracking number, an owning department, a version number and a status —
            ISO-style. Upload once, download anytime.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Register document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register a controlled document</DialogTitle>
            </DialogHeader>
            <UploadForm
              departments={depts.data ?? []}
              existing={docs.data ?? []}
              onDone={() => {
                setDialogOpen(false);
                docs.refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by tracking number, title, tag or file name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Owning department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            <SelectItem value={NONE}>General / church-wide</SelectItem>
            {(depts.data ?? []).map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((doc) => {
          const Icon = fileTypeIcon(doc.file_type);
          const canDelete = doc.uploaded_by === userId || isAdmin;
          return (
            <Card key={doc.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    {doc.doc_number ?? "Unnumbered"} · Rev {doc.version ?? "1.0"}
                  </p>
                  <p className="truncate font-serif text-lg leading-tight">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-wider">
                <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
                  {statusLabel(doc.status ?? "active")}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{deptName(doc.department_slug)}</span>
              </div>

              {doc.description && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{doc.description}</p>}

              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <dt className="uppercase tracking-wider">Effective</dt>
                  <dd>{doc.effective_date ? new Date(doc.effective_date).toLocaleDateString() : "—"}</dd>
                </div>
                <div>
                  <dt className="uppercase tracking-wider">Next review</dt>
                  <dd>{doc.review_date ? new Date(doc.review_date).toLocaleDateString() : "—"}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap gap-1">
                {(doc.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {doc.uploader ? (
                    <MemberAvatarLink
                      userId={doc.uploader.id}
                      fullName={doc.uploader.full_name || "Member"}
                      avatarUrl={doc.uploader.avatar_url}
                      size="sm"
                    />
                  ) : (
                    <span>Unknown member</span>
                  )}
                  <span>· {formatBytes(doc.file_size)}</span>
                </div>
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => download(doc)}>
                  <Download className="h-4 w-4" /> Download
                </Button>
                <Button asChild variant="outline" size="sm" className="px-2">
                  <a href={doc.file_url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
                {canDelete && (
                  <Button variant="outline" size="sm" className="px-2 text-destructive" onClick={() => handleDelete(doc)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No controlled documents match this view.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Click “Register document” to add your first SOP, policy or standard.
          </p>
        </Card>
      )}
    </div>
  );
}

function UploadForm({
  departments,
  existing,
  onDone,
}: {
  departments: { slug: string; name: string }[];
  existing: DocumentRow[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentSlug, setDepartmentSlug] = useState<string>(NONE);
  const [category, setCategory] = useState<string>("sop");
  const [docNumber, setDocNumber] = useState("");
  const [version, setVersion] = useState("1.0");
  const [status, setStatus] = useState<string>("active");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const suggestNumber = () => {
    const code = CATEGORIES.find((c) => c.value === category)?.code ?? "DOC";
    const deptCode =
      departmentSlug === NONE
        ? "GEN"
        : departmentSlug.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "GEN";
    const prefix = `TRoGKC-${deptCode}-${code}-`;
    const used = existing
      .map((d) => d.doc_number ?? "")
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.slice(prefix.length), 10))
      .filter((n) => !Number.isNaN(n));
    const next = (used.length ? Math.max(...used) : 0) + 1;
    setDocNumber(`${prefix}${String(next).padStart(3, "0")}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Please choose a file.");
    if (!title.trim()) return toast.error("Please give the document a title.");
    if (!docNumber.trim()) return toast.error("Please set a tracking number (or click Auto-generate).");

    setUploading(true);
    const { data: userData } = await getAuthUserResult();
    if (!userData.user) {
      toast.error("You must be signed in to upload.");
      setUploading(false);
      return;
    }

    const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "")}`;
    const path = `${userData.user.id}/${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("central-documents")
      .upload(path, file);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("central-documents").getPublicUrl(path);

    const { data: insertedDoc, error: insertError } = await supabase.from("documents").insert({
      title: title.trim(),
      description: description.trim() || null,
      file_url: urlData?.publicUrl ?? "",
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      storage_path: uploadData.path,
      uploaded_by: userData.user.id,
      department_slug: departmentSlug === NONE ? null : departmentSlug,
      doc_number: docNumber.trim(),
      version: version.trim() || "1.0",
      doc_category: category,
      status,
      effective_date: effectiveDate || null,
      review_date: reviewDate || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    } as any).select("id").maybeSingle();

    if (insertError) {
      toast.error(
        insertError.message.includes("documents_doc_number_version_idx")
          ? "That tracking number already exists at this version — bump the version or use another number."
          : "Could not save document record: " + insertError.message,
      );
      setUploading(false);
      return;
    }

    if (insertedDoc?.id) {
      try {
        await notifyDocumentActivity({ data: { documentId: insertedDoc.id, action: "uploaded" } });
      } catch (err) {
        console.error("document notification failed", err);
      }
    }

    toast.success("Document registered.");
    setUploading(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="doc-title">Document title</Label>
        <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cash Handling SOP" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="doc-cat">Document type</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="doc-cat">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-dept">Owning department</Label>
          <Select value={departmentSlug} onValueChange={setDepartmentSlug}>
            <SelectTrigger id="doc-dept">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>General / church-wide</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.slug} value={d.slug}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Label htmlFor="doc-number">Tracking number</Label>
          <div className="flex gap-2">
            <Input
              id="doc-number"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="TRoGKC-FIN-SOP-001"
            />
            <Button type="button" variant="outline" onClick={suggestNumber}>
              Auto
            </Button>
          </div>
        </div>
        <div>
          <Label htmlFor="doc-version">Version</Label>
          <Input id="doc-version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="doc-status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="doc-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="doc-eff">Effective date</Label>
          <Input id="doc-eff" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="doc-rev">Next review</Label>
          <Input id="doc-rev" type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
        </div>
      </div>

      <div>
        <Label htmlFor="doc-desc">Purpose / scope (optional)</Label>
        <Textarea
          id="doc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="What does this document govern?"
        />
      </div>

      <div>
        <Label htmlFor="doc-tags">Tags (comma separated)</Label>
        <Input id="doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="finance, cash, controls" />
      </div>

      <div>
        <Label htmlFor="doc-file">File</Label>
        <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && (
          <p className="mt-1 text-xs text-muted-foreground">
            Selected: {file.name} ({formatBytes(file.size)})
          </p>
        )}
      </div>

      <Button type="submit" disabled={uploading || !file || !title.trim()} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Register & upload"}
      </Button>
    </form>
  );
}
