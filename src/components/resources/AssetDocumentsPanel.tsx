import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fmtDate } from "@/lib/finance";

const sb = supabase as any;
const BUCKET = "asset-documents";

export const ASSET_DOC_TYPES = [
  { key: "receipt", label: "Purchase receipt" },
  { key: "invoice", label: "Invoice" },
  { key: "warranty", label: "Warranty certificate" },
  { key: "manual", label: "User manual" },
  { key: "insurance", label: "Insurance document" },
  { key: "service", label: "Service / repair report" },
  { key: "photo", label: "Photo" },
  { key: "other", label: "Other" },
] as const;

const docLabel = (k?: string | null) => ASSET_DOC_TYPES.find((t) => t.key === k)?.label ?? "Document";

function prettySize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Receipts, invoices, warranties, manuals and photos attached to one asset. */
export default function AssetDocumentsPanel({
  assetId,
  canManage,
  currentUserId,
}: {
  assetId: string;
  canManage: boolean;
  currentUserId: string;
}) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState("receipt");
  const [title, setTitle] = useState("");
  const [docDate, setDocDate] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await sb
      .from("asset_documents")
      .select("*")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file to attach.");
    setBusy(true);
    try {
      const path = `${assetId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await sb.from("asset_documents").insert({
        asset_id: assetId,
        doc_type: docType,
        title: title || file.name,
        file_url: signed.data?.signedUrl ?? "",
        storage_path: path,
        file_size: file.size,
        mime_type: file.type || null,
        doc_date: docDate || null,
        uploaded_by: currentUserId || null,
      });
      if (error) throw error;
      toast.success("Document attached");
      setTitle(""); setDocDate(""); setFile(null); setDocType("receipt");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const openDoc = async (d: any) => {
    if (d.storage_path) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(d.storage_path, 60 * 10);
      if (data?.signedUrl) return window.open(data.signedUrl, "_blank", "noreferrer");
    }
    if (d.file_url) window.open(d.file_url, "_blank", "noreferrer");
    else toast.error("This document has no file attached.");
  };

  const remove = async (d: any) => {
    if (!window.confirm(`Remove "${d.title}"?`)) return;
    if (d.storage_path) await supabase.storage.from(BUCKET).remove([d.storage_path]);
    const { error } = await sb.from("asset_documents").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    toast.success("Document removed");
    load();
  };

  return (
    <Card className="mt-4 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Documents — receipts, invoices, warranties &amp; manuals
      </p>

      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No documents attached to this asset yet.</p>
      ) : (
        <ul className="mt-3 divide-y text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <button className="text-left font-medium hover:underline" onClick={() => openDoc(d)}>
                  {d.title}
                </button>
                <p className="text-xs text-muted-foreground">
                  {docLabel(d.doc_type)}
                  {d.doc_date ? ` · ${fmtDate(d.doc_date)}` : ""}
                  {d.file_size ? ` · ${prettySize(d.file_size)}` : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openDoc(d)}>Open</Button>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => remove(d)}>Remove</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={upload} className="mt-4 grid gap-3 border-t pt-4 md:grid-cols-5">
          <div>
            <Label>Document type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_DOC_TYPES.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Makro receipt" />
          </div>
          <div>
            <Label>Document date</Label>
            <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} />
          </div>
          <div>
            <Label>File (PDF, image)</Label>
            <Input
              type="file"
              accept=".pdf,image/*,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Uploading…" : "Attach"}</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
