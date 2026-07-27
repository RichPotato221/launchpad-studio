import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Image, Paperclip, Search, Upload, Trash2, Download, File } from "lucide-react";
import { fetchDepartments } from "@/lib/portal";
import { MemberAvatarLink } from "@/components/MemberAvatarLink";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — TRoGKC Portal" }] }),
  component: DocumentsPage,
});

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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUserId(data.user?.id ?? "");
      if (data.user?.id) {
        const { data: rows } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
        setRoles((rows ?? []).map((r: any) => r.role));
      }
    });
  }, []);

  const isAdmin = roles.some((r) => ["senior_apostle", "chairperson", "lead_pastor", "associate_pastor", "secretary"].includes(r));

  const filtered = useMemo(() => {
    return (docs.data ?? []).filter((d) => {
      const matchesSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (d.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        d.file_name.toLowerCase().includes(search.toLowerCase());
      const matchesDept = deptFilter === "all" || d.department_slug === deptFilter;
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "image" && d.file_type?.startsWith("image/")) ||
        (typeFilter === "document" && (d.file_type?.includes("pdf") || d.file_type?.includes("word") || d.file_type?.includes("sheet"))) ||
        (typeFilter === "other" && !d.file_type?.startsWith("image/") && !d.file_type?.includes("pdf") && !d.file_type?.includes("word"));
      return matchesSearch && matchesDept && matchesType;
    });
  }, [docs.data, search, deptFilter, typeFilter]);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Central cloud vault</p>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">Documents & Files</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            One shared place for manuals, photos, minutes, reports, and any other files the church needs to keep together.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="h-4 w-4" /> Upload file
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Upload a document or photo</DialogTitle>
            </DialogHeader>
            <UploadForm
              departments={depts.data ?? []}
              onDone={() => {
                setDialogOpen(false);
                docs.refetch();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, file name, tag, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            <SelectItem value="">General / no department</SelectItem>
            {(depts.data ?? []).map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="truncate font-serif text-lg leading-tight">{doc.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{doc.file_name}</p>
                </div>
              </div>
              {doc.description && (
                <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{doc.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-1">
                {(doc.tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {doc.uploader ? (
                    <MemberAvatarLink userId={doc.uploader.id} name={doc.uploader.full_name} avatarUrl={doc.uploader.avatar_url} size="sm" />
                  ) : (
                    <span>Unknown member</span>
                  )}
                  <span>· {formatBytes(doc.file_size)}</span>
                </div>
                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1 gap-1">
                  <a href={doc.file_url} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Open / Download
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
          <p className="text-sm text-muted-foreground">No documents found.</p>
          <p className="mt-1 text-xs text-muted-foreground">Upload the first file to start the shared vault.</p>
        </Card>
      )}
    </div>
  );
}

function UploadForm({
  departments,
  onDone,
}: {
  departments: { slug: string; name: string }[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [departmentSlug, setDepartmentSlug] = useState<string>("");
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please choose a file.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please give the document a title.");
      return;
    }
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("You must be signed in to upload.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "";
    const safeName = `${Date.now()}_${file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "")}`;
    const path = `${userData.user.id}/${safeName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage.from("central-documents").upload(path, file);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("central-documents").getPublicUrl(path);
    const fileUrl = urlData?.publicUrl ?? "";

    const { error: insertError } = await supabase.from("documents").insert({
      title: title.trim(),
      description: description.trim() || null,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      storage_path: uploadData.path,
      uploaded_by: userData.user.id,
      department_slug: departmentSlug || null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    if (insertError) {
      toast.error("Could not save document record: " + insertError.message);
      setUploading(false);
      return;
    }

    toast.success("File uploaded successfully.");
    setTitle("");
    setDescription("");
    setDepartmentSlug("");
    setTags("");
    setFile(null);
    setUploading(false);
    onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="doc-title">Title</Label>
        <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finance Manual 2026" />
      </div>
      <div>
        <Label htmlFor="doc-desc">Description (optional)</Label>
        <Textarea id="doc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this file for?" />
      </div>
      <div>
        <Label htmlFor="doc-dept">Department (optional)</Label>
        <Select value={departmentSlug} onValueChange={setDepartmentSlug}>
          <SelectTrigger id="doc-dept">
            <SelectValue placeholder="General church document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">General church document</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="doc-tags">Tags (comma separated)</Label>
        <Input id="doc-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="manual, finance, 2026" />
      </div>
      <div>
        <Label htmlFor="doc-file">File</Label>
        <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {file && <p className="mt-1 text-xs text-muted-foreground">Selected: {file.name} ({formatBytes(file.size)})</p>}
      </div>
      <Button type="submit" disabled={uploading || !file || !title.trim()} className="w-full gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload to cloud vault"}
      </Button>
    </form>
  );
}
