import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My Profile — TRoGKC Portal" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", avatar_url: "" });
  const [deptName, setDeptName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return;
    setUserId(uid);
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, email, avatar_url, primary_department")
      .eq("id", uid)
      .maybeSingle();
    if (data) {
      setForm({
        full_name: data.full_name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        avatar_url: data.avatar_url ?? "",
      });
      if (data.primary_department) {
        const { data: d } = await supabase.from("departments").select("name").eq("slug", data.primary_department).maybeSingle();
        setDeptName(d?.name ?? data.primary_department);
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", userId);
    setUploading(false);
    if (error) return toast.error(error.message);
    setForm((f) => ({ ...f, avatar_url: pub.publicUrl }));
    toast.success("Profile picture updated");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: form.full_name, phone: form.phone })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-8">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account</p>
      <h1 className="mt-2 font-serif text-3xl md:text-4xl">My Profile</h1>

      <Card className="mt-6 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-xl font-medium">
            {form.avatar_url ? (
              <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (form.full_name || "?").slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <Label htmlFor="avatar-upload" className="cursor-pointer text-sm text-primary underline">
              {uploading ? "Uploading…" : "Change photo"}
            </Label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div>
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label>Phone number</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} disabled />
          </div>
          <div>
            <Label>Department</Label>
            <Input value={deptName || "—"} disabled />
          </div>
          <Button onClick={save} disabled={saving} className="w-fit">
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
