import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthUserResult } from "@/lib/authUser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function DepartmentResources({ slug }: { slug: string }) {


  const access = useQuery({
    queryKey: ["is-chairperson"],
    queryFn: async () => {
      const { data: userRes } = await getAuthUserResult();
      const uid = userRes.user?.id;
      if (!uid) return { isChair: false, userId: null as string | null };
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      // Chairpersons and Senior Pastors both have church-wide oversight.
      return {
        isChair: (roles ?? []).some((r: any) => r.role === "chairperson" || r.role === "senior_apostle"),
        userId: uid,
      };
    },
  });

  const docs = useQuery({
    queryKey: ["dept-resources", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("department_resources")
        .select("*")
        .eq("department_slug", slug)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a file first.");
    setBusy(true);
    try {
      const path = `${slug}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const up = await supabase.storage.from("department-resources").upload(path, file);
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("department-resources")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await supabase.from("department_resources").insert({
        department_slug: slug,
        title: title || file.name,
        file_url: signed.data?.signedUrl ?? "",
        storage_path: path,
        uploaded_by: access.data?.userId ?? null,
      });
      if (error) throw error;
      toast.success("Document uploaded");
      setTitle("");
      setFile(null);
      docs.refetch();
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: any) => {
    if (!window.confirm(`Delete "${d.title}"? This cannot be undone.`)) return;
    if (d.storage_path) await supabase.storage.from("department-resources").remove([d.storage_path]);
    const { error } = await supabase.from("department_resources").delete().eq("id", d.id);
    if (error) return toast.error(error.message);
    docs.refetch();
  };

  return (
    <div className="space-y-6">



      <Card className="p-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Department documents</p>
        {docs.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
        ) : (docs.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No documents published for this department yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {(docs.data ?? []).map((d: any) => (
              <li key={d.id} className="rounded border border-border p-4">
                <a href={d.file_url} target="_blank" rel="noreferrer" className="font-serif text-lg hover:underline">
                  {d.title}
                </a>
                <p className="mt-1 text-xs text-muted-foreground">
                  Added {new Date(d.created_at).toLocaleDateString()}
                </p>
                {access.data?.isChair && (
                  <Button variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs" onClick={() => remove(d)}>
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {access.data?.isChair ? (
          <form onSubmit={upload} className="mt-6 grid gap-3 border-t border-border pt-6 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label htmlFor="doc-title">Title</Label>
              <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" />
            </div>
            <div>
              <Label htmlFor="doc-file">File</Label>
              <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload"}</Button>
          </form>
        ) : (
          <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
            Only Chairpersons can upload documents to a department.
          </p>
        )}
      </Card>
    </div>
  );
}
